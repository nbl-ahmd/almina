const mongoose = require('mongoose');


const whatsappBulkReportSchema  = new mongoose.Schema({
    broadcast: [
        {
            messageStatus: String,
            error: String,
            errorDetails: String,
            recipient: String

        },
    ],

});

const whatsappBulkReportModel = mongoose.model('whatsappBulkReport', whatsappBulkReportSchema);

module.exports = whatsappBulkReportModel;
