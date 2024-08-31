// __tests__/userController.test.js

const request = require('supertest'); // HTTP 요청을 모의하기 위해 사용
const express = require('express');
const { connectDB, disconnectDB } = require('../utils/db');
const TempPhoneNumber = require('../models/tempPhoneNumberModel');
const TempUserID = require('../models/tempUserIDModel');
const SignupUser = require('../models/userModel');
const userRoutes = require('../routes/userRoutes');
const { comparePassword } = require('../utils/crypto');
const { FailureReason } = require('../models/responseModel');

// 테스트용 Express 앱 설정
const app = express();
app.use(express.json());
app.use('/api/user', userRoutes);

// 테스트 시작 전 MongoDB 메모리 서버 시작
beforeAll(async () => {
  await connectDB(); // 테스트 시작 전 DB 연결
});

// 테스트 종료 후 MongoDB 연결 해제 및 메모리 서버 종료
afterAll(async () => {
  await disconnectDB(); // 테스트 종료 후 DB 연결 해제
});

beforeEach(async () => {
  // 테스트 전 TempPhoneNumber, SignupUser 컬렉션 초기화
  await TempPhoneNumber.deleteMany({});
  await TempUserID.deleteMany({});
  await SignupUser.deleteMany({});
});

describe('checkPhoneNumberAvailable', () => {
  it('전화번호가 사용 가능한 경우, TempPhoneNumber에 저장하고, 사용 가능함을 응답해야 한다.', async () => {
    const response = await request(app)
      .post('/api/user/check-phonenumber-available')
      .send({ userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR' });

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);

    // TempPhoneNumber에 해당 전화번호와 testDeviceID가 저장되었는지 확인
    const tempEntry = await TempPhoneNumber.findOne({ userPhoneNumber: '1234567890' });
    expect(tempEntry).not.toBeNull();
    expect(tempEntry.userDeviceID).toBe('testDeviceID');
  });

  it('이미 TempPhoneNumber에 등록된 전화번호의 경우, 사용 불가 응답을 반환해야 한다.', async () => {
    await TempPhoneNumber.create({ userDeviceID: 'anotherDeviceID', userPhoneNumber: '1234567890' , dialCode: '+82', isoCode: 'KR'});

    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
      .send({ userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR' });

    expect(response.status).toBe(400);
    expect(response.body.isAvailable).toBe(false);
  });

  it('이미 TempPhoneNumber에 등록된 전화번호를 최초 User가 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
    await TempPhoneNumber.create({ userDeviceID: 'testDeviceIDForSuccess', userPhoneNumber: '0123456789' , dialCode: '+82', isoCode: 'KR'});

    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
      .send({ userDeviceID: 'testDeviceIDForSuccess', userPhoneNumber: '12345678901', dialCode: '+82', isoCode: 'KR' });

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);
  });

  it('동일한 전화번호로 최초 User가 연속해서 2번 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
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

  it('이미 SignupUser에 등록된 전화번호의 경우, uid가 다르다면 사용 불가 응답을 반환해야 한다.', async () => {
    await await request(app)
      .post('/api/user/signup')
      .send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });
    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
      .send({ userDeviceID: 'anotherDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR' });

    expect(response.status).toBe(400);
    expect(response.body.isAvailable).toBe(false);
  });

  it('이미 SignupUser에 등록된 전화번호를 최초 User가 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
    await await request(app)
      .post('/api/user/signup')
      .send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });

    const response = await request(app)
    .post('/api/user/check-phonenumber-available')
      .send({ userDeviceID: 'testDeviceID', userPhoneNumber: '0123456789', dialCode: '+82', isoCode: 'KR' });

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);
  });
});

describe('checkUserIDAvailable', () => {
  it('아이디가 사용 가능한 경우, TempUserID에 저장하고, 사용 가능함을 응답해야 한다.', async () => {
    const response = await request(app)
      .post('/api/user/check-userid-available')
      .send({ userUID: 'testUID', userID: 'testUserID' });
      

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);

    // TempUserID에 해당 아이디과 UID가 저장되었는지 확인
    const tempEntry = await TempUserID.findOne({ userID: 'testUserID' });
    expect(tempEntry).not.toBeNull();
    expect(tempEntry.userUID).toBe('testUID');
  });

  it('이미 TempUserID에 등록된 아이디의 경우, 사용 불가 응답을 반환해야 한다.', async () => {
    await TempUserID.create({ userUID: 'anotherUID', userID: 'testUserID' });

    const response = await request(app)
    .post('/api/user/check-userid-available')
      .send({ userUID: 'testUID', userID: 'testUserID' });

    expect(response.status).toBe(400);
    expect(response.body.isAvailable).toBe(false);
  });

  it('이미 TempUserID에 등록된 아이디를 최초 User가 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
    await TempUserID.create({ userUID: 'testUIDForSuccess', userID: 'testUserID' });

    const response = await request(app)
    .post('/api/user/check-userid-available')
      .send({ userUID: 'testUIDForSuccess', userID: 'testUserID' });

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);
  });

  it('동일한 아이디으로 최초 User가 연속해서 2번 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
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

  it('이미 SignupUser에 등록된 아이디의 경우, uid가 다르다면 사용 불가 응답을 반환해야 한다.', async () => {
    await request(app)
    .post('/api/user/signup')
    .send({
      userDeviceID: 'testDeviceID',
      userUID: 'testUID',
      userPhoneNumber: '1234567890',
      dialCode: '+82', isoCode: 'KR',
      userID: 'testUserID',
      userPassword: 'testPassword',
      userProfileImage: null,
      userNickName: 'testNickName',
      userGender: 'private',
      userBirthDate: '2000-01-01',
    });
    const response = await request(app).post('/api/user/check-userid-available').send({ userUID: 'anotherUID', userID: 'testUserID' });

    expect(response.status).toBe(400);
    expect(response.body.isAvailable).toBe(false);
  });

  it('이미 SignupUser에 등록된 아이디를 최초 User가 요청할 경우, 사용 가능 응답을 반환해야 한다.', async () => {
    await await request(app)
      .post('/api/user/signup')
      .send({ userUID:'testUID', userDeviceID: 'testUID', userPhoneNumber: '1234567890', userID: 'test', userPassword : 'test', dialCode: '+82', isoCode: 'KR' });

    const response = await request(app)
    .post('/api/user/check-userid-available')
      .send({ userUID: 'testUID', userID: 'testUserID' });

    expect(response.status).toBe(200);
    expect(response.body.isAvailable).toBe(true);
  });
});

describe('signupUser', () => {
  it('중복된 아이디, 전화번호의 요청 아닌 경우, 회원가입 요청이 정상적으로 처리되어야 한다.', async () => {
    const response = await request(app)
      .post('/api/user/signup')
      .send({
        userDeviceID: 'testDeviceID',
        userUID: 'testUID',
        userPhoneNumber: '1234567890',
        dialCode: '+82', isoCode: 'KR',
        userID: 'testUserID',
        userPassword: 'testPassword',
        userProfileImage: null,
        userNickName: 'testNickName',
        userGender: 'private',
        userBirthDate: '2000-01-01',
      });

    expect(response.status).toBe(200);
  });

  it('회원가입을 성공하면, 회원 정보가 DB에 저장되어야 한다.', async () => {
    const response = await request(app)
      .post('/api/user/signup')
      .send({
        userDeviceID: 'testDeviceID',
        userUID: 'testUID',
        userPhoneNumber: '1234567890',
        dialCode: '+82', isoCode: 'KR',
        userID: 'testUserID',
        userPassword: 'testPassword',
        userProfileImage: null,
        userNickName: 'testNickName',
        userGender: 'private',
        userBirthDate: '2000-01-01',
      });

    expect(response.status).toBe(200);

    const user = await SignupUser.findOne({ userID: 'testUserID' });

    expect(user).not.toBeNull();
    expect(user.userID).toBe('testUserID');
  });

  it('이미 TempPhoneNumber에 등록된 전화번호로 회원가입 요청을 보낸 경우, userDeviceID가 다르다면 사용 불가 응답을 반환해야 한다.', async () => {
    await TempPhoneNumber.create({ userDeviceID: 'anotherDeviceID', userPhoneNumber: '1234567890' , dialCode: '+82', isoCode: 'KR'});

    const response = await request(app)
      .post('/api/user/signup')
      .send({
        userDeviceID: 'testDeviceID',
        userUID: 'testUID',
        userPhoneNumber: '1234567890',
        dialCode: '+82', isoCode: 'KR',
        userID: 'testUserID',
        userPassword: 'testPassword',
        userProfileImage: null,
        userNickName: 'testNickName',
        userGender: 'private',
        userBirthDate: '2000-01-01',
      });

    expect(response.status).toBe(400);
  });

  it('이미 TempUserID에 등록된 아이디로 회원가입 요청을 보낸 경우, userUID가 다르다면 사용 불가 응답을 반환해야 한다.', async () => {
    await TempUserID.create({ userUID: 'anotherUID', userID: 'testUserID' });

    const response = await request(app)
      .post('/api/user/signup')
      .send({
        userDeviceID: 'testDeviceID',
        userUID: 'testUID',
        userPhoneNumber: '1234567890',
        dialCode: '+82', isoCode: 'KR',
        userID: 'testUserID',
        userPassword: 'testPassword',
        userProfileImage: null,
        userNickName: 'testNickName',
        userGender: 'private',
        userBirthDate: '2000-01-01',
      });

    expect(response.status).toBe(400);
  });

  it ('이미 SignupUser에 등록된 정보로 회원가입 요청을 보낸 경우, 사용 불가 응답을 반환해야 한다.', async () => {
    await request(app)
      .post('/api/user/signup')
      .send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });

    const response = await request(app)
      .post('/api/user/signup')
      .send({
        userDeviceID: 'testDeviceID',
        userUID: 'testUID',
        userPhoneNumber: '1234567890',
        dialCode: '+82', isoCode: 'KR',
        userID: 'testUserID',
        userPassword: 'testPassword',
        userProfileImage: null,
        userNickName: 'testNickName',
        userGender: 'private',
        userBirthDate: '2000-01-01',
      });

    expect(response.status).toBe(400);
  });

  it('회원가입 요청이 정상적으로 처리되면, TempPhoneNumber, TempUserID에 저장된 정보가 삭제되어야 한다.', async () => {
    await TempPhoneNumber.create({ userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890' , dialCode: '+82', isoCode: 'KR'});
    await TempUserID.create({ userUID: 'testUID', userID: 'testUserID' });

    const response = await request(app)
      .post('/api/user/signup')
      .send({
        userDeviceID: 'testDeviceID',
        userUID: 'testUID',
        userPhoneNumber: '1234567890',
        dialCode: '+82', isoCode: 'KR',
        userID: 'testUserID',
        userPassword: 'testPassword',
        userProfileImage: null,
        userNickName: 'testNickName',
        userGender: 'private',
        userBirthDate: '2000-01-01',
      });

    expect(response.status).toBe(200);

    const tempPhoneNumber = await TempPhoneNumber.findOne({ userPhoneNumber: '1234567890' });
    const tempUserID = await TempUserID.findOne({ userID: 'testUserID' });

    expect(tempPhoneNumber).toBeNull();
    expect(tempUserID).toBeNull();
  });

  it('회원가입 요청 시, 사용자 정보 중 민감한 정보는 해시화되어 저장되어야 한다.', async () => {
    const response = await request(app)
      .post('/api/user/signup')
      .send({
        userDeviceID: 'testDeviceID',
        userUID: 'testUID',
        userPhoneNumber: '1234567890',
        dialCode: '+82', isoCode: 'KR',
        userID: 'testUserID',
        userPassword: 'testPassword',
        userProfileImage: null,
        userNickName: 'testNickName',
        userGender: 'private',
        userBirthDate: '2000-01-01',
      });

    expect(response.status).toBe(200);

    const user = await SignupUser.findOne({ userID: 'testUserID' });

    expect(user).not.toBeNull();
    expect(user.userPassword).not.toBe('testPassword');
    expect(await comparePassword('testPassword', user.userPassword)).toBe(true);
  });
});

describe('loginUser', () => {
  it('등록된 사용자 정보로 로그인 요청을 보낸 경우, 로그인이 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });

    const response = await request(app).post('/api/user/login').send({ userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword: 'test' });

    expect(response.status).toBe(200);
  });

  it('등록되지 않은 사용자 정보로 로그인 요청을 보낸 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/login').send({ userPhoneNumber
      : '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword: 'test' });

    expect(response.status).toBe(400);
  });

  it('비밀번호가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/login').send({ userPhoneNumber : '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test' });
  });

  it('아이디 또는 전화번호가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/login').send({ userPassword: 'test' });

    expect(response.status).toBe(400);
  });

  it('아이디와 비밀번호만으로 로그인 요청을 보낸 경우, 로그인이 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });

    const response = await request(app).post('/api/user/login').send({ userID: 'test', userPassword: 'test' });

    expect(response.status).toBe(200);
  });

  it('전화번호와 비밀번호만으로 로그인 요청을 보낸 경우, 로그인이 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });

    const response = await request(app).post('/api/user/login').send({ userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userPassword: 'test' });

    expect(response.status).toBe(200);
  });
});

describe('withdrawUser', () => {
  it('등록된 사용자 정보로 탈퇴 요청을 보낸 경우, 탈퇴가 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });

    const response = await request(app).post('/api/user/withdraw').send({ userID: 'test', userPassword: 'test' });

    expect(response.status).toBe(200);
  });

  it('등록된 사용자 정보로 탈퇴 요청을 보낸 경우, 탈퇴 후 사용자 정보가 삭제되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });

    await request(app).post('/api/user/withdraw').send({ userID: 'test', userPassword: 'test' });

    const user = await SignupUser.findOne({ userID: 'test' });

    expect(user).toBeNull();
  });

  it('등록되지 않은 사용자 정보로 탈퇴 요청을 보낸 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/withdraw').send({ userID: 'test', userPassword: 'test' });

    expect(response.status).toBe(400);
  });

  it('비밀번호가 없는 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/withdraw').send({ userID: 'test' });

    expect(response.status).toBe(400);
  });
});

describe('update-user-password', () => {
  it('등록된 사용자 정보로 비밀번호 수정 요청을 보낸 경우, 비밀번호 수정이 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });

    const response = await request(app).post('/api/user/update-user-password').send({ userID: 'test', oldPassword: 'test', newPassword: 'newTest' });

    expect(response.status).toBe(200);

    const user = await SignupUser.findOne({ userID: 'test' });

    expect(await comparePassword('newTest', user.userPassword)).toBe(true);
  });

  it('등록되지 않은 사용자 정보로 비밀번호 수정 요청을 보낸 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/update-user-password').send({ userID: 'test', oldPassword: 'test', newPassword: 'newTest' });

    expect(response.status).toBe(400);
  });

  it('기존 비밀번호가 일치하지 않는 경우, 에러 응답을 반환해야 한다.', async () => {
    await request(app).post('/api/user/signup').send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });

    const response = await request(app).post('/api/user/update-user-password').send({ userID: 'test', oldPassword: 'wrongPassword', newPassword: 'newTest' });

    expect(response.status).toBe(400);
  });
});

describe('update-user-info', () => {
  it('등록된 사용자 정보로 정보 수정 요청을 보낸 경우, 정보 수정이 정상적으로 처리되어야 한다.', async () => {
    await request(app).post('/api/user/signup').send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });

    const userBeforeUpdate = await SignupUser.findOne({ userID: 'test' });


    // 요청에선 항상 userModel의 모든 필드를 전달해야 한다.
    const response = await request(app).post('/api/user/update-user-info').send({userUUID: userBeforeUpdate.userUUID, userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: 'myknow', userGender: 'man', userBirthDate: '2000-01-01' });

    expect(response.status).toBe(200);
    expect(response.body.failureReason).toBeUndefined();

    const user = await SignupUser.findOne({ userID: 'test' });

    expect(user).not.toBeNull();
    expect(user.userNickName).toBe('myknow');
    expect(user.userGender).toBe('man');
  });

  it('등록되지 않은 사용자 정보로 정보 수정 요청을 보낸 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/update-user-info').send({ userID: 'test', userPassword: 'test', userNickName: 'newNickName', userGender: 'public', userBirthDate: '2000-01-01' });

    expect(response.status).toBe(400);
    expect(response.body.failureReason).toBe(FailureReason.USER_NOT_FOUND);
  });

  it('비밀번호가 일치하지 않는 경우, 에러 응답을 반환해야 한다.', async () => {
    const response = await request(app).post('/api/user/signup').send({ userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber: '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'test', userProfileImage: null, userNickName: '', userGender: 'private', userBirthDate: '2000-01-01' });
    expect(response.status).toBe(200);

    const userBeforeUpdate = await SignupUser.findOne({ userID: 'test' });

    const result = await request(app).post('/api/user/update-user-info').send({ userUUID:userBeforeUpdate.userUUID,  userUID:'testUID', userDeviceID: 'testDeviceID', userPhoneNumber : '1234567890', dialCode: '+82', isoCode: 'KR', userID: 'test', userPassword : 'testAnotherPassword', userProfileImage: null, userNickName: 'myknow', userGender: 'private', userBirthDate: '2000-01-01' });

    expect(result.status).toBe(400);
    expect(result.body.failureReason).toBe(FailureReason.PASSWORD_NOT_MATCH);

    // 변경되지 않았는지 확인
    const user = await SignupUser.findOne({ userID: 'test' });

    expect(user).not.toBeNull();
    expect(user.userNickName).toBe('');
  });
});