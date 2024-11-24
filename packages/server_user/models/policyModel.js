// models/policyModel.js
const mongoose = require('mongoose');

// 필요한 Util 불러오기
const { DBName } = require('../../shared/utils/db');

/** Type enum
 * 
 * @typedef {Object} PolicyType
 * @property {string} TermsOfService - 이용 약관
 * @property {string} PrivacyPolicy - 개인정보 처리방침
 * @property {string} Other - 기타
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
    enum: Object.values(CountryType),
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(PolicyType),
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// version이 동일하더라도 type과 country가 다르면 다른 문서로 취급
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