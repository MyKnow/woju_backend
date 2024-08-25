// controllers/serviceController.js

// 필요한 모델 불러오기
const mongoose = require('mongoose');

// 서버 연결 상태 확인
exports.status = (req, res) => {
  // DB 연결 상태 확인
  const mongooseState = mongoose.connection.readyState;

  if (mongooseState !== 1) {
    res.status(500).json({
      databaseStatus: mongooseState,
    });
  }

  res.status(200).json({
    databaseStatus: mongooseState,
  });
};