// controllers/serviceController.js

// 필요한 모델 불러오기
const mongoose = require('mongoose');

/** DB 연결 상태 확인 API
 * 
 * @param {*} req 
 * @param {*} res 
 * 
 * @returns {object} 200 - databaseStatus: DB 연결 상태
 */
exports.status = (req, res) => {
  // DB 연결 상태 확인
  const mongooseState = mongoose.connection.readyState;

  res.status(200).json({
    databaseStatus: mongooseState,
  });
};