// controllers/userController.js

const { v4: uuidv4 } = require('uuid'); // UUID 생성을 위한 라이브러리 불러오기

// 필요한 모델 불러오기
const TempPhoneNumber = require('../models/tempPhoneNumberModel');  // 임시로 전화번호를 저장하는 모델
const TempUserID = require('../models/tempUserIDModel');        // 임시로 아이디를 저장하는 모델
const { SignupUser } = require('../models/userModel');           // 최종적으로 사용자 정보를 저장하는 모델
const { hashPassword, comparePassword } = require('../utils/crypto');        // 비밀번호 해시화 함수 불러오기
const { FailureReason } = require('../models/responseModel');        // 응답 실패 이유 불러오기

const { getPolicyContentFunction } = require('./policyController');  // 이용 약관 내용 조회 함수 불러오기
const { Policy, PolicyType, CountryType, isValidCountryType, isValidVersion } = require('../models/policyModel'); // 이용 약관 모델 불러오기

/** # 전화번호 중복 확인 API
 * 
 * ## Parameters
 * @param {string} req.body.userDeviceID - 사용자 기기 ID
 * @param {string} req.body.userPhoneNumber - 사용자 전화번호
 * @param {string} req.body.dialCode - 국가 전화번호 코드
 * @param {string} req.body.isoCode - 국가 코드
 * 
 * ## Returns
 * @returns {object} 200 - isAvailable: 사용 가능 여부, isAlreadyRegistered: 이미 등록된 전화번호인지 여부, message: 응답 메시지
 * @returns {Error} 400 - isAvailable: false, failureReason: 사용 불가 이유, message: 응답 메시지
 * @returns {Error} 500 - isAvailable: false, failureReason: SERVER_ERROR
 * 
 */
exports.checkPhoneNumberAvailable = async (req, res) => {
  const { userDeviceID, userPhoneNumber, dialCode, isoCode } = req.body;  // 요청 본문에서 userDeviceID와 전화번호를 가져옴

  // console.log("/api/user/check-phonenumber-available 요청 (NODE_ENV : %s)", process.env.NODE_ENV);


  // checkPhoneNumberAvailableFunction 함수 실행
  const result = await checkPhoneNumberAvailableFunction(userDeviceID, userPhoneNumber, dialCode, isoCode );

  // 결과에 따라 응답
  if (result.isAvailable) {
    if (result.isAlreadyRegistered) {
      return res.status(200).json({ isAvailable: true, isAlreadyRegistered: true, message: '해당 전화번호는 사용 가능하나, 본인이 사용 중입니다.' });
    }
    return res.status(200).json({ isAvailable: true, isAlreadyRegistered: false, message: '해당 전화번호는 사용 가능합니다.' });
  } else {
    if (result.error) {
      return res.status(500).json({ isAvailable: false, failureReason: FailureReason.SERVER_ERROR });
    }
    return res.status(400).json({ isAvailable: false, message: result.message });
  }
};

/** # 전화번호 중복 확인 및 저장 함수
 * 
 * ## Parameters
 * @param {string} userDeviceID - 사용자 기기 ID
 * @param {string} userPhoneNumber - 사용자 전화번호
 * @param {string} dialCode - 국가 전화번호 코드
 * @param {string} isoCode - 국가 코드
 * 
 * ## Returns
 * @returns {object} isAvailable: 사용 가능 여부, isAlreadyRegistered: 이미 등록된 전화번호인지 여부, message: 응답 메시지
 */
async function checkPhoneNumberAvailableFunction(userDeviceID, userPhoneNumber, dialCode, isoCode ) {
  try {
    // 전화번호 유효성 검사
    if (!userPhoneNumber || userPhoneNumber.trim() === '') {
      // console.log('전화번호가 없음');
      return { isAvailable: false, message: '전화번호를 입력해주세요.' };
    }

    // userDeviceID 유효성 검사
    if (!userDeviceID || userDeviceID.trim() === '') {
      // console.log('userDeviceID가 없음');
      return {isAvailable: false, message: '사용자 정보가 없습니다.'};
    }

    // dialCode 유효성 검사
    if (!dialCode || dialCode.trim() === '') {
      // console.log('dialCode가 없음');
      return {isAvailable: false, message: '국가 코드를 입력해주세요.'};
    }

    // 임시 저장소(TempPhoneNumber)에서 전화번호(dialcode와 조합됨)가 이미 존재하는지 확인
    const tempPhoneNumber = await TempPhoneNumber.findOne({ userPhoneNumber: userPhoneNumber, dialCode: dialCode, isoCode: isoCode });
    
    // 최종 사용자 DB(SignupUser)에서 해당 전화번호가 이미 존재하는지 확인
    const user = await SignupUser.findOne({ userPhoneNumber: userPhoneNumber, dialCode: dialCode, isoCode: isoCode });

    // 각 저장소에 동일한 전화번호가 존재하지 않는 경우, 사용 가능한 전화번호로 판단하여 임시 저장소에 저장
    if (!tempPhoneNumber && !user) {
      // console.log('전화번호 사용 가능 : (최초 등록)');
      // 임시 저장소에 사용자 정보 저장 (10분 후 자동 삭제)
      await TempPhoneNumber.create({ userDeviceID: userDeviceID, userPhoneNumber: userPhoneNumber, dialCode: dialCode, isoCode : isoCode });
      // 응답
      return { isAvailable: true, isAlreadyRegistered: false, message: '해당 전화번호는 사용 가능합니다.' };
    }
    // 각 저장소에 동일한 전화번호가 있고, 그 전화번호가 현재 요청한 사용자의 userDeviceID와 같은 경우, 사용 가능한 전화번호로 판단
    else if ((tempPhoneNumber && tempPhoneNumber.userDeviceID === userDeviceID)) {
      // console.log('전화번호 사용 가능 : (이미 가등록된 전화번호)');
      return { isAvailable: true, isAlreadyRegistered: false, message: '해당 전화번호는 사용 가능합니다.' };
    }
    else if ((user && user.userDeviceID === userDeviceID)) {
      // console.log('전화번호 사용 가능 : (이미 등록된 전화번호)');
      return { isAvailable: true, isAlreadyRegistered: true, message: '해당 전화번호는 사용 가능합니다.' };
    }
    // 각 저장소에 동일한 전화번호가 있고, 그 전화번호가 현재 요청한 사용자의 userDeviceID와 다른 경우, 사용 불가능한 전화번호로 판단
    else {
      // console.log('전화번호 사용 불가');
      return { isAvailable: false, isAlreadyRegistered: true, message: '해당 전화번호는 이미 사용 중입니다.' };
    }
  } catch (error) {
    // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
    console.error('전화번호 조회 중 오류 발생:', error);
    return { error: '서버 오류' };
  }
}

/** # 아이디 중복 확인 API
 * 
 * ## Parameters
 * @param {string} req.body.userUID - 사용자 UID
 * @param {string} req.body.userID - 사용자 아이디
 * 
 * ## Returns
 * @returns {object} 200 - isAvailable: 사용 가능 여부, message: 응답 메시지
 * @returns {Error} 400 - isAvailable: false, failureReason: 사용 불가 이유, message: 응답 메시지
 * @returns {Error} 500 - isAvailable: false, failureReason: SERVER_ERROR
 * 
 */
exports.checkUserIDAvailable = async (req, res) => {
  const { userUID, userID } = req.body;

  // console.log("/api/user/check-userid-available 요청 (NODE_ENV : %s)", process.env.NODE_ENV);


  // checkUserIDAvailableFunction 함수 실행
  const result = await checkUserIDAvailableFunction(userUID, userID);

  // 결과에 따라 응답
  if (result.isAvailable) {
    return res.status(200).json({ isAvailable: true, message: '해당 아이디은 사용 가능합니다.' });
  } else {
    if (result.error) {
      return res.status(500).json({ isAvailable: false, failureReason: FailureReason.SERVER_ERROR });
    }
    return res.status(400).json({ isAvailable: false, message: result.message });
  }
}

/** # 아이디 중복 확인 및 저장 함수
 * 
 * ## Parameters
 * @param {string} userUID - 사용자 UID
 * @param {string} userID - 사용자 아이디
 * 
 * ## Returns
 * @returns {object} isAvailable: 사용 가능 여부
 * @returns {object} isAlreadyRegistered: 이미 등록된 아이디인지 여부
 * @returns {object} message: 응답 메시지
 * 
 */
async function checkUserIDAvailableFunction(userUID, userID) {
  try {
    // 아이디 유효성 검사
    if (!userID || userID.trim() === '') {
      // console.log('아이디가 없음');
      return { isAvailable: false, message: '아이디를 입력해주세요.' };
    }

    // userUID 유효성 검사
    if (!userUID || userUID.trim() === '') {
      // console.log('userUID가 없음');
      return {isAvailable: false, message: '사용자 정보가 없습니다.'};
    }

    // 임시 저장소(TempUserID)에서 해당 아이디가 이미 존재하는지 확인
    const tempUserID = await TempUserID.findOne({ userID: userID });

    // 최종 사용자 DB(SignupUser)에서 해당 아이디가 이미 존재하는지 확인
    const user = await SignupUser.findOne({ userID: userID });

    // 각 저장소에 동일한 아이디가 존재하지 않는 경우, 사용 가능한 아이디으로 판단하여 임시 저장소에 저장
    if (!tempUserID && !user) {
      // console.log('아이디 사용 가능 : (최초 등록)');
      // 임시 저장소에 사용자 정보 저장 (10분 후 자동 삭제)
      await TempUserID.create({ userUID: userUID, userID: userID });
      // 응답
      return { isAvailable: true, isAlreadyRegistered: false, message: '해당 아이디은 사용 가능합니다.' };
    }
    // 각 저장소에 동일한 아이디가 있고, 그 아이디가 현재 요청한 사용자의 UID와 같은 경우, 사용 가능한 아이디으로 판단
    else if ((tempUserID && tempUserID.userUID === userUID)) {
      // console.log('아이디 사용 가능 : (이미 가등록된 아이디)');
      return { isAvailable: true,isAlreadyRegistered: false,  message: '해당 아이디은 사용 가능합니다.' };
    } else if ((user && user.userUID === userUID)) {
      // console.log('아이디 사용 가능 : (이미 등록된 아이디)');
      return { isAvailable: true,isAlreadyRegistered: true,  message: '해당 아이디은 사용 가능합니다.' };
    }
    // 각 저장소에 동일한 아이디가 있고, 그 아이디가 현재 요청한 사용자의 UID와 다른 경우, 사용 불가능한 아이디으로 판단
    else {
      // console.log('아이디 사용 불가');
      return { isAvailable: false, isAlreadyRegistered: true, message: '해당 아이디은 이미 사용 중입니다.' };
    }
  } catch (error) {
    // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
    console.error('아이디 조회 중 오류 발생:', error);
    return { error: '서버 오류' };
  }
}

/** # 사용자 회원가입 API
 * 
 * ## Parameters
 * @param {string} req.body.userDeviceID - 사용자 기기 ID
 * @param {string} req.body.userUID - 사용자 UID
 * @param {string} req.body.userPhoneNumber - 사용자 전화번호
 * @param {string} req.body.dialCode - 국가 전화번호 코드
 * @param {string} req.body.isoCode - 국가 코드
 * @param {string} req.body.userID - 사용자 아이디
 * @param {string} req.body.userPassword - 사용자 비밀번호
 * @param {string} req.body.userProfileImage - 사용자 프로필 이미지
 * @param {string} req.body.userNickName - 사용자 닉네임
 * @param {string} req.body.userGender - 사용자 성별
 * @param {string} req.body.userBirthDate - 사용자 생년월일
 * @param {string} req.body.termsVersion - 약관 버전
 * @param {string} req.body.privacyVersion - 개인정보 처리방침 버전
 * 
 * ## Returns
 * @returns {object} 200 - isSuccess: true
 * @returns {Error} 400 - isSuccess: false, failureReason: 사용 불가 이유, message: 응답 메시지
 * @returns {Error} 500 - isSuccess: false
 * 
 */
exports.signupUser = async (req, res) => {
  const {userDeviceID, userUID, userPhoneNumber, dialCode, isoCode, userID, userPassword, userProfileImage, userNickName, userGender, userBirthDate, termsVersion, privacyVersion } = req.body;

  try {
    // checkPhoneNumberAvailable과 checkUserIDAvailable를 이용해서 전화번호와 아이디 중복 여부를 재확인
    const phoneCheck = await checkPhoneNumberAvailableFunction(userDeviceID, userPhoneNumber, dialCode, isoCode);
    const idCheck = await checkUserIDAvailableFunction(userUID, userID);

    // 필수 정보 누락 시, 사용자 정보가 없다고 응답
    // userDeviceID, userUID, userPassword, userNickName
    if (!userDeviceID || userDeviceID.trim() === '' || !userUID || userUID.trim() === '' || !userPassword || userPassword.trim() === '' || !userNickName || userNickName.trim() === '' ) {
      // console.log('사용자 정보 없음');
      return res.status(400).json({ isSuccess: false, failureReason: FailureReason.USER_SIGNUP_INFO_EMPTY, message: '사용자 필수 정보가 누락되었습니다.' });
    }

    // checkPhoneNumberAvailable와 checkUserIDAvailable 모두 사용 가능한 경우에만 회원가입 진행
    if ((phoneCheck.isAvailable && !phoneCheck.isAlreadyRegistered)&& (idCheck.isAvailable && !idCheck.isAlreadyRegistered)) {
      // 비밀번호 해시화
      const hashedPassword = await hashPassword(userPassword);

      let termsSignUpVersion = null;
      // termsVersion, privacyVersion이 없는 경우, 가장 최신 버전으로 설정
      if (!termsVersion || termsVersion.trim() === '' || !isValidVersion(termsVersion)) {
        termsContent = null;

        // 국가 코드가 KR인 경우, 한국어 약관 버전 조회
        if (isoCode === 'KR' || dialCode === '+82') {
          // termsContent의 자료형은 Policy 객체이므로, version 필드를 termsVersion에 저장
          termsContent = await getPolicyContentFunction(PolicyType.TermsOfService, null, CountryType.KR);
        } else {
          termsContent = await getPolicyContentFunction(PolicyType.TermsOfService, null, CountryType.US);
        }

        if (termsContent) {
          termsSignUpVersion = termsContent.version;
        } else {
          // console.log('사용자 정보 저장 실패 : 약관 버전 조회 실패');
          return res.status(400).json({ isSuccess: false, failureReason: FailureReason.TERMS_VERSION_NOT_AVAILABLE, message: '약관 버전을 조회할 수 없습니다.' });
        }
      } else {
        termsSignUpVersion = termsVersion;
      }

      let privacySignUpVersion = null;
      if (!privacyVersion || privacyVersion.trim() === '' || !isValidVersion(privacyVersion)) {
        privacyContent = null;

        // 국가 코드가 KR인 경우, 한국어 개인정보 처리방침 버전 조회
        if (isoCode === 'KR' || dialCode === '+82') {
          // privacyContent의 자료형은 Policy 객체이므로, version 필드를 privacyVersion에 저장
          privacyContent = await getPolicyContentFunction(PolicyType.PrivacyPolicy, null, CountryType.KR);
        } else {
          privacyContent = await getPolicyContentFunction(PolicyType.PrivacyPolicy, null, CountryType.US);
        }

        if (privacyContent) {
          privacySignUpVersion = privacyContent.version;
        } else {
          // console.log('사용자 정보 저장 실패 : 개인정보 처리방침 버전 조회 실패');
          return res.status(400).json({ isSuccess: false, failureReason: FailureReason.PRIVACY_VERSION_NOT_AVAILABLE, message: '개인정보 처리방침 버전을 조회할 수 없습니다.' });
        }
      } else {
        privacySignUpVersion = privacyVersion;
      }

      // 사용자 정보 저장
      await SignupUser.create({
        userUUID: uuidv4(),
        userDeviceID: userDeviceID,
        userUID: userUID,
        userPhoneNumber: userPhoneNumber,
        dialCode: dialCode,
        isoCode: isoCode,
        userID: userID,
        userPassword: hashedPassword,
        userProfileImage: userProfileImage,
        userNickName: userNickName,
        userGender: userGender,
        userBirthDate: userBirthDate,
        termsVersion: termsSignUpVersion,
        privacyVersion: privacySignUpVersion,
      });

      // console.log('사용자 정보 저장 완료');
      // 임시 저장소에 저장된 사용자 정보 삭제
      await TempPhoneNumber.deleteOne({ userPhoneNumber: userPhoneNumber });
      await TempUserID.deleteOne({ userID: userID });

      return res.status(200).json({ isSuccess: true });
    }
    else if  (!phoneCheck.isAvailable) {
      // console.log('사용자 정보 저장 실패 : 중복된 전화번호 또는 아이디');
      return res.status(400).json({ isSuccess: false, failureReason: FailureReason.PHONENUMBER_NOT_AVAILABLE, message: '해당 전화번호는 이미 사용 중입니다.' });
    } else if (!idCheck.isAvailable) {
      // console.log('사용자 정보 저장 실패 : 중복된 아이디');
      return res.status(400).json({ isSuccess: false, failureReason: FailureReason.USER_ID_NOT_AVAILABLE, message: '해당 아이디는 이미 사용 중입니다.' });
    } else {
      // console.log('사용자 정보 저장 실패 : 중복된 전화번호 또는 아이디');
      return res.status(400).json({ isSuccess: false, failureReason: FailureReason.PHONENUMBER_NOT_AVAILABLE, message: '해당 전화번호는 이미 사용 중입니다.' });
    }
  } catch (error) {
    // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
    console.error('회원가입 중 오류 발생:', error);
    return res.status(500).json({ isSuccess: false });
  }
}

/** # 사용자 로그인 API
 * 
 * ## Parameters
 * 
 * @param {string} req.body.userPhoneNumber - 사용자 전화번호
 * @param {string} req.body.dialCode - 국가 전화번호 코드
 * @param {string} req.body.isoCode - 국가 코드
 * @param {string} req.body.userID - 사용자 아이디
 * @param {string} req.body.userPassword - 사용자 비밀번호
 * @param {string} req.body.userDeviceID - 사용자 기기 ID
 * 
 * ## Returns
 * @returns {object} 200 - userInfo: 사용자 정보
 * @returns {Error} 400 - failureReason: 사용 불가 이유, message: 응답 메시지
 * @returns {Error} 500 - failureReason: SERVER_ERROR
 * 
 */
exports.loginUser = async (req, res) => {
  const { userPhoneNumber, dialCode, isoCode, userID, userPassword, userDeviceID } = req.body;

  // console.log("/api/user/login 요청 (NODE_ENV : %s)", process.env.NODE_ENV);

  try {
    // 전화번호와 아이디가 둘 다 없는 경우, 사용자 정보가 없다고 응답
    if ((!userPhoneNumber || userPhoneNumber.trim() === '') && (!userID || userID.trim() === '')) {
      // console.log('사용자 정보 없음');
      return res.status(400).json({ failureReason: FailureReason.USER_LOGIN_INFO_EMPTY, message: '사용자 정보가 없습니다.' });
    }

    // 비밀번호가 없는 경우, 비밀번호를 입력해달라고 응답
    if (!userPassword || userPassword.trim() === '') {
      // console.log('비밀번호가 없음');
      return res.status(400).json({ failureReason: FailureReason.PASSWORD_EMPTY, message: '비밀번호를 입력해주세요.' });
    }

    user = null;

    // 둘 중 하나만 있는 경우, 해당 정보로 사용자 정보 조회
    if (userPhoneNumber && userPhoneNumber.trim() !== '' && dialCode && dialCode.trim() !== '') {
       user = await SignupUser.findOne({ userPhoneNumber: userPhoneNumber, dialCode: dialCode, isoCode: isoCode });
    }
    else {
       user = await SignupUser.findOne({ userID: userID });
    }


    // 사용자 정보가 없는 경우, 사용자 정보가 없다고 응답
    if (!user) {
      // console.log('사용자 정보 없음');
      return res.status(400).json({ failureReason: FailureReason.USER_NOT_FOUND, message: '사용자 정보가 없습니다.' });
    }

    // 비밀번호 비교
    // console.log('비밀번호 비교 시작');
    const match = await comparePassword(userPassword, user.userPassword);

    // 비밀번호가 일치하는 경우, 로그인 성공. 유저 정보 일부를 응답
    if (match) {
      // console.log('로그인 성공');
      // 마지막 로그인 시간과 장치 ID 업데이트
      await SignupUser.updateOne({ userID: user.userID }, { lastLoginAt: Date.now(), userDeviceID: userDeviceID });

      // user에서 password 필드만 제거한 객체를 생성하여 응답
      const { userPassword, ...userInfo } = user._doc;
      return res.status(200).json({ userInfo });
    } else {
      // console.log('비밀번호 불일치');
      return res.status(400).json({ failureReason: FailureReason.PASSWORD_NOT_MATCH, message: '비밀번호가 일치하지 않습니다.' });
    }
  } catch (error) {
    // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
    console.error('로그인 중 오류 발생:', error);
    return res.status(500).json({ failureReason: FailureReason.SERVER_ERROR, message: '서버 오류' });
  }
}

/** # 사용자 탈퇴 API
 * 
 * ## Parameters
 * @param {string} req.body.userID - 사용자 아이디
 * @param {string} req.body.userPassword - 사용자 비밀번호
 * 
 * ## Returns
 * @returns {object} 200 - isSuccess: true
 * @returns {Error} 400 - failureReason: 사용 불가 이유, message: 응답 메시지
 * @returns {Error} 500 - failureReason: SERVER_ERROR
 * 
 */
exports.withdrawUser = async (req, res) => {
  const {  userID, userPassword } = req.body;

  // console.log("/api/user/withdraw 요청 (NODE_ENV : %s)", process.env.NODE_ENV);

  try {
    const user = await SignupUser.findOne({ userID: userID });

    // 사용자 정보가 없는 경우, 사용자 정보가 없다고 응답
    if (!user) {
      // console.log('사용자 정보 없음');
      return res.status(400).json({ isSuccess: false, failureReason: FailureReason.USER_NOT_FOUND, message: '사용자 정보가 없습니다.' });
    }

    // 비밀번호가 없는 경우, 비밀번호를 입력해달라고 응답
    if (!userPassword || userPassword.trim() === '') {
      // console.log('비밀번호가 없음');
      return res.status(400).json({ isSuccess: false, failureReason: FailureReason.PASSWORD_EMPTY, message: '비밀번호를 입력해주세요.' });
    }

    // 비밀번호 비교
    // console.log('비밀번호 비교 시작');
    const match = await comparePassword(userPassword, user.userPassword);

    // 비밀번호가 일치하는 경우, 탈퇴 성공
    if (match) {
      // console.log('탈퇴 성공');
      await SignupUser.deleteOne({ userID: userID });
      return res.status(200).json({ isSuccess: true });
    } else {
      // console.log('비밀번호 불일치');
      return res.status(400).json({ isSuccess: false, failureReason: FailureReason.PASSWORD_NOT_MATCH, message: '비밀번호가 일치하지 않습니다.' });
    }
  } catch (error) {
    // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
    console.error('탈퇴 중 오류 발생:', error);
    return res.status(500).json({ isSuccess: false, failureReason: FailureReason.SERVER_ERROR, message: '서버 오류' });
  }
}

/** # 사용자 비밀번호 수정 API
 * 
 * ## Parameters
 * @param {string} req.body.userID - 사용자 아이디
 * @param {string} req.body.oldPassword - 기존 비밀번호
 * @param {string} req.body.newPassword - 새 비밀번호
 * 
 * ## Returns
 * @returns {object} 200 - isSuccess: true
 * @returns {Error} 400 - failureReason: 사용 불가 이유, message: 응답 메시지
 * @returns {Error} 500 - failureReason: SERVER_ERROR
 */
exports.updateUserPassword = async (req, res) => {
  const { userID, oldPassword, newPassword } = req.body;

  // console.log("/api/user/update-user-password 요청 (NODE_ENV : %s)", process.env.NODE_ENV);

  try {
    const user = await SignupUser.findOne({ userID: userID });

    if (!user) {
      // console.log('사용자 정보 없음');
      return res.status(400).json({ isSuccess: false, failureReason: FailureReason.USER_NOT_FOUND, message: '사용자 정보가 없습니다.' });
    }

    // 비밀번호가 없는 경우, 비밀번호를 입력해달라고 응답
    if (!oldPassword || oldPassword.trim() === '' || !newPassword || newPassword.trim() === '') {
      // console.log('비밀번호가 없음');
      return res.status(400).json({ isSuccess: false, failureReason: FailureReason.PASSWORD_EMPTY, message: '비밀번호를 입력해주세요.' });
    }

    // 비밀번호 비교
    // console.log('비밀번호 비교 시작');
    const match = await comparePassword(oldPassword, user.userPassword);

    // 비밀번호가 일치하는 경우, 비밀번호 수정
    if (match) {
      // console.log('비밀번호 수정 시작');
      const hashedPassword = await hashPassword(newPassword);
      await SignupUser.updateOne({ userID: userID }, { userPassword: hashedPassword });
      return res.status(200).json({ isSuccess: true });
    } else {
      // console.log('비밀번호 불일치');
      return res.status(400).json({ isSuccess: false, failureReason: FailureReason.PASSWORD_NOT_MATCH, message: '비밀번호가 일치하지 않습니다.' });
    }
  } catch (error) {
    // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
    console.error('비밀번호 수정 중 오류 발생:', error);
    return res.status(500).json({ isSuccess: false, failureReason: FailureReason.SERVER_ERROR, message: '서버 오류' });
  }
}

/** # 사용자 비밀번호 초기화 API
 * 
 * ## Parameters
 * @param {string} req.body.userUID - 사용자 UID
 * @param {string} req.body.newPassword - 새 비밀번호
 * 
 * ## Returns
 * @returns {object} 200 - isSuccess: true
 * @returns {Error} 400 - failureReason: 사용 불가 이유, message: 응답 메시지
 * @returns {Error} 500 - failureReason: SERVER_ERROR
 */
exports.resetUserPassword = async (req, res) => {
  const {userUID, newPassword } = req.body;

  // console.log("/api/user/reset-user-password 요청 (NODE_ENV : %s)", process.env.NODE_ENV);

  try {
    const user = await SignupUser.findOne({ userUID: userUID });

    if (!user) {
      // console.log('사용자 정보 없음');
      return res.status(400).json({ failureReason: FailureReason.USER_UID_EMPTY, message: '사용자 정보가 없습니다.' });
    }

    // 비밀번호가 없는 경우, 비밀번호를 입력해달라고 응답
    if (!newPassword || newPassword.trim() === '') {
      // console.log('비밀번호가 없음');
      return res.status(400).json({ failureReason: FailureReason.PASSWORD_EMPTY, message: '비밀번호를 입력해주세요.' });
    }

    // console.log('비밀번호 수정 시작');

    const hashedPassword = await hashPassword(newPassword);

    await SignupUser.updateOne({ userUID: userUID }, { userPassword: hashedPassword });

    return res.status(200).json({ isSuccess: true });

  } catch (error) {
    // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
    console.error('비밀번호 수정 중 오류 발생:', error);
    return res.status(500).json({ failureReason: FailureReason.SERVER_ERROR, message: '서버 오류' });
  }
}

/** # 사용자 존재 여부 확인 API
 * 
 * ## Parameters
 * @param {string} req.body.userUID - 사용자 UID
 * 
 * ## Returns
 * @returns {object} 200 - isExists: true
 * @returns {object} 400 - isExists: false
 * @returns {Error} 500 - isExists: false
 * 
 */
exports.checkUserExists = async (req, res) => {
  const { userUID } = req.body;

  // console.log("/api/user/check-user-exists 요청 (NODE_ENV : %s)", process.env.NODE_ENV);

  try {
    const user = await SignupUser.findOne({ userUID: userUID });

    if (!user) {
      // console.log('사용자 정보 없음');
      return res.status(400).json({ isExists: false });
    }

    return res.status(200).json({ isExists: true });
  } catch (error) {
    // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
    console.error('사용자 조회 중 오류 발생:', error);
    return res.status(500).json({ isExists: false });
  }
}

/** # 사용자 정보 업데이트 API
 * 
 * ## Parameters
 * @param {string} req.body.userUUID - 사용자 UUID
 * @param {string} req.body.userProfileImage - 사용자 프로필 이미지
 * @param {string} req.body.userID - 사용자 아이디
 * @param {string} req.body.userPhoneNumber - 사용자 전화번호
 * @param {string} req.body.dialCode - 국가 전화번호 코드
 * @param {string} req.body.isoCode - 국가 코드
 * @param {string} req.body.userNickName - 사용자 닉네임
 * @param {string} req.body.userGender - 사용자 성별
 * @param {string} req.body.userBirthDate - 사용자 생년월일
 * @param {string} req.body.userPassword - 사용자 비밀번호
 * @param {string} req.body.termsVersion - 약관 버전
 * @param {string} req.body.privacyVersion - 개인정보 처리방침 버전
 * 
 * ## Returns
 * @returns {object} 200 - isSuccess: true
 * @returns {Error} 400 - failureReason: 사용 불가 이유, message: 응답 메시지
 * @returns {Error} 500 - failureReason: SERVER_ERROR
 * 
 */
exports.updateUserInfo = async (req, res) => {
  const { userUUID, userProfileImage, userID, userPhoneNumber, dialCode, isoCode, userNickName, userGender, userBirthDate, userPassword, termsVersion, privacyVersion } = req.body;

  // console.log("/api/user/update-user-info 요청 (NODE_ENV : %s)", process.env.NODE_ENV);

  try {
    const user = await SignupUser.findOne({ userUUID: userUUID });

    if (!user) {
      // console.log('사용자 정보 없음');
      return res.status(400).json({ failureReason: FailureReason.USER_NOT_FOUND, message: '사용자 정보가 없습니다.' });
    }

    // 비밀번호가 없는 경우, 비밀번호를 입력해달라고 응답
    if (!userPassword || userPassword.trim() === '') {
      // console.log('비밀번호가 없음');
      return res.status(400).json({ failureReason: FailureReason.PASSWORD_EMPTY, message: '비밀번호를 입력해주세요.' });
    }

    // 비밀번호 비교
    // console.log('비밀번호 비교 시작');

    const match = await comparePassword(userPassword, user.userPassword);

    // 비밀번호가 일치하는 경우, 사용자 정보 업데이트

    if (match) {
      // console.log('사용자 정보 업데이트 시작');

      // userID 변경 시, userID 중복 확인 필요
      if (userID !== user.userID) {
        const userCheck = await checkUserIDAvailableFunction(user.userUID, userID);
        if (!userCheck.isAvailable) {
          // console.log('아이디 사용 불가');
          return res.status(400).json({ failureReason: FailureReason.USER_ID_NOT_AVAILABLE, message: '해당 아이디는 이미 사용 중입니다.' });
        }
      }

      // 전화번호 변경 시, 전화번호 중복 확인 필요
      if (userPhoneNumber !== user.userPhoneNumber || 
        dialCode !== user.dialCode || 
        isoCode !== user.isoCode) {
        const phoneCheck = await checkPhoneNumberAvailableFunction(user.userDeviceID, userPhoneNumber, dialCode, isoCode);
        if (!phoneCheck.isAvailable) {
          // console.log('전화번호 사용 불가');
          return res.status(400).json({ failureReason: FailureReason.PHONENUMBER_NOT_AVAILABLE, message: '해당 전화번호는 이미 사용 중입니다.' });
        }
      }

      // 약관 버전 누락 또는 유효하지 않은 경우, 사용자 정보 업데이트 불가
      if (!termsVersion || termsVersion.trim() === '' || !privacyVersion || privacyVersion.trim() === '') {
        // console.log('약관 버전 누락');
        return res.status(400).json({ failureReason: FailureReason.TERMS_VERSION_EMPTY, message: '약관 버전을 입력해주세요.' });
      }
      // 현재 버전보다 같거나 높은 것으로만 업데이트 가능
      if (termsVersion < user.termsVersion || privacyVersion < user.privacyVersion) {
        // console.log('약관 버전 불일치');
        return res.status(400).json({ failureReason: FailureReason.TERMS_VERSION_NOT_MATCH, message: '약관 버전이 올바르지 않습니다.' });
      }

      // 사용자 정보 업데이트
      await SignupUser.updateOne(
        { userUUID: userUUID }, 
        { userID: userID, 
          userProfileImage: userProfileImage, 
          userPhoneNumber: userPhoneNumber, 
          dialCode: dialCode, 
          isoCode: isoCode, 
          userNickName: userNickName, 
          userGender: userGender, 
          userBirthDate: userBirthDate, 
          termsVersion: termsVersion, 
          privacyVersion: privacyVersion 
        }
      );

      return res.status(200).json({ 
        isSuccess: true 
      });
    }
    else {
      // console.log('비밀번호 불일치');
      return res.status(400).json({ 
        failureReason: FailureReason.PASSWORD_NOT_MATCH, 
        message: '비밀번호가 일치하지 않습니다.' 
      });
    }
  }
  catch (error) {
    // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
    console.error('사용자 정보 업데이트 중 오류 발생:', error);
    return res.status(500).json({ 
      failureReason: FailureReason.SERVER_ERROR, 
      message: '서버 오류' 
    });
  }
}

/** # 사용자 전화번호 변경 API
 * 
 * ## Parameters
 * @param {string} req.body.userUUID - 사용자 UUID
 * @param {string} req.body.userUID - 사용자 UID
 * @param {string} req.body.userPhoneNumber - 사용자 전화번호
 * @param {string} req.body.dialCode - 국가 전화번호 코드
 * @param {string} req.body.isoCode - 국가 코드
 * @param {string} req.body.userPassword - 사용자 비밀번호
 * 
 * ## Returns
 * @returns {object} 200 - isSuccess: true
 * @returns {Error} 400 - failureReason: 사용 불가 이유, message: 응답 메시지
 * @returns {Error} 500 - failureReason: SERVER_ERROR
 * 
 */
exports.updateUserPhoneNumber = async (req, res) => {
  const { userUUID, userUID, userPhoneNumber, dialCode, isoCode, userPassword } = req.body;

  // console.log("/api/user/update-user-phonenumber 요청 (NODE_ENV : %s)", process.env.NODE_ENV);

  try {
    const user = await SignupUser.findOne({ userUUID: userUUID });

    if (!user) {
      // console.log('사용자 정보 없음');
      return res.status(400).json({ failureReason: FailureReason.USER_NOT_FOUND, message: '사용자 정보가 없습니다.' });
    }

    // 비밀번호가 없는 경우, 비밀번호를 입력해달라고 응답
    if (!userPassword || userPassword.trim() === '') {
      // console.log('비밀번호가 없음');
      return res.status(400).json({ failureReason: FailureReason.PASSWORD_EMPTY, message: '비밀번호를 입력해주세요.' });
    }

    // 비밀번호 비교
    // console.log('비밀번호 비교 시작');

    const match = await comparePassword(userPassword, user.userPassword);

    // 비밀번호가 일치하는 경우, 전화번호 변경
    if (match) {
      // console.log('전화번호 변경 시작');

      // 전화번호 중복 확인
      const phoneCheck = await checkPhoneNumberAvailableFunction(user.userDeviceID, userPhoneNumber, dialCode, isoCode);
      if (!phoneCheck.isAvailable) {
        // console.log('전화번호 사용 불가');
        return res.status(400).json({ failureReason: FailureReason.PHONENUMBER_NOT_AVAILABLE, message: '해당 전화번호는 이미 사용 중입니다.' });
      }

      // 사용자 정보 업데이트
      await SignupUser.updateOne({ userUUID: userUUID }, { userPhoneNumber: userPhoneNumber, dialCode: dialCode, isoCode: isoCode, userUID: userUID });

      return res.status(200).json({ isSuccess: true });
    }
    else {
      // console.log('비밀번호 불일치');
      return res.status(400).json({ failureReason: FailureReason.PASSWORD_NOT_MATCH, message: '비밀번호가 일치하지 않습니다.' });
    }
  } catch (error) {
    // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
    console.error('전화번호 변경 중 오류 발생:', error);
    return res.status(500).json({ failureReason: FailureReason.SERVER_ERROR, message: '서버 오류' });
  }
}
    