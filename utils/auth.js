// middleware/auth.js

const jwt = require('jsonwebtoken');

/** # 사용자 인증 미들웨어
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