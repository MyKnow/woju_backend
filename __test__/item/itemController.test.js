// __tests__/item/itemController.test.js

// 필요한 라이브러리 불러오기
const request = require('supertest'); // HTTP 요청을 모의하기 위해 사용
const express = require('express');

// 필요한 Model 가져오기
const { createItemModel } = require('../../packages/server_item/models/itemModel');
const Category = require('../../packages/server_item/models/categoryModel');
const { getTestLocationData } = require('../../packages/server_item/models/locationModel');
const { getTestSignUpUserData } = require('../../packages/shared/models/userModel');

// 필요한 Util 불러오기
const { connectDB, disconnectDB } = require('../../packages/shared/utils/db');
const { generateToken } = require('../../packages/shared/utils/auth');

// 필요한 라우터 가져오기
const itemRoutes = require('../../packages/server_item/routes/itemRoutes');
const userRoutes = require('../../packages/server_user/routes/userRoutes');

// Express 앱 생성
const app = express();
app.use(express.json());

// 라우터 설정
app.use('/api/item', itemRoutes);
app.use('/api/user', userRoutes);

// 테스트 시작 전 
beforeAll(async () => {
    // Item DB 연결
    const itemDB = await connectDB('Item', process.env.MONGO_ITEM_DB_URI);
    if (!itemDB) {
        console.error('Error connecting to Item DB');
        return;
    }
});
  
beforeEach(async () => {
    await disconnectDB('Item');
});

// Health Check API 테스트
describe('GET /api/item', () => {
    it('DB가 연결된 상태일 때, 200 상태 코드를 반환한다.', async () => {
        const db = await connectDB('Item', process.env.MONGO_ITEM_DB_URI);

        // 요청
        const response = await request(app).get('/api/item/health-check');

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);
    });

    it('DB가 연결 해제된 상태일 때, 500 상태 코드를 반환한다.', async () => {
        // User DB 연결 해제
        await disconnectDB('Item');

        // 요청
        const response = await request(app).get('/api/item/health-check');

        // 응답 코드 확인
        expect(response.statusCode).toBe(500);
    });
});

// addItem API 테스트
describe('POST /api/item/add-item', () => {
    it('정상적으로 item이 등록되면 200 상태 코드를 반환한다.', async () => {

        // 테스트용 유저 생성
        const signupResponse = await request(app)
        .post('/api/user/signup')
        .send(getTestSignUpUserData(1));

        // 테스트용 유저 로그인
        const loginResponse = await request(app).post('/api/user/login').send({
            userID: getTestSignUpUserData(1).userID,
            userPassword: getTestSignUpUserData(1).userPassword,
            userDeviceID: getTestSignUpUserData(1).userDeviceID,
        });

        const userToken = loginResponse.body.token;
        
        // 요청
        const response = await request(app)
            .post('/api/item/add-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'testItem',
                itemImages: [
                    '0',
                ],
                itemDescription: 'testDescription',
                itemPrice: 10000,
                itemFeelingOfUse: 1,
                itemBarterPlace: getTestLocationData(),
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);
    });

    it('Parameter Validation에 실패하면 400 상태 코드를 반환한다.', async () => {
        // 테스트용 유저 생성
        const signupResponse = await request(app)
        .post('/api/user/signup')
        .send(getTestSignUpUserData(1));

        // 테스트용 유저 로그인
        const loginResponse = await request(app).post('/api/user/login').send({
            userID: getTestSignUpUserData(1).userID,
            userPassword: getTestSignUpUserData(1).userPassword,
            userDeviceID: getTestSignUpUserData(1).userDeviceID,
        });

        const userToken = loginResponse.body.token;

        // 요청, 테스트를 위해 데이터를 누락시킴
        const response = await request(app)
            .post('/api/item/add-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'testItem',
                itemImages: [
                    '0',
                ],
                // itemDescription: 'testDescription',
                itemPrice: 10000,
                itemFeelingOfUse: 1.0,
                // itemBarterPlace: getTestLocationData(),
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(400);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await request(app)
            .post('/api/item/add-item')
            .send({
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'testItem',
                itemImages: [
                    '0',
                ],
                itemDescription: 'testDescription',
                itemPrice: 10000,
                itemFeelingOfUse: 1,
                itemBarterPlace: getTestLocationData(),
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        // 요청
        const response = await request(app)
            .post('/api/item/add-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'testItem',
                itemImages: [
                    '0',
                ],
                itemDescription: 'testDescription',
                itemPrice: 10000,
                itemFeelingOfUse: 1,
                itemBarterPlace: getTestLocationData(),
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(402);
    });

    it('정상적으로 item이 등록되면 ITEM DB에 저장된다.', async () => {
        // 테스트용 유저 생성
        const signupResponse = await request(app)
        .post('/api/user/signup')
        .send(getTestSignUpUserData(1));

        // 테스트용 유저 로그인
        const loginResponse = await request(app).post('/api/user/login').send({
            userID: getTestSignUpUserData(1).userID,
            userPassword: getTestSignUpUserData(1).userPassword,
            userDeviceID: getTestSignUpUserData(1).userDeviceID,
        });

        const userToken = loginResponse.body.token;

        // 요청
        const response = await request(app)
            .post('/api/item/add-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'testItem',
                itemImages: [
                    '0',
                ],
                itemDescription: 'testDescription',
                itemPrice: 10000,
                itemFeelingOfUse: 1,
                itemBarterPlace: getTestLocationData(),
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);

        // DB 연결
        const itemDB = await connectDB('Item', process.env.MONGO_ITEM_DB_URI);

        if (!itemDB) {
            console.error('Error connecting to Item DB');
            return;
        }

        const Item = createItemModel(itemDB);

        // ITEM DB에서 해당 아이템을 찾음
        const item = await Item.findOne({ itemName: 'testItem' });

        // 아이템이 존재하는지 확인
        expect(item).not.toBeNull();
    });
});