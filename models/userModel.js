const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // UUID 필드 (자동으로 생성)
  userUUID: { type: String, required: true, unique: true },

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

  // 이용 약관 버전
  termsVersion: { type: String, required: true },

  // 개인정보 처리 방침 버전
  privacyVersion: { type: String, required: true },

  // 사용자 생성일, 마지막 로그인 일
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
});

const SignupUser = mongoose.model('SignupUser', userSchema);

const getTestSignUpUserData = (seed) => {
  return {
    userUID: `testUID_${seed}`,
    userDeviceID: `testDeviceID_${seed}`,
    userPhoneNumber: `123456789${seed}`,
    dialCode: `+${seed}`,
    isoCode: `ISO_${seed}`,
    userID: `test_${seed}`,
    userPassword: `test_${seed}`,
    userProfileImage: null,
    userNickName: `test_nick${seed}`,
    userGender: 'private',
    userBirthDate: '2000-01-01',
    termsVersion: '1.0.0',
    privacyVersion: '1.0.0',
  };
};

const getTestSignInUserData = (seed) => {
  return {
    userPhoneNumber: `123456789${seed}`,
    dialCode: `+${seed}`,
    isoCode: `ISO_${seed}`,
    userID: `test_${seed}`,
    userPassword: `test_${seed}`,
  };
};

const getTestUpdateUserData = (seed, UUID) => {
  return {
    userUUID: UUID,
    userUID: `testUID_${seed}`,
    userDeviceID: `testDeviceID_${seed}`,
    userPhoneNumber: `123456789${seed+1}`,
    dialCode: `+${seed}`,
    isoCode: `ISO_${seed}`,
    userID: `test_${seed+1}`,
    userPassword: `test_${seed}`,
    userProfileImage: null,
    userNickName: `test_nick${seed+1}`,
    userGender: 'private',
    userBirthDate: '2000-01-01',
    termsVersion: '1.0.0',
    privacyVersion: '1.0.0',
  };
};

const getTestPhoneNumberUpdateData = (seed, UUID) => {
  return {
    userUUID: UUID,
    userUID: `testUID_${seed}`,
    userDeviceID: `testDeviceID_${seed}`,
    userPhoneNumber: `123456789${seed+1}`,
    dialCode: `+${seed}`,
    isoCode: `ISO_${seed}`,
    userID: `test_${seed}`,
    userPassword : `test_${seed}`,
  };
}


module.exports = {
  SignupUser,
  getTestSignUpUserData,
  getTestSignInUserData,
  getTestUpdateUserData,
  getTestPhoneNumberUpdateData,
};