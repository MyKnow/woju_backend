const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const { connectDB, disconnectDB } = require('../utils/db');
const policyRoutes = require('../routes/policyRoutes');
const { Policy, PolicyType, CountryType } = require('../models/policyModel');

// 테스트용 Express 앱 설정
const app = express();
app.use(express.json());
app.use('/api/policy', policyRoutes);

// JWT 토큰 생성 함수
const generateToken = (role = 'USER') => {
  return jwt.sign({ role }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
};

// 테스트 시작 전 DB 연결
beforeAll(async () => {
  await connectDB();
});

// 테스트 종료 후 DB 연결 해제
afterAll(async () => {
  await disconnectDB();
});

// 각 테스트 실행 전 DB 상태 초기화
beforeEach(async () => {
  await Policy.deleteMany({}); // 테스트 전에 DB의 모든 정책을 삭제하여 초기화
});

describe('정책 관련 API 테스트', () => {
    // GET 테스트
    describe('GET /policy/terms', () => {
        it('정상적으로 나라별 약관을 가져온다.', async () => {
            await Policy.create({ type: PolicyType.PrivacyPolicy, version: '1.0', content: '테스트 약관 내용', country: CountryType.KR });
    
            const response = await request(app).get(`/api/policy/terms?type=${PolicyType.PrivacyPolicy}&version=1.0&country=${CountryType.KR}`);
    
            expect(response.statusCode).toBe(200);
            expect(response.body.content).toBe('테스트 약관 내용');
        });

        it('요청 바디가 올바르지 않으면 400을 반환한다.', async () => {
            const response = await request(app).get('/api/policy/terms');
            expect(response.statusCode).toBe(400);
        });
    
        it('약관이 존재하지 않으면 404를 반환한다.', async () => {
            const response = await request(app).get(`/api/policy/terms?type=${PolicyType.PrivacyPolicy}&version=1.0&country=${CountryType.US}`);
            expect(response.statusCode).toBe(404);
        });
    });
  
    // POST 테스트
    describe('POST /policy/terms', () => {
        it('ADMIN이 나라별로 약관을 추가한다.', async () => {
            const adminToken = generateToken('ADMIN');
    
            const response = await request(app)
            .post('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가', country: CountryType.KR });
    
            expect(response.statusCode).toBe(200);
    
            const policy = await Policy.findOne({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).not.toBeNull();
            expect(policy.content).toBe('테스트 약관 추가');
        });

        it('요청 바디가 올바르지 않으면 400을 반환한다.', async () => {
            const adminToken = generateToken('ADMIN');
    
            const response = await request(app)
            .post('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가' });
    
            expect(response.statusCode).toBe(400);
        });

        it('ADMIN이 없으면 401을 반환한다.', async () => {
            const response = await request(app)
            .post('/api/policy/terms')
            .send({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가', country: CountryType.KR });
    
            expect(response.statusCode).toBe(401);
        });

        it('유효하지 않은 토큰이면 402를 반환한다.', async () => {
            const adminToken = generateToken('ADMIN');

            const response = await request(app).post('/api/policy/terms').set('Authorization', `Bearer ${adminToken}invalid`).send({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가', country: CountryType.KR });

            expect(response.statusCode).toBe(402);

            const policy = await Policy.findOne({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });

            expect(policy).toBeNull();
        });

        it('일반 사용자가 요청하면 403을 반환한다.', async () => {
            const userToken = generateToken('USER');
    
            const response = await request(app)
            .post('/api/policy/terms')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가', country: CountryType.KR });
    
            expect(response.statusCode).toBe(403);
        });

        it('이미 존재하는 약관을 추가하면 409를 반환한다.', async () => {
            await Policy.create({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
    
            const adminToken = generateToken('ADMIN');
    
            const response = await request(app)
            .post('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가', country: CountryType.KR });
    
            expect(response.statusCode).toBe(409);
        });
    });
  
    // PUT 테스트
    describe('PUT /policy/terms', () => {
        it('ADMIN이 나라별로 약관을 수정한다.', async () => {
            await Policy.create({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
    
            const adminToken = generateToken('ADMIN');
    
            const response = await request(app)
            .put('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService, content: '수정된 약관', country: CountryType.KR });
    
            expect(response.statusCode).toBe(200);
    
            const policy = await Policy.findOne({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy.content).toBe('수정된 약관');
        });
        
        it('요청 바디가 올바르지 않으면 400을 반환한다.', async () => {
            const adminToken = generateToken('ADMIN');

            const response = await request(app).put('/api/policy/terms').set('Authorization', `Bearer ${adminToken}`).send({ version: '1.0', type: PolicyType.TermsOfService });

            expect(response.statusCode).toBe(400);

            const policy = await Policy.findOne({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });

            expect(policy).toBeNull();

        });

        it('ADMIN이 없으면 401을 반환한다.', async () => {
            await Policy.create({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
    
            const response = await request(app)
            .put('/api/policy/terms')
            .send({ version: '1.0', type: PolicyType.TermsOfService, content: '수정된 약관', country: CountryType.KR });
    
            expect(response.statusCode).toBe(401);
        });

        it('유요하지 않은 토큰이면 402를 반환한다.', async () => {
            await Policy.create({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
            
            const adminToken = generateToken('ADMIN');

            const response = await request(app).put('/api/policy/terms').set('Authorization', `Bearer ${adminToken}invalid`).send({ version: '1.0', type: PolicyType.TermsOfService, content: '수정된 약관', country: CountryType.KR });

            expect(response.statusCode).toBe(402);

            const policy = await Policy.findOne({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });

            expect(policy.content).toBe('테스트 약관');
        });

        it('일반 사용자가 요청하면 403을 반환한다.', async () => {
            const userToken = generateToken('USER');
    
            const response = await request(app)
            .put('/api/policy/terms')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService, content: '수정된 약관', country: CountryType.KR });
    
            expect(response.statusCode).toBe(403);
        });

        it('존재하지 않는 약관을 수정하면 404를 반환한다.', async () => {
            const adminToken = generateToken('ADMIN');
    
            const response = await request(app)
            .put('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService, content: '수정된 약관', country: CountryType.KR });
    
            expect(response.statusCode).toBe(404);
        });
    });
  
    // DELETE 테스트
    describe('DELETE /policy/terms', () => {
        it('ADMIN이 나라별로 약관을 삭제한다.', async () => {
            await Policy.create({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
    
            const adminToken = generateToken('ADMIN');
    
            const response = await request(app)
            .delete('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });
    
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('약관 삭제 성공');
    
            const policy = await Policy.findOne({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).toBeNull();
        });

        it('요청 바디가 올바르지 않으면 400을 반환한다.', async () => {
            await Policy.create({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });

            const adminToken = generateToken('ADMIN');
    
            const response = await request(app)
            .delete('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService });
    
            expect(response.statusCode).toBe(400);
    
            const policy = await Policy.findOne({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).not.toBeNull();
        });

        it('ADMIN이 없으면 401을 반환한다.', async () => {
            await Policy.create({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
    
            const response = await request(app)
            .delete('/api/policy/terms')
            .send({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });
    
            expect(response.statusCode).toBe(401);
    
            const policy = await Policy.findOne({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).not.toBeNull();
        });

        it('유효하지 않은 토큰이면 402를 반환한다.', async () => {
            await Policy.create({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });

            const adminToken = generateToken('ADMIN');

            const response = await request(app).delete('/api/policy/terms').set('Authorization', `Bearer ${adminToken}invalid`).send({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });

            expect(response.statusCode).toBe(402);

            const policy = await Policy.findOne({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });

            expect(policy).not.toBeNull();
        });

        it('일반 사용자가 요청하면 403을 반환한다.', async () => {
            await Policy.create({ version: '1.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });

            const userToken = generateToken('USER');
    
            const response = await request(app)
            .delete('/api/policy/terms')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });
    
            expect(response.statusCode).toBe(403);
    
            const policy = await Policy.findOne({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).not.toBeNull();
        });

        it('존재하지 않는 약관을 삭제하면 404를 반환한다.', async () => {
            const adminToken = generateToken('ADMIN');
    
            const response = await request(app)
            .delete('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0', type: PolicyType.TermsOfService, country: CountryType.KR });
    
            expect(response.statusCode).toBe(404);
        });
    });
  });