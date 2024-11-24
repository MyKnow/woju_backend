// controllers/serviceController.js

// 필요한 Util 불러오기
const { isMongoDBConnected } = require('../../shared/utils/db');
const { generateToken, } = require('../../shared/utils/auth');
const { id } = require('date-fns/locale');

/** DB 연결 상태 확인 API
 * 
 * @param {*} req 
 * @param {*} res 
 * 
 * @returns {object} 200 - message: 'DB가 연결되어 있습니다.'
 * @returns {object} 500 - message: 'DB 연결 상태를 확인해주세요.'
 */
exports.status = (req, res) => {
  // DB 연결 상태 확인
  const mongooseState = isMongoDBConnected('User');

  if (mongooseState) {
    return res.status(200).json({
      message: 'DB가 연결되어 있습니다.',
    });
  } else {
    return res.status(500).json({
      message: 'DB 연결 상태를 확인해주세요.',
    });
  }
};

/**
 * # 관리자 토큰 발급 API
 * @name getAdminToken
 * 
 * ## Params
 * @param {string} req.body.adminID - 관리자 아이디
 * @param {string} req.body.adminPW - 관리자 비밀번호
 * @param {Object} res - Response 객체
 * 
 * ## Returns
 * @returns {Object} 200({jwt}) : 관리자 토큰 발급
 * @returns {Object} 400 : 아이디 또는 비밀번호가 일치하지 않음
 * @returns {Object} 500 : 서버 에러
 */
exports.getAdminToken = (req, res) => {
  const { adminID, adminPW } = req.body;

  // 유효성 검사
  if (!adminID || !adminPW) {
    return res.status(400).json({ message: '아이디와 비밀번호를 입력해주세요.' });
  }

  // 관리자 아이디와 비밀번호 확인
  const correctID = process.env.ADMIN_ID;
  const correctPW = process.env.ADMIN_PW;
  
  // 테스트용 관리자 아이디와 비밀번호 확인
  if (adminID != correctID) {
    return res.status(400).json({ message: '아이디가 일치하지 않습니다.', id: adminID, correctID: correctID });
  }
  if (adminPW != correctPW) {
    return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.', pw: adminPW, correctPW: correctPW });
  }

  // 관리자 토큰 발급
  const token = generateToken('ADMIN', { adminID: adminID });

  return res.status(200).json({ jwt: token });
};