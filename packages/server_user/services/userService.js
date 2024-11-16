// service/userService.js

const TempPhoneNumber = require('../models/tempPhoneNumberModel');  // 임시로 전화번호를 저장하는 모델
const TempUserID = require('../models/tempUserIDModel');        // 임시로 아이디를 저장하는 모델
const { SignupUser } = require('../../shared-models/userModel');           // 최종적으로 사용자 정보를 저장하는 모델

/** # 전화번호 중복 확인 및 저장 함수
 * 
 * ## Parameters
 * @param {string} userDeviceID 사용자 기기 ID
 * @param {string} userPhoneNumber 사용자 전화번호
 * @param {string} dialCode 국가 전화번호 코드
 * @param {string} isoCode 국가 코드
 * 
 * ## Returns
 * @returns {object} isAvailable: 사용 가능 여부
 * @returns {object} isAlreadyRegistered: 이미 등록된 전화번호인지 여부
 * @returns {object} message: 응답 메시지
 * @returns {object} error: 오류 메시지
 */
async function checkPhoneNumberAvailableService(userDeviceID, userPhoneNumber, dialCode, isoCode ) {
    try {
      // 전화번호 유효성 검사
      if (!userPhoneNumber || userPhoneNumber.trim() === '') {
        return { isAvailable: false, message: '전화번호를 입력해주세요.' };
      }
  
      // userDeviceID 유효성 검사
      if (!userDeviceID || userDeviceID.trim() === '') {
        return {isAvailable: false, message: '사용자 정보가 없습니다.'};
      }
  
      // dialCode 유효성 검사
      if (!dialCode || dialCode.trim() === '') {
        return {isAvailable: false, message: '국가 코드를 입력해주세요.'};
      }

      // isoCode 유효성 검사
      if (!isoCode || isoCode.trim() === '') {
        return {isAvailable: false, message: '국가 코드를 입력해주세요.'};
      }
  
      // 임시 저장소(TempPhoneNumber)에서 전화번호(dialcode와 조합됨)가 이미 존재하는지 확인
      const tempPhoneNumber = await TempPhoneNumber.findOne({ userPhoneNumber: userPhoneNumber, dialCode: dialCode, isoCode: isoCode });
      
      // 최종 사용자 DB(SignupUser)에서 해당 전화번호가 이미 존재하는지 확인
      const user = await SignupUser.findOne({ userPhoneNumber: userPhoneNumber, dialCode: dialCode, isoCode: isoCode });
  
      // 각 저장소에 동일한 전화번호가 존재하지 않는 경우, 사용 가능한 전화번호로 판단하여 임시 저장소에 저장
      if (!tempPhoneNumber && !user) {
        // 임시 저장소에 사용자 정보 저장 (10분 후 자동 삭제)
        await TempPhoneNumber.create({ userDeviceID: userDeviceID, userPhoneNumber: userPhoneNumber, dialCode: dialCode, isoCode : isoCode });
        // 응답
        return { isAvailable: true, isAlreadyRegistered: false, message: '해당 전화번호는 사용 가능합니다.' };
      }
      // 각 저장소에 동일한 전화번호가 있고, 그 전화번호가 현재 요청한 사용자의 userDeviceID와 같은 경우, 사용 가능한 전화번호로 판단
      else if ((tempPhoneNumber && tempPhoneNumber.userDeviceID === userDeviceID)) {  
        // 전화번호 사용 가능 : (이미 가등록된 전화번호)
        return { isAvailable: true, isAlreadyRegistered: false, message: '해당 전화번호는 사용 가능합니다.' };
      }
      else if ((user && user.userDeviceID === userDeviceID)) {
        // 전화번호 사용 가능 : (이미 등록된 전화번호
        return { isAvailable: true, isAlreadyRegistered: true, message: '해당 전화번호는 사용 가능합니다.' };
      }
      // 각 저장소에 동일한 전화번호가 있고, 그 전화번호가 현재 요청한 사용자의 userDeviceID와 다른 경우, 사용 불가능한 전화번호로 판단
      else {
        // 전화번호 사용 불가
        return { isAvailable: false, isAlreadyRegistered: true, message: '해당 전화번호는 이미 사용 중입니다.' };
      }
    } catch (error) {
      // 예외 발생 시, 서버 오류로 응답하고 콘솔에 오류 로그 출력
      return { error: error.message };
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
 * @returns {object} error: 오류 메시지
 */
async function checkUserIDAvailableService(userUID, userID) {
    try {
      // 아이디 유효성 검사
      if (!userID || userID.trim() === '') {
        // 아이디가 없는 경우, 입력해달라는 메시지 반환
        return { isAvailable: false, message: '아이디를 입력해주세요.' };
      }
  
      // userUID 유효성 검사
      if (!userUID || userUID.trim() === '') {
        // 사용자 정보가 없는 경우, 입력해달라는 메시지 반환
        return {isAvailable: false, message: '사용자 정보가 없습니다.'};
      }
  
      // 임시 저장소(TempUserID)에서 해당 아이디가 이미 존재하는지 확인
      const tempUserID = await TempUserID.findOne({ userID: userID });
  
      // 최종 사용자 DB(SignupUser)에서 해당 아이디가 이미 존재하는지 확인
      const user = await SignupUser.findOne({ userID: userID });
  
      // 각 저장소에 동일한 아이디가 존재하지 않는 경우, 사용 가능한 아이디으로 판단하여 임시 저장소에 저장
      if (!tempUserID && !user) {
        // ('아이디 사용 가능 : (최초 등록)');
        // 임시 저장소에 사용자 정보 저장 (10분 후 자동 삭제)
        await TempUserID.create({ userUID: userUID, userID: userID });
        // 응답
        return { isAvailable: true, isAlreadyRegistered: false, message: '해당 아이디은 사용 가능합니다.' };
      }
      // 각 저장소에 동일한 아이디가 있고, 그 아이디가 현재 요청한 사용자의 UID와 같은 경우, 사용 가능한 아이디으로 판단
      else if ((tempUserID && tempUserID.userUID === userUID)) {
        // 아이디 사용 가능 : (이미 가등록된 아이디)
        return { isAvailable: true,isAlreadyRegistered: false,  message: '해당 아이디은 사용 가능합니다.' };
      } else if ((user && user.userUID === userUID)) {
        // 아이디 사용 가능 : (이미 등록된 아이디)
        return { isAvailable: true,isAlreadyRegistered: true,  message: '해당 아이디은 사용 가능합니다.' };
      }
      // 각 저장소에 동일한 아이디가 있고, 그 아이디가 현재 요청한 사용자의 UID와 다른 경우, 사용 불가능한 아이디으로 판단
      else {
        // 아이디 사용 불가
        return { isAvailable: false, isAlreadyRegistered: true, message: '해당 아이디은 이미 사용 중입니다.' };
      }
    } catch (error) {
      // 예외 발생 시, 서버 오류로 응답
      return { error: error.message };
    }
}

module.exports = {
    checkPhoneNumberAvailableService,
    checkUserIDAvailableService,
};