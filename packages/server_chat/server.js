// server.js

// 필요한 Libarary 가져오기
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// 필요한 Utils 가져오기
const { connectDB, DBType, DBUri } = require('../shared/utils/db'); // DB 연결 로직
const { logger, httpLogger } = require('../shared/utils/logger');

// 필요한 라우터 가져오기
const chatRoutes = require('./routes/chatRoutes');
const serviceRoutes = require('./routes/chatRoutes');

// Express 앱 생성
const app = express();
 
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

app.use(cors());
app.use(express.json({limit: '10mb'}));
app.use(morgan('combined'));


// 연결 성공 시 콘솔에 출력
connectDB(DBType.USER, DBUri.USER) // user DB 연결
  .then(() => {
    console.log('Connected to User DB');
  })
  .catch((err) => {
    console.error(err);
  });

connectDB(DBType.CHAT, DBUri.CHAT) // chat DB 연결
  .then(() => {
    console.log('Connected to Chat DB');
  })
  .catch((err) => {
    console.error(err);
  });

// 라우터 설정
app.use('/api/chat', chatRoutes); // "/api/chat" 경로로 시작하는 요청은 chatRoutes 라우터로 전달됩니다.

// 글로벌 에러 핸들러 추가 (라우터 설정 후, 서버 실행 전)
app.use((err, req, res, next) => {
  logger.error(req, `Error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });

  next(err);
});

// 서버 실행
const PORT = 3002;

app.listen(PORT, () => {
  console.log(`Server is running`);
});