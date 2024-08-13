// server.js
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');
const morgan = require('morgan');

// .env 파일을 사용하기 위한 설정
require('dotenv').config();

// Express 앱 생성
const app = express();
app.use(cors()); // CORS 미들웨어 추가
app.use(express.json()); // JSON 요청 바디를 파싱하기 위한 미들웨어
app.use(morgan('combined')); // 'combined'는 로그 포맷 중 하나로, 자세한 정보를 제공합니다.

// MongoDB 연결 설정
mongoose.connect(process.env.MONGODB_URI, {
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// 라우터 설정
app.use('/api', userRoutes); // "/api/check-user" 경로를 통해 접근 가능

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});