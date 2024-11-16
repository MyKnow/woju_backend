// __tests__/serviceController.test.js

const request = require('supertest'); // HTTP 요청을 모의하기 위해 사용
const express = require('express');
const mongoose = require('mongoose');


const { connectDB, disconnectDB } = require('../packages/shared/utils/db');
const serviceRoutes = require('../packages/server_user/routes/serviceRoutes');

// 테스트용 Express 앱 설정
const app = express();
app.use(express.json());
app.use('/api/service', serviceRoutes);

// 테스트 시작 전 
beforeAll(async () => {
    //
});

// 테스트 종료 후
afterAll(async () => {
    //
});

// 각 it 실행 전
beforeEach(async () => {
    //
});


describe('서버 연결 상태 확인 API', () => {
    it('DB가 정상적으로 연결된 상태에서는 200을 반환한다.', async () => {
        // 테스트용 MongoDB 연결
        await connectDB();
        const response = await request(app).get('/api/service/check-connection-status');
        expect(response.statusCode).toBe(200);
    });

    it('DB가 정상적으로 연결되지 않은 상태에서는 200과 DB 상태(에러) 반환한다.', async () => {
        // 테스트용 MongoDB 연결 해제
        await disconnectDB();
        const response = await request(app).get('/api/service/check-connection-status');
        expect(response.statusCode).toBe(200);
        expect(response.body).not.toBe(mongoose.connection.readyState);
    });
});