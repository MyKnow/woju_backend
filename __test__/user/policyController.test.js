// __test__/user/policyController.test.js

// 필요한 Library를 불러옵니다.
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// 필요한 Util을 불러옵니다.
const { connectDB, disconnectDB, DBType, DBUri } = require('../../packages/shared/utils/db');
const { generateToken } = require('../../packages/shared/utils/auth');

// 필요한 Routes를 불러옵니다.
const policyRoutes = require('../../packages/server_user/routes/policyRoutes');

// 필요한 Model을 불러옵니다.
const { createPolicyModel, PolicyType, CountryType } = require('../../packages/server_user/models/policyModel');

// 테스트용 Express 앱 설정
const app = express();
app.use(express.json());
app.use('/api/policy', policyRoutes);

// 테스트 종료 후 DB 연결 해제
afterAll(async () => {
  await disconnectDB();
});

// 각 테스트 실행 전 DB 상태 초기화
beforeEach(async () => {
    // DB 연결
    const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
  
    if (!policyDB) {
      console.error('Error connecting to User DB');
      return;
    }

    const Policy = createPolicyModel(policyDB); 

    await Policy.deleteMany({}); // 테스트 전에 DB의 모든 정책을 삭제하여 초기화
});

describe('정책 관련 API 테스트', () => {
    // GET 테스트
    describe('GET /policy/terms', () => {
        it('정상적으로 나라별 약관을 가져온다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            await Policy.create({ type: PolicyType.PrivacyPolicy, version: '1.0.0', content: '테스트 약관 내용', country: CountryType.KR });
    
            const response = await request(app).get(`/api/policy/terms?type=${PolicyType.PrivacyPolicy}&version=1.0.0&country=${CountryType.KR}`);
    
            expect(response.statusCode).toBe(200);
            expect(response.body.content).toBe('테스트 약관 내용');
        });

        it('버전을 명시하지 않으면 최신 버전을 가져온다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 
            
            await Policy.create({ type: PolicyType.PrivacyPolicy, version: '1.0.0', content: '테스트 약관 내용', country: CountryType.KR });
            await Policy.create({ type: PolicyType.PrivacyPolicy, version: '2.0', content: '테스트 약관 내용 2.0', country: CountryType.KR });

            const response = await request(app).get(`/api/policy/terms?type=${PolicyType.PrivacyPolicy}&country=${CountryType.KR}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.content).toBe('테스트 약관 내용 2.0');
        });

        it('요청 바디가 올바르지 않으면 400을 반환한다.', async () => {
            const response = await request(app).get('/api/policy/terms');
            expect(response.statusCode).toBe(400);
        });
    
        it('약관이 존재하지 않으면 404를 반환한다.', async () => {
            const response = await request(app).get(`/api/policy/terms?type=${PolicyType.PrivacyPolicy}&version=1.0.0&country=${CountryType.US}`);
            expect(response.statusCode).toBe(404);
        });

        it ('type, country 값이 올바르지 않으면 406을 반환한다.', async () => {
            const response = await request(app).get('/api/policy/terms?type=invalid&version=1.0.0&country=invalid');
            expect(response.statusCode).toBe(406);
        });
    });
  
    // POST 테스트
    describe('POST /policy/terms', () => {
        it('ADMIN이 나라별로 약관을 추가한다.', async () => {
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });
    
            const responseOfTerms = await request(app)
            .post('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가', country: CountryType.KR });
            expect(responseOfTerms.statusCode).toBe(200);

            const responseOfPrivacy = await request(app)
            .post('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0.0', type: PolicyType.PrivacyPolicy, content: '테스트 개인정보 처리방침 추가', country: CountryType.KR });
            expect(responseOfPrivacy.statusCode).toBe(200);


            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 
    
            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).not.toBeNull();
            expect(policy.content).toBe('테스트 약관 추가');

            const privacy = await Policy.findOne({ version: '1.0.0', type: PolicyType.PrivacyPolicy, country: CountryType.KR });
            expect(privacy).not.toBeNull();
            expect(privacy.content).toBe('테스트 개인정보 처리방침 추가');
        });

        it('요청 바디가 올바르지 않으면 400을 반환한다.', async () => {
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });
    
            const response = await request(app)
            .post('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가' });
    
            expect(response.statusCode).toBe(400);
        });

        it('ADMIN이 없으면 401을 반환한다.', async () => {
            const response = await request(app)
            .post('/api/policy/terms')
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가', country: CountryType.KR });
    
            expect(response.statusCode).toBe(401);
        });

        it('유효하지 않은 토큰이면 402를 반환한다.', async () => {
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });

            const response = await request(app).post('/api/policy/terms').set('Authorization', `Bearer ${adminToken}invalid`).send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가', country: CountryType.KR });

            expect(response.statusCode).toBe(402);


            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });

            expect(policy).toBeNull();
        });

        it('일반 사용자가 요청하면 403을 반환한다.', async () => {
            const userToken = generateToken('USER', { userUUID: 'testUUID' });
    
            const response = await request(app)
            .post('/api/policy/terms')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가', country: CountryType.KR });
    
            expect(response.statusCode).toBe(403);
        });

        it ('type, country 값이 올바르지 않으면 406을 반환한다.', async () => {
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });

            const response = await request(app).post('/api/policy/terms').set('Authorization', `Bearer ${adminToken}`).send({ version: '1.0.0', type: 'invalid', content: '테스트 약관 추가', country: 'invalid' });
            expect(response.statusCode).toBe(406);


            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).toBeNull();
        });

        it('이미 존재하는 약관을 추가하면 409를 반환한다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            await Policy.create({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
    
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });
    
            const response = await request(app)
            .post('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관 추가', country: CountryType.KR });
    
            expect(response.statusCode).toBe(409);
        });
    });
  
    // PUT 테스트
    describe('PUT /policy/terms', () => {
        it('ADMIN이 나라별로 약관을 수정한다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            await Policy.create({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
    
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });
    
            const response = await request(app)
            .put('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '수정된 약관', country: CountryType.KR });
    
            expect(response.statusCode).toBe(200);
    
            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy.content).toBe('수정된 약관');
        });
        
        it('요청 바디가 올바르지 않으면 400을 반환한다.', async () => {
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });

            const response = await request(app).put('/api/policy/terms').set('Authorization', `Bearer ${adminToken}`).send({ version: '1.0.0', type: PolicyType.TermsOfService });

            expect(response.statusCode).toBe(400);

            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });

            expect(policy).toBeNull();

        });

        it('ADMIN이 없으면 401을 반환한다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            await Policy.create({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
    
            const response = await request(app)
            .put('/api/policy/terms')
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '수정된 약관', country: CountryType.KR });
    
            expect(response.statusCode).toBe(401);
        });

        it('유요하지 않은 토큰이면 402를 반환한다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            await Policy.create({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
            
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });

            const response = await request(app).put('/api/policy/terms').set('Authorization', `Bearer ${adminToken}invalid`).send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '수정된 약관', country: CountryType.KR });

            expect(response.statusCode).toBe(402);

            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });

            expect(policy.content).toBe('테스트 약관');
        });

        it('일반 사용자가 요청하면 403을 반환한다.', async () => {
            const userToken = generateToken('USER', { userUUID: 'testUUID' });
    
            const response = await request(app)
            .put('/api/policy/terms')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '수정된 약관', country: CountryType.KR });
    
            expect(response.statusCode).toBe(403);
        });

        it('존재하지 않는 약관을 수정하면 404를 반환한다.', async () => {
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });
    
            const response = await request(app)
            .put('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, content: '수정된 약관', country: CountryType.KR });
    
            expect(response.statusCode).toBe(404);
        });

        it('type, country 값이 올바르지 않으면 406을 반환한다.', async () => {
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });

            const response = await request(app).put('/api/policy/terms').set('Authorization', `Bearer ${adminToken}`).send({ version: '1.0.0', type: 'invalid', content: '수정된 약관', country: 'invalid' });
            expect(response.statusCode).toBe(406);

            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).toBeNull();
        });
    });
  
    // DELETE 테스트
    describe('DELETE /policy/terms', () => {
        it('ADMIN이 나라별로 약관을 삭제한다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            await Policy.create({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
    
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });
    
            const response = await request(app)
            .delete('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
    
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('약관 삭제 성공');
    
            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).toBeNull();
        });

        it('요청 바디가 올바르지 않으면 400을 반환한다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            await Policy.create({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });

            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });
    
            const response = await request(app)
            .delete('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService });
    
            expect(response.statusCode).toBe(400);
    
            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).not.toBeNull();
        });

        it('ADMIN이 없으면 401을 반환한다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            await Policy.create({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });
    
            const response = await request(app)
            .delete('/api/policy/terms')
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
    
            expect(response.statusCode).toBe(401);
    
            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).not.toBeNull();
        });

        it('유효하지 않은 토큰이면 402를 반환한다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            await Policy.create({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });

            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });

            const response = await request(app).delete('/api/policy/terms').set('Authorization', `Bearer ${adminToken}invalid`).send({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });

            expect(response.statusCode).toBe(402);

            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });

            expect(policy).not.toBeNull();
        });

        it('일반 사용자가 요청하면 403을 반환한다.', async () => {
            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            await Policy.create({ version: '1.0.0', type: PolicyType.TermsOfService, content: '테스트 약관', country: CountryType.KR });

            const userToken = generateToken('USER', { userUUID: 'testUUID' });
    
            const response = await request(app)
            .delete('/api/policy/terms')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
    
            expect(response.statusCode).toBe(403);
    
            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).not.toBeNull();
        });

        it('존재하지 않는 약관을 삭제하면 404를 반환한다.', async () => {
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });
    
            const response = await request(app)
            .delete('/api/policy/terms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
    
            expect(response.statusCode).toBe(404);
        });

        it('type, country 값이 올바르지 않으면 406을 반환한다.', async () => {
            const adminToken = generateToken('ADMIN', { adminID: process.env.ADMIN_ID });

            const response = await request(app).delete('/api/policy/terms').set('Authorization', `Bearer ${adminToken}`).send({ version: '1.0.0', type: 'invalid', country: 'invalid' });
            expect(response.statusCode).toBe(406);

            // DB 연결
            const policyDB = await connectDB(DBType.POLICY, DBUri.USER);
          
            if (!policyDB) {
              console.error('Error connecting to User DB');
              return;
            }
        
            const Policy = createPolicyModel(policyDB); 

            const policy = await Policy.findOne({ version: '1.0.0', type: PolicyType.TermsOfService, country: CountryType.KR });
            expect(policy).toBeNull();
        });
    });
  });