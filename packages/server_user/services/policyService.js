// services/policyService.js

// 필요한 모델 불러오기
const { createPolicyModel, PolicyType, CountryType } = require('../models/policyModel');

// 필요한 Utils 불러오기
const { connectDB, DBType, DBUri } = require('../../shared/utils/db');

/** # 이용 약관 내용을 조회하는 비동기 함수
 * 
 * - 약관 종류와 국가 코드에 해당하는 약관을 조회한다.
 * 
 * ### Parameters
 * @param {string} type - 약관 종류
 * @param {string} country - 국가 코드
 * @param {string} version - 약관 버전 (선택, version 값이 없으면 최신 버전을 조회)
 * 
 * ### Returns
 * @returns {object} Policy 객체
 * 
 */
const getPolicyContentService = async (type, version, country) => {
  // DB 연결
  const db = await connectDB(DBType.POLICY, DBUri.POLICY);
  if (!db) {
    return res.status(500).json({ message: 'DB 연결 실패' });
  }

  const Policy = createPolicyModel(db);

    if (version) {
        return await Policy.findOne({ type, country, version });
    } else {
        return await Policy.findOne({ type, country }).sort({ updatedAt: -1 });
    }
};

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
    getPolicyContentService,
    isValidPolicyType,
    isValidCountryType,
    isValidVersion,
};