// controllers/chatController.js

// 필요한 Util 불러오기
const { isMongoDBConnected, DBType } = require('../../shared/utils/db');

/** DB 연결 상태 확인 API
 * 
 * @param {*} req 
 * @param {*} res 
 * 
 * @returns {object} 200 - message: 'DB가 연결되어 있습니다.'
 * @returns {object} 500 - message: 'DB 연결 상태를 확인해주세요.'
 */
exports.dbStatus = (req, res) => {
  // DB 연결 상태 확인
  const mongooseState = isMongoDBConnected(DBType.CHAT);

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