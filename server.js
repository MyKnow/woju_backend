// server.js

const express = require('express');
const { connectDB } = require('./utils/db'); // DB 연결 로직
const userRoutes = require('./routes/userRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const policyRoutes = require('./routes/policyRoutes');
const cors = require('cors');
const morgan = require('morgan');



// Express 앱 생성
const app = express();
const { loggerMiddleware } = require('./utils/logger');

app.use(loggerMiddleware); // 로그 미들웨어 추가
app.use(cors()); // CORS 미들웨어 추가
app.use(express.json({limit: '10mb'})); // JSON 요청 바디를 파싱하기 위한 미들웨어
app.use(morgan('combined')); // 'combined'는 로그 포맷 중 하나로, 자세한 정보를 제공합니다.

// 연결 성공 시 콘솔에 출력
connectDB();

// 라우터 설정
app.use('/api/user', userRoutes); // "/api/user" 경로로 시작하는 요청은 userRoutes 라우터로 전달됩니다.
app.use('/api/service', serviceRoutes); // "/api/service" 경로로 시작하는 요청은 serviceRoutes 라우터로 전달됩니다.
app.use('/api/policy', policyRoutes); // "/api/policy" 경로로 시작하는 요청은 policyRoutes 라우터로 전달됩니다.

// 서버 실행
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running`);
});