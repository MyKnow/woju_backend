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

const Policy = mongoose.model('Policy', policySchema);

/** # PolicyType 유효성 검사 함수
 * 
 * - PolicyType 값이 유효한지 검사하는 함수
 * 
 * ### Parameters
 * @param {string} type PolicyType 값
 * 
 * ### Returns
 * @returns {boolean} 유효한 PolicyType 값인지 여부
 */
function isValidPolicyType(type) {
  return Object.values(PolicyType).includes(type);
}

/** # CountryType 유효성 검사 함수
 * 
 * - CountryType 값이 유효한지 검사하는 함수
 * 
 * ### Parameters
 * @param {string} country CountryType 값
 * 
 * ### Returns
 * @returns {boolean} 유효한 CountryType 값인지 여부
 */
function isValidCountryType(country) {
  return Object.values(CountryType).includes(country);
}

/** # Version 유효성 검사 함수
 * 
 * - Version 값이 유효한지 검사하는 함수
 * - Version 값은 x.x.x 또는 x.x.x-type 형식이어야 함
 * 
 * ### Parameters
 * @param {string} version Version 값
 * 
 * ### Returns
 * @returns {boolean} 유효한 Version 값인지 여부
 */
function isValidVersion(version) {
  const regex = /^\d+\.\d+\.\d+(-\w+)?$/;
  return regex.test(version);
}

module.exports = {
  Policy,
  PolicyType,
  CountryType,
  isValidPolicyType,
  isValidCountryType,
  isValidVersion,
};