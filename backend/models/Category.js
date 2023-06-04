const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    gdriveFileId:{ type: String, required: true, default: '16Buy69mXW2r0DMijaGZqtydQZcCdhjni' },
    name: { type: String, required: true },
    image: { type: String, required: true, default:'f0d05b80-3bc2-4cbc-89d4-175659562162.webp' },
    color:{
         type: String, required: true }
    

});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
