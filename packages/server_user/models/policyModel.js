// models/policyModel.js
const mongoose = require('mongoose');

// 필요한 Util 불러오기
const { DBName } = require('../../shared/utils/db');

/** Type enum
 * 
 * @typedef {Object} PolicyType
 * @property {string} TermsOfService - 이용 약관
 * @property {string} PrivacyPolicy - 개인정보 처리방침
 * 
 */
const PolicyType = Object.freeze({
  TermsOfService: 'termsOfService',
  PrivacyPolicy: 'privacyPolicy',
});

/** Country enum
 * 
 * @typedef {Object} Country
 * @property {string} KR - 대한민국
 * @property {string} US - 미국
 * 
 */
const CountryType = Object.freeze({
  KR: 'KR',
  US: 'US',
});

/**
 * @name policySchema
 * @description Policy Schema
 * 
 * @property {string} version - 버전 (String, Required, None-Unique)
 * @property {string} content - 내용 (String, Required, None-Unique)
 * @property {string} country - 국가 (String, Required, None-Unique)
 * @property {string} type - 타입 (String, Required, None-Unique)
 * @property {Date} updatedAt - 업데이트 일자 (Date, Default: Date.now)
 * 
 */
const policySchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});


policySchema.index({ version: 1, type: 1, country: 1 }, { unique: true });

/**
 * @name createPolicyModel
 * @description Policy 모델 생성 함수
 * 
 * @param {mongoose.Connection} db - DB Connection
 * @returns {mongoose.Model} - Policy Model
 */
const createPolicyModel = (db) => {
  if (!db) {
    throw new Error('DB 연결이 필요합니다.');
  }

  if (db.models[DBName.POLICY]) {
    return db.models[DBName.POLICY];
  }

  return db.model(DBName.POLICY, policySchema);
}

module.exports = {
  createPolicyModel,
  PolicyType,
  CountryType,
};