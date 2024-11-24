// server.js

// 필요한 Libarary 가져오기
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// 필요한 Utils 가져오기
const { connectDB } = require('../shared/utils/db'); // DB 연결 로직
const { logger, httpLogger } = require('../shared/utils/logger');

// 필요한 라우터 가져오기
const itemRoutes = require('./routes/itemRoutes');

// Express 앱 생성
const app = express();

app.use(cors()); // CORS 미들웨어 추가
app.use(express.json({limit: '10mb'})); // JSON 요청 바디를 파싱하기 위한 미들웨어
app.use(morgan('combined')); // 'combined'는 로그 포맷 중 하나로, 자세한 정보를 제공합니다.

// 로깅 미들웨어들을 라우터보다 먼저 설정
app.use(httpLogger);
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  res.send = function (body) {
    logger.info(req, `${req.method} ${req.url} ${res.statusCode} ${Date.now() - startTime}ms`);
    return originalSend.call(this, body);
  };

  res.json = function (body) {
    logger.info(req, `${req.method} ${req.url} ${res.statusCode} ${Date.now() - startTime}ms`);
    return originalJson.call(this, body);
  };

  res.end = function (chunk) {
    logger.info(req, `${req.method} ${req.url} ${res.statusCode} ${Date.now() - startTime}ms`);
    return originalEnd.call(this, chunk);
  };

  res.on('error', (error) => {
    logger.error(req, `Error: ${error.message}`);
  });

  next();
});

// env 파일에 있는 DB URI를 가져와서 연결
const { MONGO_ITEM_DB_URI, MONGO_USER_DB_URI } = process.env;

// DB 연결
const itemDB = connectDB('Item', MONGO_ITEM_DB_URI);
const userDB = connectDB('User', MONGO_USER_DB_URI);

// DB 연결 실패 시 에러 메시지 출력
if (!itemDB) {
  logger.error('Item DB connection failed');
}

if (!userDB) {
  logger.error('User DB connection failed');
}

// 라우터 설정
app.use('/api/item', itemRoutes); // "/api/item" 경로로 시작하는 요청은 itemRoutes 라우터로 전달됩니다.

// 서버 실행
const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server is running`);
});