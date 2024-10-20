const { logger, loggerMiddleware } = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();

app.use(loggerMiddleware);

beforeAll(() => {
    fs.mkdirSync(path.join(__dirname, '../logs'), { recursive: true });
});

afterAll(() => {
    fs.unlinkSync(path.join(__dirname, '../logs/app.log'));
});

describe('Logger Tests', () => {
    it('로그를 콘솔과 파일에 정상적으로 출력해야 한다.', () => {
        logger.info('Test info message');
        logger.error('Test error message');

        const logFilePath = path.join(__dirname, '../logs/app.log');
        const logContent = fs.readFileSync(logFilePath, 'utf8');

        expect(logContent).toContain('Test info message');
        expect(logContent).toContain('Test error message');
    });

    it('IP 주소가 로그에 포함되어야 한다.', () => {
        const req = {
            ip: '127.0.0.1',
            headers: {} // 헤더 추가
        };
        const res = {};
        const next = jest.fn();

        loggerMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();

        logger.info('Test info message');
        logger.error('Test error message');

        const logFilePath = path.join(__dirname, '../logs/app.log');
        const logContent = fs.readFileSync(logFilePath, 'utf8');

        expect(logContent).toContain('127.0.0.1');
    });
});
