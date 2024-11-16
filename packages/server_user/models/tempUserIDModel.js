// models/tempUserIDModel.js
const mongoose = require('mongoose');

const tempUserID = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
    unique: true, // 중복 방지를 위해 unique 설정
  },
  userUID: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    index: { expires: '10m' }  // 10분 후 자동 삭제
  }
});

const TempUserID = mongoose.model('TempUserID', tempUserID);

module.exports = TempUserID;