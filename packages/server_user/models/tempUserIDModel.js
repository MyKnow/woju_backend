// models/tempUserIDModel.js
const mongoose = require('mongoose');

// 필요한 Util 불러오기
const { DBName } = require('../../shared/utils/db');

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

/**
 * @name createTempUserIDModel
 * @description 임시 사용자 ID 모델 생성 함수
 * 
 * @param {mongoose.Connection} db
 * @returns {mongoose.Model} 생성된 임시 사용자 ID 모델
 */
const createTempUserIDModel = (db) => {
  if (db.modelNames().includes(DBName.TEMP_USER_ID)) {
    return db.model(DBName.TEMP_USER_ID);
  }
  return db.model(DBName.TEMP_USER_ID, tempUserID);
}

module.exports = { createTempUserIDModel };