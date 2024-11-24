// packages/shared/utils/auth.js

// 필요한 라이브러리 불러오기
const jwt = require('jsonwebtoken');

/** 
 * @name verifyUser
 * @description 
 * - 사용자 인증 미들웨어
 * 
 * ## Parameters
 * @param {*} req
 * @param {*} res 
 * @param {*} next - 다음 미들웨어 또는 컨트롤러로 이동
 * 
 * ## Returns
 * @returns {Error} 401 - 토큰이 없는 경우
 * @returns {Error} 402 - 유효하지 않은 토큰인 경우
 * @returns {Error} 403 - 권한이 없는 경우
 */
exports.verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '권한이 없습니다. 토큰이 필요합니다.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 사용자 역할이 ADMIN인지 확인
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    req.user = decoded;  // 사용자 정보를 request에 추가
    next();  // 다음 미들웨어 또는 컨트롤러로 이동
  } catch (error) {
    return res.status(402).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

/**
 * @name verifyUser
 * @description
 * - 사용자 인증 미들웨어
 * 
 * ## Parameters
 * @param {*} req
 * @param {*} res
 * @param {*} next - 다음 미들웨어 또는 컨트롤러로 이동
 * 
 * ## Returns
 * @returns {Error} 401 - 토큰이 없는 경우
 * @returns {Error} 402 - 유효하지 않은 토큰인 경우
 * @returns {Error} 403 - 권한이 없는 경우
 * 
 */
exports.verifyUser = async function (req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '권한이 없습니다. 토큰이 필요합니다.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 사용자 역할이 USER 또는 ADMIN인지 확인
    if (decoded.role !== 'USER' && decoded.role !== 'ADMIN') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 발급자(iss)와 대상자(aud) 확인
    if (decoded.iss !== 'woju-backend' || decoded.aud !== 'woju-frontend') {
      return res.status(402).json({ message: '유효하지 않은 토큰입니다.' });
    }

    // exp(만료 시간) 확인
    if (decoded.exp < Date.now() / 1000) {
      return res.status(402).json({ message: '토큰이 만료되었습니다.' });
    }
    
    // 사용자 UUID를 request에 추가
    req.userUUID = decoded.userUUID;

    next();  // 다음 미들웨어 또는 컨트롤러로 이동
  } catch (error) {
    return res.status(402).json({ message: error.message });
  }
};

/**
 * @name generateToken
 * @description 역할에 따른 JWT 토큰 생성
 * 
 * ## Parameters
 * @param {string} role - 사용자 역할
 * @param {string} userUUID - 사용자 UUID
 * 
 * ## Returns
 * @returns {string} JWT 토큰
 * 
 * ## Notes
 * - JWT_SECRET 환경 변수를 사용하여 토큰 생성
 * - 토큰 만료 시간: 24시간
 * - Registed Claim: iss(woju-backend), aud(woju-frontend), exp(24h)
 * - Private Claim: role, userUUID
 * - 
 * - 
 */
exports.generateToken = (role, userUUID) => {
  const payload = {
    iss: 'woju-backend',
    aud: 'woju-frontend',
    role,
    userUUID,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}