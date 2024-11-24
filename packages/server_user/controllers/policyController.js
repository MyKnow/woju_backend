// controllers/policyController.js

// 필요한 모델 불러오기
const { createPolicyModel } = require('../models/policyModel');

// 필요한 Utils 불러오기
const { verifyAdmin } = require('../../shared/utils/auth');  // 미들웨어 불러오기
const { connectDB, disconnectDB, DBType } = require('../../shared/utils/db');  // DB 연결 끊기

// 필요한 Service 불러오기
const { getPolicyContentService, isValidPolicyType, isValidCountryType  } = require('../services/policyService');

/** # 이용 약관 내용 GET API
 * 
 * - 약관 종류와 국가 코드에 해당하는 약관을 조회한다.
 * 
 * ## Route
 * @route GET /policy/terms
 * 
 * ## Query Params
 * @param {string} req.query.type - 약관 종류 (필수)
 * @param {string} req.query.country - 국가 코드 (필수)
 * @param {string} req.query.version - 약관 버전 (선택)
 * 
 * ## Responses
 * @returns {object} 200 - json : { version : string, content : string }
 * @returns {Error}  400 - type, version, country 값이 모두 채워지지 않음
 * @returns {Error}  404 - 약관 내용이 존재하지 않음
 * @returns {Error}  406 - type, country 값이 올바르지 않음
 * @returns {Error}  500 - 서버 에러
 * 
 */
exports.getPolicyContent = async (req, res) => {
  const { type, version, country } = req.query;

  if (!type || !country) {
    return res.status(400).json({ message: 'type, country는 필수입니다.' });
  }

  if (!isValidPolicyType(type) || !isValidCountryType(country)) {
    return res.status(406).json({ message: 'type, country 값이 올바르지 않습니다.' });
  }

  const searchVersion = version ? version : null;
  
  const policy = await getPolicyContentService(type, searchVersion, country);

  if (!policy) {
    return res.status(404).json({ message: '약관 내용이 존재하지 않습니다.' });
  }

  return res.status(200).json({ version: policy.version, content: policy.content });
};

/** # DB에 새로운 이용 약관 추가 API
 * 
 * - 약관 버전과 종류에 해당하는 약관을 추가한다.
 * 
 * ### Route
 * @route POST /policy/terms
 * 
 * ### Request Body
 * @param {string} req.body.version - 약관 버전 (필수)
 * @param {string} req.body.type - 약관 종류 (필수)
 * @param {string} req.body.country - 국가 코드 (필수)
 * @param {string} req.body.content - 약관 내용 (필수)
 * 
 * ### Responses
 * @returns {object} 200 - 약관 추가 성공
 * @returns {Error}  400 - 요청 바디가 올바르지 않음
 * @returns {Error}  406 - type, country 값이 올바르지 않음
 * @returns {Error}  409 - 이미 존재하는 약관
 * @returns {Error}  500 - 서버 에러
 * 
 * ### Security
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

    // DB 연결
    const db = await connectDB(DBType.POLICY, process.env.MONGO_POLICY_DB_URI);
    if (!db) {
      return res.status(500).json({ message: 'DB 연결 실패' });
    }

    const Policy = createPolicyModel(db);

    // 중복 여부 확인
    const existingPolicy = await Policy.findOne({ version, type, country });
    if (existingPolicy) {
      return res.status(409).json({ message: '이미 존재하는 약관입니다.' });
    }

    try {
      // 새로운 Policy 생성
      await Policy.create({ version, content, type, country });
      return res.status(200).json({ message: '약관 추가 성공' });
    } catch (error) {
      return res.status(500).json({ message: '서버 에러', error: error.message });
    }
  }
];

/** # DB에 있는 이용 약관 수정 API
 * 
 * - 약관 버전과 종류에 해당하는 약관을 수정한다.
 * 
 * ### Route
 * @route PUT /policy/terms
 * 
 * ### Request Body
 * @param {string} req.body.version - 약관 버전 (필수)
 * @param {string} req.body.content - 약관 내용 (필수)
 * @param {string} req.body.type - 약관 종류 (필수)
 * @param {string} req.body.country - 국가 코드 (필수)
 * 
 * ### Responses
 * @returns {object} 200 - 약관 수정 성공
 * @returns {Error}  400 - 요청 바디가 올바르지 않음
 * @returns {Error}  404 - 약관 내용이 존재하지 않음
 * @returns {Error}  406 - type, country 값이 올바르지 않음
 * @returns {Error}  500 - 서버 에러
 * 
 * ### Security
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


    // DB 연결
    const db = await connectDB(DBType.POLICY, process.env.MONGO_POLICY_DB_URI);
    if (!db) {
      return res.status(500).json({ message: 'DB 연결 실패' });
    }

    const Policy = createPolicyModel(db);

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
 * ### Route
 * @route DELETE /policy/terms
 * 
 * ### Query Params
 * @param {string} req.query.version 약관 버전 (필수)
 * @param {string} req.query.type 약관 종류 (필수)
 * @param {string} req.query.country 국가 코드 (필수)
 * 
 * ### Responses
 * @returns {object} 200 - 약관 삭제 성공
 * @returns {Error}  400 - 요청 바디가 올바르지 않음
 * @returns {Error}  404 - 삭제할 약관이 존재하지 않음
 * @returns {Error}  406 - type, country 값이 올바르지 않음
 * 
 * ### Security
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


    // DB 연결
    const db = await connectDB(DBType.POLICY, process.env.MONGO_POLICY_DB_URI);
    if (!db) {
      return res.status(500).json({ message: 'DB 연결 실패' });
    }

    const Policy = createPolicyModel(db);

    const result = await Policy.deleteOne({ version, type, country });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: '약관이 존재하지 않습니다.' });
    } else {
      return res.status(200).json({ message: '약관 삭제 성공' });
    }
  }
];