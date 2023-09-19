const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  // Other fields in your Store model
  // ...
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open', // Set the default store status to "open"
  },
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
