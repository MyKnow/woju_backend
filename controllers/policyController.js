// controllers/policyController.js

// 필요한 모델 불러오기
const { Policy, PolicyType, isValidPolicyType, isValidCountryType } = require('../models/policyModel');
const { verifyAdmin } = require('../utils/auth');  // 미들웨어 불러오기


/** 이용 약관 내용 GET API
 * 
 * @route GET /policy/terms
 * 
 * @param {string} req.query.type - 약관 종류 (필수)
 * @param {string} req.query.country - 국가 코드 (필수)
 * @param {string} req.query.version - 약관 버전 (선택)
 * 
 * @returns {object} 200 - json : { version : string, content : string }
 * @returns {Error}  400 - type, version, country 값이 모두 채워지지 않음
 * @returns {Error}  404 - 약관 내용이 존재하지 않음
 * @returns {Error}  406 - type, country 값이 올바르지 않음
 * @returns {Error}  500 - 서버 에러
 * 
 */
exports.getPolicyContent = async (req, res) => {
  const { type, version, country } = req.query;

  if (!type || !version || !country) {
    return res.status(400).json({ message: 'type, version, country는 필수입니다.' });
  }

  if (!isValidPolicyType(type) || !isValidCountryType(country)) {
    return res.status(406).json({ message: 'type, country 값이 올바르지 않습니다.' });
  }

  const policy = await getPolicyContentFunction(type, version, country);

  if (!policy) {
    return res.status(404).json({ message: '약관 내용이 존재하지 않습니다.' });
  }

  return res.status(200).json({ version: policy.version, content: policy.content });
};

/** 이용 약관 내용을 조회하는 비동기 함수
 * 
 * @param {string} type - 약관 종류
 * @param {string} country - 국가 코드
 * @param {string} version - 약관 버전 (선택)
 * 
 * @returns {object} - Policy 객체
 * 
 */
const getPolicyContentFunction = async (type, version, country) => {
  return await Policy.findOne({ type, version, country });
};

/** DB에 새로운 이용 약관 추가 API
 * 
 * @route POST /policy/terms
 * 
 * @param {string} req.body.version - 약관 버전 (필수)
 * @param {string} req.body.type - 약관 종류 (필수)
 * @param {string} req.body.country - 국가 코드 (필수)
 * @param {string} req.body.content - 약관 내용 (필수)
 * 
 * @returns {object} 200 - 약관 추가 성공
 * @returns {Error}  400 - 요청 바디가 올바르지 않음
 * @returns {Error}  406 - type, country 값이 올바르지 않음
 * @returns {Error}  409 - 이미 존재하는 약관
 * @returns {Error}  500 - 서버 에러
 * 
 * @security JWT
 * 
*/
exports.addPolicyContent = [
  verifyAdmin,
  async (req, res) => {
    const { version, content, type, country } = req.body;

    if (!version || !content || !type || !country) {
      return res.status(400).json({ message: '요청 바디가 올바르지 않습니다.' });
    }

    if (!isValidPolicyType(type) || !isValidCountryType(country)) {
      return res.status(406).json({ message: 'type, country 값이 올바르지 않습니다.' });
    }

    if (await Policy.findOne({ version, type, country })) {
      return res.status(409).json({ message: '이미 존재하는 약관입니다.' });
    }

    const result = await Policy.create({ version, content, type, country });

    if (!result) {
      return res.status(500).json({ message: '서버 에러' });
    } else {
      return res.status(200).json({ message: '약관 추가 성공' });
    }
  }
];

/** DB에 있는 이용 약관 수정 API
 * 
 * @route PUT /policy/terms
 * 
 * @param {string} req.body.version - 약관 버전 (필수)
 * @param {string} req.body.content - 약관 내용 (필수)
 * @param {string} req.body.type - 약관 종류 (필수)
 * @param {string} req.body.country - 국가 코드 (필수)
 * 
 * @returns {object} 200 - 약관 수정 성공
 * @returns {Error}  400 - 요청 바디가 올바르지 않음
 * @returns {Error}  404 - 약관 내용이 존재하지 않음
 * @returns {Error}  406 - type, country 값이 올바르지 않음
 * @returns {Error}  500 - 서버 에러
 * 
 * @security JWT
 * 
*/
exports.updatePolicyContent = [
  verifyAdmin,
  async (req, res) => {
    const { version, content, type, country } = req.body;

    if (!version || !content || !type || !country) {
      return res.status(400).json({ message: '요청 바디가 올바르지 않습니다.' });
    }

    if (!isValidPolicyType(type) || !isValidCountryType(country)) {
      return res.status(406).json({ message: 'type, country 값이 올바르지 않습니다.' });
    }

    const policy = await Policy.findOne({ version, type, country });

    if (!policy) {
      return res.status(404).json({ message: '약관 내용이 존재하지 않습니다.' });
    }

    const result = await Policy.updateOne({ version, type, country }, { content });

    if (result.nModified === 0) {
      return res.status(500).json({ message: '서버 에러' });
    } else {
      return res.status(200).json({ message: '약관 수정 성공' });
    }
  }
];

/** # DB에 있는 이용 약관 삭제 API
 * - 약관 버전과 종류에 해당하는 약관을 삭제한다.
 * 
 * ## Route
 * @route DELETE /policy/terms
 * 
 * ## Query Params
 * @param {string} req.query.version 약관 버전 (필수)
 * @param {string} req.query.type 약관 종류 (필수)
 * @param {string} req.query.country 국가 코드 (필수)
 * 
 * ## Responses
 * @returns {object} 200 - 약관 삭제 성공
 * @returns {Error}  400 - 요청 바디가 올바르지 않음
 * @returns {Error}  404 - 삭제할 약관이 존재하지 않음
 * @returns {Error}  406 - type, country 값이 올바르지 않음
 * 
 * ## Security
 * @security JWT
 * 
 */
exports.deletePolicyContent = [
  verifyAdmin,
  async (req, res) => {
    const { version, type, country } = req.body;

    if (!version || !type || !country) {
      return res.status(400).json({ message: '요청 바디가 올바르지 않습니다.' });
    }

    if (!isValidPolicyType(type) || !isValidCountryType(country)) {
      return res.status(406).json({ message: 'type, country 값이 올바르지 않습니다.' });
    }

    const result = await Policy.deleteOne({ version, type, country });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: '약관이 존재하지 않습니다.' });
    } else {
      return res.status(200).json({ message: '약관 삭제 성공' });
    }
  }
];