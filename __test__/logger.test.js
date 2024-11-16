const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const express = require('express');
const request = require('supertest');

const { logger } = require('../packages/shared/utils/logger'); 

describe('Logger Utility Test', () => {
  const mockIp = '127.0.0.1';
  const testMessage = 'Test message';
  const logFilePath = path.join(__dirname, '..', 'logs', `${format(new Date(), 'yyyy-MM-dd')}.log`);

  beforeAll(() => {
    const logDirectory = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory);
    }
  });

  afterAll(() => {
    // // 테스트가 끝난 후 로그 파일 정리
    if (fs.existsSync(logFilePath)) {
      fs.unlinkSync(logFilePath);
    }
  });

  test('INFO 레벨 로그 기록', () => {
    // req 객체를 모킹
    const mockReq = {
      headers: {
        'x-forwarded-for': mockIp,
      },
      connection: {
        remoteAddress: mockIp,
      },
    };
  
    // 모킹한 req 객체를 사용
    logger.info(mockReq, testMessage);
  
    // 로그 파일이 생성되었는지 확인
    expect(fs.existsSync(logFilePath)).toBe(true);
  
    // 로그 파일 내용을 읽고 확인
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(logContent).toContain(`[INFO]`);
    expect(logContent).toContain(`[${mockIp}]`);
    expect(logContent).toContain(testMessage);
  });
  
  test('ERROR 레벨 로그 기록', () => {
    // req 객체를 모킹
    const mockReq = {
      headers: {
        'x-forwarded-for': mockIp,
      },
      connection: {
        remoteAddress: mockIp,
      },
    };
  
    // 모킹한 req 객체를 사용
    logger.error(mockReq, testMessage);
  
    // 로그 파일이 생성되었는지 확인
    expect(fs.existsSync(logFilePath)).toBe(true);
  
    // 로그 파일 내용을 읽고 확인
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(logContent).toContain(`[ERROR]`);
    expect(logContent).toContain(`[${mockIp}]`);
    expect(logContent).toContain(testMessage);
  });

  test('날짜별 로그 파일 생성 확인', () => {
    // 로그 디렉토리가 존재하는지 확인하고, 없으면 생성
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
  
    // 테스트를 위해 INFO 로그를 기록하여 파일 생성
    const mockReq = {
      headers: {
        'x-forwarded-for': mockIp,
      },
      connection: {
        remoteAddress: mockIp,
      },
    };
    logger.info(mockReq, testMessage);
  
    // 현재 날짜 기반으로 로그 파일이 올바르게 생성되었는지 확인
    const expectedFileName = `${format(new Date(), 'yyyy-MM-dd')}.log`;
    const files = fs.readdirSync(logDir);
    expect(files).toContain(expectedFileName);
  });
});

describe('Logger Middleware Test', () => {
  let app;
  const logFilePath = path.join(__dirname, '..', 'logs', `${format(new Date(), 'yyyy-MM-dd')}.log`);
  
  beforeEach(() => {
    app = express();
    
    // 테스트를 위한 로깅 미들웨어 설정
    app.use((req, res, next) => {
      const startTime = Date.now();
      const originalJson = res.json;
      
      res.json = function(body) {
        logger.info(req, `${req.method} ${req.url} ${res.statusCode} ${Date.now() - startTime}ms`);
        return originalJson.call(this, body);
      };
      
      next();
    });
    
    // 테스트용 라우트
    app.get('/test-logging', (req, res) => {
      res.json({ message: 'test success' });
    });
    
    app.post('/test-error-logging', (req, res, next) => {
      next(new Error('테스트 에러'));
    });
    
    // 에러 핸들러
    app.use((err, req, res, next) => {
      logger.error(req, `Error: ${err.message}`);
      res.status(500).json({ error: err.message });
    });
  });

  test('미들웨어를 통한 INFO 레벨 로그 기록', async () => {
    const response = await request(app)
      .get('/test-logging')
      .expect(200);
    
    // 로그 파일이 생성되었는지 확인
    expect(fs.existsSync(logFilePath)).toBe(true);
    
    // 로그 파일 내용을 읽고 확인
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(logContent).toContain('[INFO]');
    expect(logContent).toContain('GET /test-logging 200');
    expect(logContent).toMatch(/\d+ms/);
  });

  test('미들웨어를 통한 ERROR 레벨 로그 기록', async () => {
    const response = await request(app)
      .post('/test-error-logging')
      .expect(500);
    
    // 로그 파일이 생성되었는지 확인
    expect(fs.existsSync(logFilePath)).toBe(true);
    
    // 로그 파일 내용을 읽고 확인
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(logContent).toContain('[ERROR]');
    expect(logContent).toContain('Error: 테스트 에러');
  });

  test('요청 처리 시간이 로그에 포함되는지 확인', async () => {
    const response = await request(app)
      .get('/test-logging')
      .expect(200);
    
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(logContent).toMatch(/\d+ms/);
  });

  test('HTTP 메소드와 URL이 정확히 기록되는지 확인', async () => {
    const testPath = '/test-logging';
    const response = await request(app)
      .get(testPath)
      .expect(200);
    
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    expect(logContent).toContain(`GET ${testPath}`);
  });
});