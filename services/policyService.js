// services/policyService.js
const { Policy } = require('../models/policyModel');

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
    if (version) {
        return await Policy.findOne({ type, country, version });
    } else {
        return await Policy.findOne({ type, country }).sort({ updatedAt: -1 });
    }
};

module.exports = {
    getPolicyContentService,
};