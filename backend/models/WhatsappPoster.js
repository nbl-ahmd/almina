const mongoose = require('mongoose');

const WhatsappPosterSchema = new mongoose.Schema({
  gdriveFileId:{ type: String, required: true },
  image: { type: String, required: true }
});

const WhatsappPoster = mongoose.model('WhatsappPoster', WhatsappPosterSchema);

module.exports = WhatsappPoster;