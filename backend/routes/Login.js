const express = require('express');
const { wrap, fail } = require('../security/boundary.cjs');
const { cookieName, cookieOptions, readSessionCookie } = require('../security/sessions.cjs');

module.exports = function loginRoutes(auth, development = false, getDb = async () => { throw fail(503, 'SERVICE_UNAVAILABLE'); }) {
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
    await auth.revokeUser(new (require('mongodb').ObjectId)(req.identity.id));
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
  router.get('/branch-login-availability',wrap(async(req,res)=>{res.json(await require('../commerce/dist/service.cjs').branchLoginAvailability(await getDb(),req.query,req.identity.id));}));
  router.post('/delivery-place-search',wrap(async(req,res)=>{if(Object.keys(req.query).length)throw fail(400,'INVALID_REQUEST');res.json(await require('../commerce/dist/service.cjs').searchDeliveryPlaces(await getDb(),req.body,req.identity.id));}));
  router.get('/branches', wrap(async(req,res)=>{if(Object.keys(req.query).length)throw fail(400,'INVALID_REQUEST');res.json(await require('../commerce/dist/service.cjs').branchWorkspace(await getDb()));}));
  router.post('/branches',wrap(async(req,res)=>{if(Object.keys(req.query).length)throw fail(400,'INVALID_REQUEST');res.status(201).json(await require('../commerce/dist/service.cjs').createBranch(await getDb(),req.body,req.identity.id));}));
  router.post('/branch-login',wrap(async(req,res)=>{if(Object.keys(req.query).length)throw fail(400,'INVALID_REQUEST');res.json(await require('../commerce/dist/service.cjs').saveBranchLogin(await getDb(),req.body,req.identity.id));}));
  router.get('/delivery-zones', wrap(async (req, res) => {
    if (Object.keys(req.query).length) throw fail(400, 'INVALID_REQUEST');
    res.json(await require('../commerce/dist/service.cjs').zoneAdministration(await getDb()));
  }));
  router.get('/branch-inventory', wrap(async (req, res) => {
    res.json(await require('../commerce/dist/service.cjs').branchInventory(await getDb(), req.query));
  }));
  const deliveryMutation = action => wrap(async (req, res) => {
    if (Object.keys(req.query).length) throw fail(400, 'INVALID_REQUEST');
    res.json(await require('../commerce/dist/service.cjs')[action](await getDb(), req.body, req.identity.id));
  });
  router.post('/delivery-zone', deliveryMutation('saveZone'));
  router.post('/delivery-zone-delete', deliveryMutation('deleteZone'));
  router.post('/delivery-settings', deliveryMutation('saveZoneSettings'));
  router.post('/branch-inventory', deliveryMutation('setBranchInventory'));
  router.get('/order-routing', wrap(async (req, res) => {
    if (Object.keys(req.query).length) throw fail(400, 'INVALID_REQUEST');
    const domain = require('../commerce/dist/service.cjs');
    res.json(await domain.routingHealth(await getDb()));
  }));
  router.put('/order-routing', wrap(async (req, res) => {
    if (Object.keys(req.query).length) throw fail(400, 'INVALID_REQUEST');
    res.json(await require('../commerce/dist/service.cjs').saveOrderRouting(await getDb(), req.body, req.identity.id));
  }));
  router.put('/users/:id/assignment', wrap(async (req, res) => {
    if (Object.keys(req.query).length) throw fail(400, 'INVALID_REQUEST');
    res.json(await require('../commerce/dist/service.cjs').assignStaffBranch(await getDb(), req.params.id, req.body, req.identity.id));
  }));
  // Preserve the URL while retaining the account identifier/history and revoking sessions.
  router.delete('/users/:id', wrap(async (req, res) => {
    if (Object.keys(req.query).length || Object.keys(req.body ?? {}).length) throw fail(400, 'INVALID_REQUEST');
    res.json(await require('../commerce/dist/service.cjs').deactivateStaff(await getDb(), req.params.id, req.identity.id));
  }));
  return router;
};
