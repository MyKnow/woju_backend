const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const morgan = require('morgan');

// 로그 형식 정의
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// 로거 생성
const logger = createLogger({
//   level: 'info',
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/app.log' })
  ],
});

// loggerMiddleware 미들웨어 설정
const loggerMiddleware = morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
});

module.exports = { logger, loggerMiddleware };
