// models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  cities: {
    type: [String]
  },
  subscription: {
    tpe: Object,
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
