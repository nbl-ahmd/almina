const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  from: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    unique: true,
    required: true,
  },
  promotionStatus:{
    type: String,
    default: 'true',
  },
  messages: [
    {
      content: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      sender: {
        type: String,
        enum: ['user', 'admin'], // 'user' for messages from users, 'admin' for your responses
        required: true,
      },
    },
  ],
});

const ConversationModel = mongoose.model('Conversation', conversationSchema);

module.exports = ConversationModel;
