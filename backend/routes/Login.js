const express = require('express');
const { hash } = require('bcryptjs');
const mongoose = require('mongoose');
const { wrap, fail } = require('../security/boundary.cjs');
const { cookieName, cookieOptions, readSessionCookie } = require('../security/sessions.cjs');

module.exports = function loginRoutes(auth, development = false, getDb = () => mongoose.connection.db) {
  const router = express.Router();
  const cookie = cookieName(development);
  router.post('/login', wrap(async (req, res) => {
    // Validate before issuing expensive work or database query; roles/unknown keys rejected.
    const body = req.body;
    if (!body || Object.keys(body).some(key => !['username', 'password'].includes(key))
      || typeof body.username !== 'string' || !body.username.length || body.username.length > 100
      || typeof body.password !== 'string' || !body.password.length || Buffer.byteLength(body.password) > 72) throw fail(400, 'INVALID_REQUEST');
    await auth.limitLogin(body.username, req.ip);
    const login = await auth.login(body);
    // Re-login rotates the current browser session after credentials succeed.
    const prior = readSessionCookie(req.headers, development);
    if (prior) await auth.logout(prior);
    res.cookie(cookie, login.token, cookieOptions(development));
    res.json({ ...login.user, _id: login.user.id, expiresAt: login.expiresAt });
  }));
  router.get('/me', (req, res) => res.json({ ...req.identity, _id: req.identity.id }));
  router.post('/logout', wrap(async (req, res) => {
    await auth.logout(readSessionCookie(req.headers, development));
    const { maxAge, ...options } = cookieOptions(development);
    res.clearCookie(cookie, options).status(204).end();
  }));
  router.post('/logout-all', wrap(async (req, res) => {
    await auth.revokeUser(new mongoose.Types.ObjectId(req.identity.id));
    const { maxAge, ...options } = cookieOptions(development);
    res.clearCookie(cookie, options).status(204).end();
  }));
  // The existing URL is retained for the admin Add User workflow. No public staff signup.
  router.post('/signup', wrap(async (req, res) => {
    const { username, password, name, role, cities } = req.body ?? {};
    if (Object.keys(req.body ?? {}).some(key => !['username', 'password', 'name', 'role', 'cities'].includes(key))
      || typeof username !== 'string' || !/^[A-Za-z0-9_.@-]{1,100}$/.test(username)
      || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72
      || typeof name !== 'string' || name.length < 1 || name.length > 100
      || !['admin', 'user'].includes(role) || !Array.isArray(cities) || cities.length > 100
      || cities.some(city => typeof city !== 'string' || !city.length || city.length > 100)) throw fail(400, 'INVALID_REQUEST');
    try { await getDb().collection('users').insertOne({ username, password: await hash(password, 12), name, role, cities }); }
    catch (error) { if (error.code !== 11000) throw error; } // Identical response for duplicate account names.
    res.status(202).json({ message: 'User provisioning request processed' });
  }));
  router.get('/users', wrap(async (req, res) => {
    const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || Object.keys(req.query).some(key => !['limit', 'before'].includes(key))
      || (req.query.before !== undefined && !/^[a-f0-9]{24}$/i.test(req.query.before))) throw fail(400, 'INVALID_REQUEST');
    const filter = req.query.before ? { _id: { $lt: new mongoose.Types.ObjectId(req.query.before) } } : {};
    const docs = await getDb().collection('users').find(filter, { projection: { username: 1, name: 1, role: 1, cities: 1 }, maxTimeMS: 3000 })
      .sort({ _id: -1 }).limit(limit).toArray();
    res.json(docs.map(doc => ({ _id: doc._id, username: doc.username, name: doc.name, role: doc.role, cities: doc.cities ?? [] })));
  }));
  router.delete('/users/:id', wrap(async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) throw fail(400, 'INVALID_REQUEST');
    if (req.params.id.toLowerCase() === req.identity.id) throw fail(403, 'FORBIDDEN');
    const userId = new mongoose.Types.ObjectId(req.params.id);
    await getDb().collection('users').deleteOne({ _id: userId });
    await auth.revokeUser(userId);
    res.json({ message: 'User deletion processed' });
  }));
  return router;
};
