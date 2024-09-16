// models/policyModel.js
const mongoose = require('mongoose');

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
    unique: true,
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

const Policy = mongoose.model('Policy', policySchema);

module.exports = {
  Policy,
  PolicyType,
  CountryType,
};