// Preserve Socket.IO/event-bus import and payload contracts; maintained auth owns authorization.
module.exports = { secureRealtime: require('../commerce/dist/service.cjs').secureRealtime };
