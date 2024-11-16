// models/tempPhoneNumberModel.js

const mongoose = require('mongoose');

const tempPhoneNumber = new mongoose.Schema({
  dialCode: {
    type: String,
    required: true,
  },
  isoCode: {
    type: String,
    required: true,
  },
  userPhoneNumber: {
    type: String,
    required: true,
    unique: true, // 중복 방지를 위해 unique 설정
  },
  userDeviceID: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    index: { expires: '10m' }  // 10분 후 자동 삭제
  }
});

const TempPhoneNumber = mongoose.model('TempPhoneNumber', tempPhoneNumber);

module.exports = TempPhoneNumber;