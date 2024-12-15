// models/tempPhoneNumberModel.js

// 필요한 라이브러리 불러오기
const mongoose = require('mongoose');

// 필요한 Util 불러오기
const { DBName } = require('../utils/db');

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

/**
 * @name createTempPhoneNumberModel
 * @description 임시 전화번호 모델 생성 함수
 * 
 * @param {mongoose.Connection} db
 * @returns {mongoose.Model} 생성된 임시 전화번호 모델
 */
const createTempPhoneNumberModel = (db) => {
  if (!db) {
    throw new Error('DB 연결 정보가 없습니다.');
  }

  if (db.modelNames().includes(DBName.TEMP_PHONE_NUMBER)) {
    return db.model(DBName.TEMP_PHONE_NUMBER);
  }
  return db.model(DBName.TEMP_PHONE_NUMBER, tempPhoneNumber);
}


module.exports = { createTempPhoneNumberModel, tempPhoneNumber };