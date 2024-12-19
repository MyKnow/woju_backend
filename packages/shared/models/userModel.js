// packages/shared/models/userModel.js

// 필요한 라이브러리 불러오기
const mongoose = require('mongoose');

// 필요한 Util 불러오기
const { generateToken } = require('../utils/auth');
const { DBName } = require('../../shared/utils/db');

// 필요한 모델 불러오기
const { Category } = require('../../shared/models/categoryModel');

// 상수로 고정된 기본값 정의
const DEFAULT_GENDER = 'private';
const DEFAULT_BIRTH_DATE = '2000-01-01';
const DEFAULT_TERMS_VERSION = '1.0.0';
const DEFAULT_PRIVACY_VERSION = '1.0.0';

/**
 * @name userSchema
 * @description 사용자 스키마
 * 
 * @type {mongoose.Schema}
 * 
 * @property {String} userUUID - UUID 필드
 * @property {String} userUID - Firebase Auth UID
 * @property {String} userDeviceID - 사용자 기기 식별자
 * @property {String} userPhoneNumber - 전화번호
 * @property {String} dialCode - 국가 코드
 * @property {String} isoCode - ISO 국가 코드
 * @property {String} userID - 사용자 아이디
 * @property {String} userPassword - 비밀번호 (암호화 저장)
 * @property {Buffer} userProfileImage - 프로필 이미지
 * @property {String} userNickName - 닉네임
 * @property {String} userGender - 성별
 * @property {String} userBirthDate - 생년월일
 * @property {String} termsVersion - 약관 버전
 * @property {String} privacyVersion - 개인정보 처리 방침 버전
 * @property {Date} createdAt - 생성일
 * @property {Date} lastLoginAt - 마지막 로그인 일
 * @property {Date} lastPasswordUpdateAt - 마지막 비밀번호 변경일
 * @property {Map<Object>} userFavoriteCategories - 사용자가 좋아하는 카테고리 목록 (key: 카테고리 이름, value: 선호 순위 (0이 가장 높음))
 */
const userSchema = new mongoose.Schema({
  userUUID: { type: String, required: true, unique: true },   // UUID 필드
  userUID: { type: String, required: true, unique: true },    // Firebase Auth UID
  userDeviceID: { type: String, required: true },             // 사용자 기기 식별자
  userPhoneNumber: { type: String, required: true, unique: true }, // 전화번호
  dialCode: { type: String, required: true },                 // 국가 코드
  isoCode: { type: String, required: true },                  // ISO 국가 코드
  userID: { type: String, required: true, unique: true },     // 사용자 아이디
  userPassword: { type: String, required: true },             // 비밀번호 (암호화 저장)
  userProfileImage: { type: Buffer, default: null },          // 프로필 이미지
  userNickName: { type: String, default: null },              // 닉네임
  userGender: { type: String, default: DEFAULT_GENDER },      // 성별
  userBirthDate: { type: String, default: DEFAULT_BIRTH_DATE }, // 생년월일
  termsVersion: { type: String, required: true, default: DEFAULT_TERMS_VERSION },  // 약관 버전
  privacyVersion: { type: String, required: true, default: DEFAULT_PRIVACY_VERSION },  // 개인정보 처리 방침 버전
  createdAt: { type: Date, default: Date.now },               // 생성일
  lastLoginAt: { type: Date, default: Date.now },             // 마지막 로그인 일
  lastPasswordUpdateAt: { type: Date, default: Date.now },    // 마지막 비밀번호 변경일
  userFavoriteCategories: { type: Map, of: Number, default: {} }, // 사용자가 좋아하는 카테고리 목록 (key: 카테고리 이름, value: 선호 순위 (0이 가장 높음))
});

/** # 사용자 간단 정보 Schema
 * @name userDisplaySchema
 * @description 사용자 간단 정보 Schema
 * 
 * @type {mongoose.Schema}
 * 
 * @property {String} userUUID - UUID 필드
 * @property {String} userNickName - 닉네임
 * @property {Buffer} userProfileImage - 프로필 이미지
 * @property {String} userID - 사용자 아이디
 * @property {String} userGender - 성별
 */
const userDisplaySchema = new mongoose.Schema({
  userUUID: { type: String, required: true },   // UUID 필드
  userNickName: { type: String, default: null }, // 닉네임
  userProfileImage: { type: Buffer, default: null }, // 프로필 이미지
  userGender: { type: String, default: DEFAULT_GENDER }, // 성별
});


/**
 * @name createUserModel
 * @description 사용자 모델 생성 함수
 * 
 * @param {mongoose.Connection} db 
 * @returns {mongoose.Model} 생성된 사용자 모델
 */
const createUserModel = (db) => {
  if (db.modelNames().includes(DBName.USER)) {
    return db.model(DBName.USER);
  }
  return db.model(DBName.USER, userSchema);
};

// 공통 데이터 생성 로직을 사용하는 함수
const generateUserData = (seed, UUID = null, phoneNumberOffset = 0) => ({
  userUUID: UUID || `UUID_${seed}`,
  userUID: `testUID_${seed}`,
  userDeviceID: `testDeviceID_${seed}`,
  userPhoneNumber: `123456789${seed + phoneNumberOffset}`,
  dialCode: `+8${seed+1}`,
  isoCode: `ISO_${seed}`,
  userID: `test_${seed + phoneNumberOffset}`,
  userPassword: `test_${seed}`,
  userProfileImage: null,
  userNickName: `test_nick${seed + phoneNumberOffset}`,
  userGender: DEFAULT_GENDER,
  userBirthDate: DEFAULT_BIRTH_DATE,
  termsVersion: DEFAULT_TERMS_VERSION,
  privacyVersion: DEFAULT_PRIVACY_VERSION,
  createdAt: new Date(),
  lastLoginAt: new Date(),
  lastPasswordUpdateAt: new Date(), 
  // seed가 0이면 전자제품 카테고리를 선호 카테고리로 설정, 그 외에는 'furniture', 'lifestyle' 카테고리를 선호 카테고리로 설정
  userFavoriteCategories: seed === 0 ? { [Category.ELECTRONICS]: 0 } : { [Category.FURNITURE]: 0, [Category.LIFESTYLE]: 1 },
});


// 각 테스트 데이터 생성 함수
const getTestSignUpUserData = (seed) => generateUserData(seed);

const getTestSignInUserData = (seed) => ({
  userPhoneNumber: `123456789${seed}`,
  dialCode: `+8${seed+1}`,
  isoCode: `ISO_${seed}`,
  userID: `test_${seed}`,
  userPassword: `test_${seed}`,
});

const getTestUpdateUserData = (seed, UUID) => generateUserData(seed, UUID, 1);

const getTestPhoneNumberUpdateData = (seed, UUID) => ({
  ...generateUserData(seed, UUID, 1),
  userPassword: `test_${seed}`,
});

/**
 * @name getTokenOfUserData
 * @description 사용자 데이터로 토큰 생성 함수
 * 
 * @param {int} seed 
 * @returns {string} 생성된 토큰
 */
const getTokenOfUserData = (seed) => {
  const userData = generateUserData(seed);
  return generateToken("USER", { userUUID: userData.userUUID });
}

module.exports = {
  createUserModel,
  getTestSignUpUserData,
  getTestSignInUserData,
  getTestUpdateUserData,
  getTestPhoneNumberUpdateData,
  getTokenOfUserData,
  userSchema,
  userDisplaySchema,
};