const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    archivedAt: Date, archivedBy: String,
    gdriveFileId: { type: String, required: true, default: '1cQnD6nDQ7Qge0LplEP22vuVTjtphlkoL' },
    name: { type: String, required: true },
    image: { type: String, required: true, default: '305dd291-e32e-4d7f-9abb-aae212c434a4.webp' },
    color: {
        type: String, required: true
    },
    disabled: {
        type: Boolean
    },


});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
