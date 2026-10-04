const express = require('express');
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
    const domain = require('../commerce/dist/service.cjs');
    domain.staffProvisioningInput(req.body);
    res.status(202).json(await domain.provisionStaff(await getDb(), req.body, req.identity.id));
  }));
  router.get('/users', wrap(async (req, res) => {
    res.json(await require('../commerce/dist/service.cjs').retainedStaffList(await getDb(), req.query, req.identity.id));
  }));
  // Preserve the URL while retaining the account identifier/history and revoking sessions.
  router.delete('/users/:id', wrap(async (req, res) => {
    if (Object.keys(req.query).length || Object.keys(req.body ?? {}).length) throw fail(400, 'INVALID_REQUEST');
    res.json(await require('../commerce/dist/service.cjs').deactivateStaff(await getDb(), req.params.id, req.identity.id));
  }));
  return router;
};
