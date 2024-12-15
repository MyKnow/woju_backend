// __tests__/user/serviceController.test.js

// 필요한 Library를 불러옵니다.
const request = require('supertest'); // HTTP 요청을 모의하기 위해 사용
const express = require('express');
const mongoose = require('mongoose');

// 필요한 Util을 불러옵니다.
const { connectDB, disconnectDB, DBType } = require('../../packages/shared/utils/db');

// 필요한 Router를 불러옵니다.
const serviceRoutes = require('../../packages/server_user/routes/serviceRoutes');

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
        await connectDB(DBType.USER, process.env.MONGO_USER_DB_URI);
        const response = await request(app).get('/api/service/check-connection-status');
        expect(response.statusCode).toBe(200);
    });

    it('DB가 정상적으로 연결되지 않은 상태에서는 500과 DB 상태(에러) 반환한다.', async () => {
        // 테스트용 MongoDB 연결 해제
        await disconnectDB(DBType.USER);

        const response = await request(app).get('/api/service/check-connection-status');
        expect(response.statusCode).toBe(500);
    });
});

describe('POST /api/service/admin-token', () => {
    it('정상적인 adminID와 adminPW를 입력하면 200 상태 코드를 반환한다.', async () => {
        const response = await request(app)
            .post('/api/service/admin-token')
            .send({ adminID: process.env.ADMIN_ID, adminPW: process.env.ADMIN_PW });
        expect(response.statusCode).toBe(200);

        // 토큰이 반환되는지 확인
        expect(response.body).toHaveProperty('jwt');
        expect(response.body.jwt).not.toBeNull();
    });

    it('비정상적인 adminID와 adminPW를 입력하면 400 상태 코드를 반환한다.', async () => {
        const response = await request(app)
            .post('/api/service/admin-token')
            .send({ adminID: 'wrongID', adminPW: 'wrongPW' });
        expect(response.statusCode).toBe(400);
    });

    it('adminID와 adminPW를 입력하지 않으면 400 상태 코드를 반환한다.', async () => {
        const response = await request(app)
            .post('/api/service/admin-token')
            .send({ });
        expect(response.statusCode).toBe(400);
    });
});