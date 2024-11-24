// __tests__/user/userController.test.js

// 필요한 Library 불러오기
const request = require('supertest');
const express = require('express');

// 필요한 Util 불러오기
const { connectDB, disconnectDB, DBType } = require('../../packages/shared/utils/db');
const { comparePassword } = require('../../packages/shared/utils/crypto');

// 필요한 Model 불러오기
const { createTempPhoneNumberModel } = require('../../packages/server_user/models/tempPhoneNumberModel');
const { createTempUserIDModel } = require('../../packages/server_user/models/tempUserIDModel');
const { createUserModel, getTestSignUpUserData, getTestSignInUserData, getTestUpdateUserData, getTestPhoneNumberUpdateData } = require('../../packages/shared/models/userModel');
const { FailureReason } = require('../../packages/shared/models/responseModel');
const { createPolicyModel, PolicyType, CountryType } = require('../../packages/server_user/models/policyModel');

// 필요한 Router 불러오기
const userRoutes = require('../../packages/server_user/routes/userRoutes');

// 테스트용 Express 앱 설정
const app = express();
app.use(express.json());
app.use('/api/user', userRoutes);

// 테스트 종료 후 MongoDB 연결 해제 및 메모리 서버 종료
afterAll(async () => {
  await disconnectDB(); // 테스트 종료 후 DB 연결 해제
});

beforeEach(async () => {
  // DB 연결
  const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);
  const policyDB = await connectDB(DBType.POLICY, process.env.MONGO_POLICY_DB_URI);

  if (!userDB) {
    console.error('Error connecting to User DB');
    return;
  }

  if (!policyDB) {
    console.error('Error connecting to Policy DB');
    return;
  }

  const TempPhoneNumber = createTempPhoneNumberModel(userDB);
  const TempUserID = createTempUserIDModel(userDB);
  const SignupUser = createUserModel(userDB);
  const Policy = createPolicyModel(policyDB);

  // 테스트 전 TempPhoneNumber, SignupUser 컬렉션 초기화
  await TempPhoneNumber.deleteMany({});
  await TempUserID.deleteMany({});
  await SignupUser.deleteMany({});
  await Policy.deleteMany({});
});

describe('checkPhoneNumberAvailable', () => {
  it('전화번호가 사용 가능한 경우, TempPhoneNumber에 저장하고, 사용 가능함을 응답해야 한다.', async () => {
    const response = await request(app)
      .post('/api/user/check-phonenumber-available')
      .send({ userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR' });

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);

    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempPhoneNumber = createTempPhoneNumberModel(userDB);

    // TempPhoneNumber에 해당 전화번호와 testDeviceID가 저장되었는지 확인
    const tempEntry = await TempPhoneNumber.findOne({ userPhoneNumber: '1234567890' });
    expect(tempEntry).not.toBeNull();
    expect(tempEntry.userDeviceID).toBe('testDeviceID');
  });

  it('이미 TempPhoneNumber에 등록된 전화번호의 경우, 사용 불가 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempPhoneNumber = createTempPhoneNumberModel(userDB);

    await TempPhoneNumber.create({ userDeviceID: 'anotherDeviceID', userPhoneNumber: '1234567890' , dialCode: '+82', isoCode: 'KR'});

    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
    .send({ userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR' });

    expect(response.status).toBe(400);
    expect(response.body.isAvailable).toBe(false);
  });

  it('이미 TempPhoneNumber에 등록된 전화번호를 최초 User가 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempPhoneNumber = createTempPhoneNumberModel(userDB);

    await TempPhoneNumber.create({ userDeviceID: 'testDeviceIDForSuccess', userPhoneNumber: '0123456789' , dialCode: '+82', isoCode: 'KR'});

    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
      .send({ userDeviceID: 'testDeviceIDForSuccess', userPhoneNumber: '12345678901', dialCode: '+82', isoCode: 'KR' });

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);
  });

  it('동일한 전화번호로 최초 User가 연속해서 2번 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempPhoneNumber = createTempPhoneNumberModel(userDB);

    // TempPhoneNumber에 유저 정보 저장
    await TempPhoneNumber.create({ userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR' });

    // 첫 번째 요청
    let reponse = await request(app)
      .post('/api/user/check-phonenumber-available')
      .send({ userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR' });

    // 첫 번째 요청 결과 확인
    expect(reponse.status).toBe(200);
    expect(reponse.body.isAvailable).toBe(true);

    // 두 번째 요청
    reponse = await request(app)
      .post('/api/user/check-phonenumber-available')
      .send({ userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR' });

    // 두 번째 요청 결과 확인
    expect(reponse.status).toBe(200);
    expect(reponse.body.isAvailable).toBe(true);

    // TempPhoneNumber에 해당 전화번호와 UID가 저장되었는지 확인
    const tempEntry = await TempPhoneNumber
    .findOne({ userPhoneNumber: '1234567890' });

    expect(tempEntry).not.toBeNull();
    expect(tempEntry.userDeviceID).toBe('testDeviceID');
  });

  it('이미 SignupUser에 등록된 전화번호의 경우, userDeviceID가 다르다면 사용 불가 응답을 반환해야 한다.', async () => {
     await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(1));
    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
    .send({ 
      userDeviceID: getTestSignUpUserData(2).userDeviceID, 
      userPhoneNumber: getTestSignUpUserData(1).userPhoneNumber, 
      dialCode: getTestSignUpUserData(1).dialCode, 
      isoCode: getTestSignUpUserData(1).isoCode 
    });

    expect(response.status).toBe(400);
    expect(response.body.isAvailable).toBe(false);
  });

  it('이미 SignupUser에 등록된 전화번호를 최초 User가 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
     await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(1));

    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
    .send({ 
      userDeviceID: getTestSignUpUserData(1).userDeviceID, 
      userPhoneNumber: getTestSignUpUserData(1).userPhoneNumber, 
      dialCode: getTestSignUpUserData(1).dialCode, 
      isoCode: getTestSignUpUserData(1).isoCode 
    });

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);
  });

  it('전화번호를 입력하지 않은 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
    .send({ userDeviceID: 'testDeviceID' });

    expect(response.status).toBe(400);
  });

  it('userDeviceID를 입력하지 않은 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
    .send({ userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR' });

    expect(response.status).toBe(400);
  });

  it('dialCode를 입력하지 않은 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
    .send({ userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', isoCode: 'KR' });

    expect(response.status).toBe(400);
  });

  it('isoCode를 입력하지 않은 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
    .send({ userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82' });

    expect(response.status).toBe(400);
  });
});

describe('checkUserIDAvailable', () => {
  it('아이디가 사용 가능한 경우, TempUserID에 저장하고, 사용 가능함을 응답해야 한다.', async () => {
    const response = await request(app)
      .post('/api/user/check-userid-available')
      .send({ userUID: 'testUID', userID: 'testUserID' });
      

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);

    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempUserID = createTempUserIDModel(userDB);

    // TempUserID에 해당 아이디과 UID가 저장되었는지 확인
    const tempEntry = await TempUserID.findOne({ userID: 'testUserID' });
    expect(tempEntry).not.toBeNull();
    expect(tempEntry.userUID).toBe('testUID');
  });

  it('이미 TempUserID에 등록된 아이디의 경우, 사용 불가 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempUserID = createTempUserIDModel(userDB);

    await TempUserID.create({ userUID: 'anotherUID', userID: 'testUserID' });

    const response = await request(app)
    .post('/api/user/check-userid-available')
      .send({ userUID: 'testUID', userID: 'testUserID' });

    expect(response.status).toBe(400);
    expect(response.body.isAvailable).toBe(false);
  });

  it('이미 TempUserID에 등록된 아이디를 최초 User가 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempUserID = createTempUserIDModel(userDB);

    await TempUserID.create({ userUID: 'testUIDForSuccess', userID: 'testUserID' });

    const response = await request(app)
    .post('/api/user/check-userid-available')
      .send({ userUID: 'testUIDForSuccess', userID: 'testUserID' });

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);
  });

  it('동일한 아이디으로 최초 User가 연속해서 2번 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempUserID = createTempUserIDModel(userDB);

    // TempUserID에 유저 정보 저장
    await TempUserID.create({ userUID: 'testUID', userID: 'testUserID' });

    // 첫 번째 요청
    let reponse = await request(app)
      .post('/api/user/check-userid-available')
      .send({ userUID: 'testUID', userID: 'testUserID' });

    // 첫 번째 요청 결과 확인
    expect(reponse.status).toBe(200);
    expect(reponse.body.isAvailable).toBe(true);

    // 두 번째 요청
    reponse = await request(app)
      .post('/api/user/check-userid-available')
      .send({ userUID: 'testUID', userID: 'testUserID' });

    // 두 번째 요청 결과 확인
    expect(reponse.status).toBe(200);
    expect(reponse.body.isAvailable).toBe(true);

    // TempUserID에 해당 아이디과 UID가 저장되었는지 확인
    const tempEntry = await TempUserID
    .findOne({ userID: 'testUserID' });

    expect(tempEntry).not.toBeNull();
    expect(tempEntry.userUID).toBe('testUID');
  });

  it('이미 SignupUser에 등록된 아이디의 경우, userUID가 다르다면 사용 불가 응답을 반환해야 한다.', async () => {
    await request(app)
    .post('/api/user/signup')
    .send(getTestSignUpUserData(1));
    const response = await request(app)
    .post('/api/user/check-userid-available')
    .send({ 
      userUID: getTestSignUpUserData(2).userUID, 
      userID: getTestSignUpUserData(1).userID 
    });

    expect(response.status).toBe(400);
    expect(response.body.isAvailable).toBe(false);
  });

  it('이미 SignupUser에 등록된 아이디를 최초 User가 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
    await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(1));

    const response = await request(app)
    .post('/api/user/check-userid-available')
      .send({ userUID: getTestSignUpUserData(1).userUID, userID: getTestSignUpUserData(1).userID });

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);
  });

  it('아이디를 입력하지 않은 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app)
    .post('/api/user/check-userid-available')
    .send({ userUID: 'testUID' });

    expect(response.status).toBe(400);
  });

  it('userUID를 입력하지 않은 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app)
    .post('/api/user/check-userid-available')
    .send({ userID: 'testUserID' });

    expect(response.status).toBe(400);
  });
});

describe('signupUser', () => {
  it('중복된 아이디, 전화번호의 요청 아닌 경우, 회원가입 요청이 정상적으로 처리되어야 한다.', async () => {
    const response = await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(1));

    expect(response.status).toBe(200);
  });

  it('회원가입을 성공하면, 회원 정보가 DB에 저장되어야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const response = await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(1));

    expect(response.status).toBe(200);

    const user = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    expect(user).not.toBeNull();
    expect(user.userID).toBe(getTestSignUpUserData(1).userID);
  });

  it('회원가입 요청 시 termsVersion, privacyVersion이 없는 경우, 최신 버전으로 저장되어야 한다.', async () => {
    const modifiedUserData = getTestSignUpUserData(1);
    delete modifiedUserData.termsVersion;
    delete modifiedUserData.privacyVersion;

    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);
    const policyDB = await connectDB(DBType.POLICY, process.env.MONGO_POLICY_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }
    if (!policyDB) {
      console.error('Error connecting to Policy DB');
      return;
    }

    const Policy = createPolicyModel(policyDB);
    const SignupUser = createUserModel(userDB);

    await Policy.create({ type: PolicyType.TermsOfService, country: CountryType.KR, version: '1.0.0', content: 'test' });
    await Policy.create({ type: PolicyType.PrivacyPolicy, country: CountryType.KR, version: '1.0.0', content: 'test' });

    const response = await request(app).post('/api/user/signup').send(modifiedUserData);

    expect(response.status).toBe(200);

    const user = await SignupUser.findOne({ userID: modifiedUserData.userID });

    expect(user).not.toBeNull();
    expect(user.termsVersion).toBe('1.0.0');
    expect(user.privacyVersion).toBe('1.0.0');
  });

  it('이미 TempPhoneNumber에 등록된 전화번호로 회원가입 요청을 보낸 경우, userDeviceID가 다르다면 사용 불가 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempPhoneNumber = createTempPhoneNumberModel(userDB);

    await TempPhoneNumber.create({ 
      userDeviceID: getTestSignUpUserData(1).userDeviceID, 
      userPhoneNumber: getTestSignUpUserData(2).userPhoneNumber , 
      dialCode: getTestSignUpUserData(2).dialCode,
      isoCode: getTestSignUpUserData(2).isoCode,
    });

    const response = await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(2));

    expect(response.status).toBe(400);
  });

  it('이미 TempUserID에 등록된 아이디로 회원가입 요청을 보낸 경우, userUID가 다르다면 사용 불가 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempUserID = createTempUserIDModel(userDB);

    await TempUserID.create({ 
      userUID: getTestSignUpUserData(1).userUID, 
      userID: getTestSignUpUserData(2).userID 
    });

    const response = await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(2));

    expect(response.status).toBe(400);
  });

  it ('이미 SignupUser에 등록된 정보로 회원가입 요청을 보낸 경우, 사용 불가 응답을 반환해야 한다.', async () => {
    await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(1));

    const response = await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(1));

    expect(response.status).toBe(400);
  });

  it('회원가입 요청이 정상적으로 처리되면, TempPhoneNumber, TempUserID에 저장된 정보가 삭제되어야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const TempUserID = createTempUserIDModel(userDB);
    const TempPhoneNumber = createTempPhoneNumberModel(userDB);

    await TempPhoneNumber.create({ 
      userDeviceID: getTestSignUpUserData(1).userDeviceID, 
      userPhoneNumber: getTestSignUpUserData(1).userPhoneNumber, 
      dialCode: getTestSignUpUserData(1).dialCode, 
      isoCode: getTestSignUpUserData(1).isoCode
    });

    await TempUserID.create({ 
      userUID: getTestSignUpUserData(1).userUID,
      userID: getTestSignUpUserData(1).userID,
    });

    const response = await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(1));

    expect(response.status).toBe(200);

    const tempPhoneNumber = await TempPhoneNumber.findOne({ userPhoneNumber: getTestSignUpUserData(1).userPhoneNumber });
    const tempUserID = await TempUserID.findOne({ userID: getTestSignUpUserData(1).userID });

    expect(tempPhoneNumber).toBeNull();
    expect(tempUserID).toBeNull();
  });

  it('회원가입 요청 시, 사용자 정보 중 민감한 정보는 해시화되어 저장되어야 한다.', async () => {
    const response = await request(app)
      .post('/api/user/signup')
      .send(getTestSignUpUserData(1));

    expect(response.status).toBe(200);

    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const user = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    expect(user).not.toBeNull();
    expect(user.userPassword).not.toBe(getTestSignUpUserData(1).userPassword);
    expect(await comparePassword(getTestSignUpUserData(1).userPassword, user.userPassword)).toBe(true);
  });

  it('DB에 약관이 존재하지 않는 경우, 회원가입 요청이 실패해야 한다.', async () => {
    const { termsVersion, ...userData } = getTestSignUpUserData(1);


    const response = await request(app)
      .post('/api/user/signup')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body.failureReason).toBe(FailureReason.TERMS_VERSION_NOT_AVAILABLE);


    const { privacyVersion, ...userData2 } = getTestSignUpUserData(2);

    const response2 = await request(app)
      .post('/api/user/signup')
      .send(userData2);

    expect(response2.status).toBe(400);
    expect(response2.body.failureReason).toBe(FailureReason.PRIVACY_VERSION_NOT_AVAILABLE);
  });

  it('국가 코드가 한국이 아닌 경우, 약관 버전이 없을 때 US의 약관 버전으로 회원가입이 가능해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);
    const policyDB = await connectDB(DBType.POLICY, process.env.MONGO_POLICY_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }
    if (!policyDB) {
      console.error('Error connecting to Policy DB');
      return;
    }

    const Policy = createPolicyModel(policyDB);
    const SignupUser = createUserModel(userDB);

    Policy.create({ type: PolicyType.TermsOfService, country: CountryType.US, version: '1.0.0', content: 'test' });
    Policy.create({ type: PolicyType.PrivacyPolicy, country: CountryType.US, version: '1.0.0', content: 'test' });
    Policy.create({ type: PolicyType.TermsOfService, country: CountryType.KR, version: '1.0.1', content: 'test' });
    Policy.create({ type: PolicyType.PrivacyPolicy, country: CountryType.KR, version: '1.0.1', content: 'test' });

    const { termsVersion, isoCode, dialCode, ...userData } = getTestSignUpUserData(1);

    const userDataWithUS = {
      ...userData,
      isoCode: 'US',
      dialCode: '+1',
    };

    const response = await request(app)
      .post('/api/user/signup')
      .send(userDataWithUS);

    expect(response.status).toBe(200);

    const user = await SignupUser.findOne({ userID: userData.userID });

    expect(user).not.toBeNull();
    expect(user.termsVersion).toBe('1.0.0');
    expect(user.privacyVersion).toBe('1.0.0');

  });

  it('필수 정보가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    const { userDeviceID, ...userData } = getTestSignUpUserData(1);

    const response = await request(app)
      .post('/api/user/signup')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body.failureReason).toBe(FailureReason.USER_SIGNUP_INFO_EMPTY);
  });
});

describe('loginUser', () => {
  it('등록된 사용자 정보로 로그인 요청을 보낸 경우, 로그인이 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    expect(await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID })).not.toBeNull();

    const response = await request(app).post('/api/user/login').send(getTestSignInUserData(1));
    expect(response.status).toBe(200);
  });

  it('등록되지 않은 사용자 정보로 로그인 요청을 보낸 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/login').send(getTestSignInUserData(1));

    expect(response.status).toBe(400);
  });

  it('비밀번호가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const {userPassword, ...signInData} = getTestSignInUserData(1);
    const response = await request(app).post('/api/user/login').send(signInData);

    expect(response.status).toBe(400);
  });

  it('비밀번호가 일치하지 않는 경우, 에러 응답을 반환해야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const {userPassword, ...signInData} = getTestSignInUserData(1);

    const wrongPasswordSignInData = {
      ...signInData,
      userPassword: getTestSignUpUserData(2).userPassword,
    };

    const response = await request(app).post('/api/user/login').send(wrongPasswordSignInData);

    expect(response.status).toBe(400);
    expect(response.body.failureReason).toBe(FailureReason.PASSWORD_NOT_MATCH);
  });

  it('아이디 또는 전화번호가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));
    
    const {userID, userPhoneNumber, ...signInData} = getTestSignInUserData(1);
    const response = await request(app).post('/api/user/login').send(signInData);

    expect(response.status).toBe(400);
  });

  it('아이디와 비밀번호만으로 로그인 요청을 보낸 경우, 로그인이 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const {userPhoneNumber, dialCode, isoCode, ...signInData} = getTestSignInUserData(1);

    const response = await request(app).post('/api/user/login').send(signInData);

    expect(response.status).toBe(200);
  });

  it('전화번호와 비밀번호만으로 로그인 요청을 보낸 경우, 로그인이 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const {userID, ...signInData} = getTestSignInUserData(1);
    const response = await request(app).post('/api/user/login').send(signInData);

    expect(response.status).toBe(200);
    expect(response.body.failureReason).toBeUndefined();
  });
});

describe('withdrawUser', () => {
  it('등록된 사용자 정보로 탈퇴 요청을 보낸 경우, 탈퇴가 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const response = await request(app).post('/api/user/withdraw').send({ userID: getTestSignUpUserData(1).userID, userPassword: getTestSignUpUserData(1).userPassword });

    expect(response.status).toBe(200);
  });

  it('등록된 사용자 정보로 탈퇴 요청을 보낸 경우, 탈퇴 후 사용자 정보가 삭제되어야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    await request(app).post('/api/user/withdraw').send({ userID: getTestSignUpUserData(1).userID, userPassword: getTestSignUpUserData(1).userPassword });

    const user = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    expect(user).toBeNull();
  });

  it('등록되지 않은 사용자 정보로 탈퇴 요청을 보낸 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/withdraw').send({ userID: getTestSignUpUserData(1).userID, userPassword: getTestSignUpUserData(1).userPassword });

    expect(response.status).toBe(400);
  });

  it('비밀번호가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/withdraw').send({ userID: getTestSignUpUserData(1).userID });

    expect(response.status).toBe(400);
  });

  it('비밀번호가 일치하지 않는 경우, 에러 응답을 반환해야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const response = await request(app).post('/api/user/withdraw').send({ userID: getTestSignUpUserData(1).userID, userPassword: getTestSignUpUserData(2).userPassword });

    expect(response.status).toBe(400);
  });
});

describe('update-user-password', () => {
  it('등록된 사용자 정보로 비밀번호 수정 요청을 보낸 경우, 비밀번호 수정이 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const response = await request(app).post('/api/user/update-user-password').send({ userID: getTestSignUpUserData(1).userID, oldPassword: getTestSignUpUserData(1).userPassword, newPassword: getTestSignUpUserData(2).userPassword });

    expect(response.status).toBe(200);

    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const user = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    expect(await comparePassword(getTestSignUpUserData(2).userPassword, user.userPassword)).toBe(true);
  });

  it('등록되지 않은 사용자 정보로 비밀번호 수정 요청을 보낸 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/update-user-password').send({ userID: getTestSignUpUserData(1).userID, oldPassword: getTestSignUpUserData(1).userPassword, newPassword: getTestSignUpUserData(2).userPassword });

    expect(response.status).toBe(400);
  });

  it('기존 비밀번호가 일치하지 않는 경우, 에러 응답을 반환해야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const response = await request(app).post('/api/user/update-user-password').send({ userID: getTestSignUpUserData(1).userID, oldPassword: getTestSignUpUserData(2).userPassword, newPassword: getTestSignUpUserData(3).userPassword });

    expect(response.status).toBe(400);
  });

  it('비밀번호가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const response = await request(app).post('/api/user/update-user-password').send({ userID: getTestSignUpUserData(1).userID, oldPassword: getTestSignUpUserData(1).userPassword });

    expect(response.status).toBe(400);
  });
});

describe('reset-user-password', () => {
  it('등록된 사용자 정보로 비밀번호 재설정 요청을 보낸 경우, 비밀번호 재설정이 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const response = await request(app).post('/api/user/reset-user-password').send({ 
      userUID: getTestSignUpUserData(1).userUID, 
      userPhoneNumber: getTestSignUpUserData(1).userPhoneNumber,
      dialCode: getTestSignUpUserData(1).dialCode,
      isoCode: getTestSignUpUserData(1).isoCode,
      newPassword: getTestSignUpUserData(2).userPassword 
    });

    expect(response.status).toBe(200);

    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const user = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    expect(user).not.toBeNull();
    expect(await comparePassword(getTestSignUpUserData(2).userPassword, user.userPassword)).toBe(true);
  });

  it('등록되지 않은 사용자 정보로 비밀번호 재설정 요청을 보낸 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/reset-user-password').send({ userUID: getTestSignUpUserData(1).userUID, newPassword: getTestSignUpUserData(2).userPassword });

    expect(response.status).toBe(400);
  });

  it('비밀번호가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const response = await request(app).post('/api/user/reset-user-password').send({ userUID: getTestSignUpUserData(1).userUID });

    expect(response.status).toBe(400);
  });
});

describe('checkUserExist', () => {
  it('등록된 사용자 정보로 사용자 존재 여부 확인 요청을 보낸 경우, 사용자 정보가 존재함을 응답해야 한다.', async () => {
    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const response = await request(app).post('/api/user/check-user-exists').send({ userUID: getTestSignUpUserData(1).userUID });

    expect(response.status).toBe(200);
    expect(response.body.isExists).toBe(true);
  });

  it('등록되지 않은 사용자 정보로 사용자 존재 여부 확인 요청을 보낸 경우, 사용자 정보가 존재하지 않음을 응답해야 한다.', async () => {
    const response = await request(app).post('/api/user/check-user-exists').send({ userUID: getTestSignUpUserData(1).userUID });

    expect(response.status).toBe(400);
    expect(response.body.isExists).toBe(false);
  });
});

describe('update-user-info', () => {
  it('등록된 사용자 정보로 정보 수정 요청을 보낸 경우, 정보 수정이 정상적으로 처리되어야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    const userBeforeUpdate = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    // 요청에선 항상 userModel의 모든 필드를 전달해야 한다.
    const response = await request(app).post('/api/user/update-user-info').send(getTestUpdateUserData(1, userBeforeUpdate.userUUID));

    expect(response.status).toBe(200);
    expect(response.body.failureReason).toBeUndefined();

    const user = await SignupUser.findOne({ userID:getTestUpdateUserData(1, userBeforeUpdate.userUUID).userID });

    expect(user).not.toBeNull();
    expect(user.userNickName).toBe(getTestUpdateUserData(1, userBeforeUpdate.userUUID).userNickName);
    expect(user.userGender).toBe(userBeforeUpdate.userGender);
  });

  it('등록되지 않은 사용자 정보로 정보 수정 요청을 보낸 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app)
    .post('/api/user/update-user-info')
    .send(getTestUpdateUserData(1, "testUUID"));

    expect(response.status).toBe(400);
    expect(response.body.failureReason).toBe(FailureReason.USER_NOT_FOUND);
  });

  it('비밀번호가 일치하지 않는 경우, 에러 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const response = await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));
    expect(response.status).toBe(200);

    const userBeforeUpdate = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    const passwordUpdate =  {
      userUUID: userBeforeUpdate.userUUID,
      userUID: userBeforeUpdate.userUID,
      userDeviceID: userBeforeUpdate.userDeviceID,
      userPhoneNumber: userBeforeUpdate.userPhoneNumber,
      dialCode: userBeforeUpdate.dialCode,
      isoCode: userBeforeUpdate.isoCode,
      userID: userBeforeUpdate.userID,
      userPassword: `test_different_password`,
      userProfileImage: userBeforeUpdate.userProfileImage,
      userNickName: userBeforeUpdate.userNickName,
      userGender: userBeforeUpdate.userGender,
      userBirthDate: userBeforeUpdate.userBirthDate,
      termsVersion: userBeforeUpdate.termsVersion,
      privacyVersion: userBeforeUpdate.privacyVersion,
    };

    const result = await request(app)
    .post('/api/user/update-user-info')
    .send(passwordUpdate);

    expect(result.status).toBe(400);
    expect(result.body.failureReason).toBe(FailureReason.PASSWORD_NOT_MATCH);

    // 변경되지 않았는지 확인
    const user = await SignupUser.findOne({ userID: passwordUpdate.userID });

    expect(user).not.toBeNull();
    expect(user.userNickName).toBe(userBeforeUpdate.userNickName);
  });

  it('약관 버전이 누락된 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));
    expect(response.status).toBe(200);

    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const userBeforeUpdate = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    const termsUpdate =  {
      userUUID: userBeforeUpdate.userUUID,
      userUID: userBeforeUpdate.userUID,
      userDeviceID: userBeforeUpdate.userDeviceID,
      userPhoneNumber: userBeforeUpdate.userPhoneNumber,
      dialCode: userBeforeUpdate.dialCode,
      isoCode: userBeforeUpdate.isoCode,
      userID: userBeforeUpdate.userID,
      userPassword: getTestSignUpUserData(1).userPassword,
      userProfileImage: userBeforeUpdate.userProfileImage,
      userNickName: userBeforeUpdate.userNickName,
      userGender: userBeforeUpdate.userGender,
      userBirthDate: userBeforeUpdate.userBirthDate,
      privacyVersion: userBeforeUpdate.privacyVersion,
    };

    const result = await request(app)
    .post('/api/user/update-user-info')
    .send(termsUpdate);

    expect(result.status).toBe(400);
    expect(result.body.failureReason).toBe(FailureReason.TERMS_VERSION_EMPTY);

    // 변경되지 않았는지 확인
    const user = await SignupUser.findOne({ userID: termsUpdate.userID });

    expect(user).not.toBeNull();
    expect(user.userNickName).toBe(userBeforeUpdate.userNickName);
  });

  it('약관 버전이 현재 버전보다 낮은 경우, 에러 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const response = await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));
    expect(response.status).toBe(200);

    const userBeforeUpdate = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    const termsUpdate =  {
      userUUID: userBeforeUpdate.userUUID,
      userUID: userBeforeUpdate.userUID,
      userDeviceID: userBeforeUpdate.userDeviceID,
      userPhoneNumber: userBeforeUpdate.userPhoneNumber,
      dialCode: userBeforeUpdate.dialCode,
      isoCode: userBeforeUpdate.isoCode,
      userID: userBeforeUpdate.userID,
      userPassword: getTestSignUpUserData(1).userPassword,
      userProfileImage: userBeforeUpdate.userProfileImage,
      userNickName: userBeforeUpdate.userNickName,
      userGender: userBeforeUpdate.userGender,
      userBirthDate: userBeforeUpdate.userBirthDate,
      termsVersion: '0.0.1',
      privacyVersion: userBeforeUpdate.privacyVersion,
    };

    const result = await request(app)
    .post('/api/user/update-user-info')
    .send(termsUpdate);

    expect(result.status).toBe(400);
    expect(result.body.failureReason).toBe(FailureReason.TERMS_VERSION_NOT_MATCH);

    // 변경되지 않았는지 확인
    const user = await SignupUser.findOne({ userID: termsUpdate.userID });

    expect(user).not.toBeNull();
    expect(user.userNickName).toBe(userBeforeUpdate.userNickName);
  });

  it('전화번호가 중복된 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));
    expect(response.status).toBe(200);

    const responseAnotherUser = await request(app).post('/api/user/signup').send(getTestSignUpUserData(2));
    expect(responseAnotherUser.status).toBe(200);

    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const userBeforeUpdate = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    const phoneNumberUpdate =  {
      userUUID: userBeforeUpdate.userUUID,
      userUID: userBeforeUpdate.userUID,
      userDeviceID: userBeforeUpdate.userDeviceID,
      userPhoneNumber: getTestSignUpUserData(2).userPhoneNumber,
      dialCode: getTestSignUpUserData(2).dialCode,
      isoCode: getTestSignUpUserData(2).isoCode,
      userID: userBeforeUpdate.userID,
      userPassword: getTestSignUpUserData(1).userPassword,
      userProfileImage: userBeforeUpdate.userProfileImage,
      userNickName: userBeforeUpdate.userNickName,
      userGender: userBeforeUpdate.userGender,
      userBirthDate: userBeforeUpdate.userBirthDate,
      termsVersion: userBeforeUpdate.termsVersion,
      privacyVersion: userBeforeUpdate.privacyVersion,
    };

    const result = await request(app)
    .post('/api/user/update-user-info')
    .send(phoneNumberUpdate);

    expect(result.status).toBe(400);
    expect(result.body.failureReason).toBe(FailureReason.PHONENUMBER_NOT_AVAILABLE);

    // 변경되지 않았는지 확인
    const user = await SignupUser.findOne({ userID: phoneNumberUpdate.userID });

    expect(user).not.toBeNull();
    expect(user.userNickName).toBe(userBeforeUpdate.userNickName);
  });

  it('아이디가 중복된 경우, 에러 응답을 반환해야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const response = await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));
    expect(response.status).toBe(200);


    const responseAnotherUser = await request(app).post('/api/user/signup').send(getTestSignUpUserData(2));
    expect(responseAnotherUser.status).toBe(200);

    const userBeforeUpdate = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    const idUpdate =  {
      userUUID: userBeforeUpdate.userUUID,
      userUID: userBeforeUpdate.userUID,
      userDeviceID: userBeforeUpdate.userDeviceID,
      userPhoneNumber: userBeforeUpdate.userPhoneNumber,
      dialCode: userBeforeUpdate.dialCode,
      isoCode: userBeforeUpdate.isoCode,
      userID: getTestSignUpUserData(2).userID,
      userPassword: getTestSignUpUserData(1).userPassword,
      userProfileImage: userBeforeUpdate.userProfileImage,
      userNickName: userBeforeUpdate.userNickName,
      userGender: userBeforeUpdate.userGender,
      userBirthDate: userBeforeUpdate.userBirthDate,
      termsVersion: userBeforeUpdate.termsVersion,
      privacyVersion: userBeforeUpdate.privacyVersion,
    };

    const result = await request(app)
    .post('/api/user/update-user-info')
    .send(idUpdate);

    expect(result.status).toBe(400);
    expect(result.body.failureReason).toBe(FailureReason.USER_ID_NOT_AVAILABLE);

    // 변경되지 않았는지 확인
    const user = await SignupUser.findOne({ userID: idUpdate.userID });
    expect(user.userNickName).toBe(getTestSignUpUserData(2).userNickName);
  });

  it('비밀번호가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));
    expect(response.status).toBe(200);

    const {userPassword, ...removePasswordData} = getTestUpdateUserData(1);
    const result = await request(app)
    .post('/api/user/update-user-info')
    .send(removePasswordData);

    expect(result.status).toBe(400);
    expect(result.body.failureReason).toBe(FailureReason.PASSWORD_EMPTY);
  });
});

describe('update-user-phonenumber', () => {
  it('등록된 사용자 정보로 전화번호 수정 요청을 보낸 경우, 전화번호 수정이 정상적으로 처리되어야 한다.', async () => {
    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const signUpResult = await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));
    expect(signUpResult.status).toBe(200);

    const userBeforeUpdate = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });
    expect(userBeforeUpdate).not.toBeNull();

    const updateData = getTestPhoneNumberUpdateData(1, userBeforeUpdate.userUUID);
    expect(updateData.userUUID).toBe(userBeforeUpdate.userUUID);

    const response = await request(app)
    .post('/api/user/update-user-phonenumber')
    .send(updateData);
    expect(response.status).toBe(200);
    expect(response.body.failureReason).toBeUndefined();

    const user = await SignupUser.findOne({ userUUID: userBeforeUpdate.userUUID });
    expect(user).not.toBeNull();
    expect(user.userPhoneNumber).toBe(updateData.userPhoneNumber);
  });

  it('등록되지 않은 사용자 정보로 전화번호 수정 요청을 보낸 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app)
    .post('/api/user/update-user-phonenumber')
    .send(getTestPhoneNumberUpdateData(1));

    expect(response.status).toBe(400);
    expect(response.body.failureReason).toBe(FailureReason.USER_NOT_FOUND);
  });

  it('비밀번호가 일치하지 않는 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/signup').send(getTestSignUpUserData(1));

    expect(response.status).toBe(200);

    // DB 연결
    const userDB = await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);

    if (!userDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const SignupUser = createUserModel(userDB);

    const userBeforeUpdate = await SignupUser.findOne({ userID: getTestSignUpUserData(1).userID });

    const updatedData = {
      userUUID: userBeforeUpdate.userUUID,
      userUID: userBeforeUpdate.userUID,
      userDeviceID: userBeforeUpdate.userDeviceID,
      userPhoneNumber: userBeforeUpdate.userPhoneNumber,
      dialCode: userBeforeUpdate.dialCode,
      isoCode: userBeforeUpdate.isoCode,
      userID: userBeforeUpdate.userID,
      userPassword: `test_different_password`,
    };

    const result = await request(app)
    .post('/api/user/update-user-phonenumber')
    .send(updatedData);

    expect(result.status).toBe(400);
    expect(result.body.failureReason).toBe(FailureReason.PASSWORD_NOT_MATCH);
  });

  it('비밀번호가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    const { userPassword, ...removePasswordData } = getTestPhoneNumberUpdateData(1);
    const response = await request(app).post('/api/user/update-user-phonenumber').send(removePasswordData);

    expect(response.status).toBe(400);
    expect(response.body.failureReason).toBe(FailureReason.PASSWORD_EMPTY);
  });
});