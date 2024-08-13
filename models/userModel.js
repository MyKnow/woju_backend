// models/userModel.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  userPhoneNumber: { type: String, required: true, unique: true },
});

const SignupUser = mongoose.model('SignupUser', userSchema);

module.exports = SignupUser;