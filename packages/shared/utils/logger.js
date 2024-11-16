const fs = require('fs');
const path = require('path');
const { format } = require('date-fns'); // 날짜 포맷팅을 위해 사용
const morgan = require('morgan'); // HTTP 로깅을 위해 사용

/**
 * @description 로그 수준 설정
 * @enum {string}
 */
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

/**
 * @description 로그 파일 저장 위치와 파일명 생성 함수
 * @returns {string} 로그 파일 경로
 */
function getLogFilePath() {
  // 로그 파일 경로: 서버 최상위 폴더에 YYYY-MM-DD.log 파일로 저장
  const logDirectory = path.join(__dirname, '../../..', 'logs');
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory); // 로그 폴더가 없으면 생성
  }
  const currentDate = format(new Date(), 'yyyy-MM-dd');
  return path.join(logDirectory, `${currentDate}.log`);
}

/**
 * @description 파일에 로그를 기록하는 함수
 * @param {string} level - 로그 레벨 (INFO, WARN, ERROR, DEBUG)
 * @param {string} ip - 호출한 IP 주소
 * @param {string} message - 로그 메시지
 */
function logToFile(level, ip, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}], [${level}], [${ip}], [${message}]\n`;
  fs.appendFileSync(getLogFilePath(), logMessage); // 로그 파일에 추가 기록
}

/**
 * @description 요청 IP를 추출하는 미들웨어
 */
function getIp(req) {
  if (!req || !req.headers) {
    return 'unknown';
  }
  
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0];
  } else if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }
  
  return 'unknown';
}

/**
 * @description 로그 기록을 위한 함수들
 */
const logger = {
  info: (req, message) => logToFile(LOG_LEVELS.INFO, getIp(req), message),
  warn: (req, message) => logToFile(LOG_LEVELS.WARN, getIp(req), message),
  error: (req, message) => logToFile(LOG_LEVELS.ERROR, getIp(req), message),
  debug: (req, message) => logToFile(LOG_LEVELS.DEBUG, getIp(req), message),
};

// HTTP 요청 로그를 위해 morgan과 통합
const httpLogger = morgan((tokens, req, res) => {
  return [
    `[${new Date().toISOString()}]`,
    `[INFO]`,
    `[${getIp(req)}]`,
    `[${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)}]`,
  ].join(', ');
}, {
  stream: {
    write: (message) => {
      fs.appendFileSync(getLogFilePath(), message + '\n');
    },
  },
});

module.exports = { logger, httpLogger };