// models/userModel.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Firebase Auth에서 발급한 UID
  userUID: { type: String, required: true, unique: true },

  // 사용자 기기 식별자
  userDeviceID: { type: String, required: true },

  // 사용자 전화번호
  userPhoneNumber: { type: String, required: true, unique: true },

  // 국가 코드
  dialCode: { type: String, required: true },

  // iso 국가 코드
  isoCode: { type: String, required: true },

  // 사용자 아이디
  userID: { type: String, required: true, unique: true },

  // 사용자 비밀번호 (암호화하여 저장)
  userPassword: { type: String, required: true },

  // 사용자 프로필 이미지
  userProfileImage: { type: Buffer, default: null },

  // 사용자 닉네임, 성별, 생년월일
  userNickName: { type: String, default: null },
  userGender: { type: String, default: 'private' },
  userBirthDate: { type: String, default: '2000-01-01' },

  // 사용자 생성일, 마지막 로그인 일
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
});

const SignupUser = mongoose.model('SignupUser', userSchema);

module.exports = SignupUser;