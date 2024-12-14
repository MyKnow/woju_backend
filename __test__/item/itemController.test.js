// __tests__/item/itemController.test.js

// 필요한 라이브러리 불러오기
const request = require('supertest'); // HTTP 요청을 모의하기 위해 사용
const express = require('express');

// 필요한 Model 가져오기
const { createItemModel } = require('../../packages/server_item/models/itemModel');
const Category = require('../../packages/shared/models/categoryModel');
const { getTestLocationData } = require('../../packages/server_item/models/locationModel');
const { getTestSignUpUserData } = require('../../packages/shared/models/userModel');

// 필요한 Util 불러오기
const { connectDB, disconnectDB, DBType } = require('../../packages/shared/utils/db');
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

// Health Check API 테스트
describe('GET /api/item', () => {
    beforeEach(async () => {
        // DB 초기화
        await disconnectDB(DBType.ITEM);
    });

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
    beforeEach(async () => {
        // DB 초기화
        await disconnectDB(DBType.ITEM);
    });

    afterAll(async () => {
        // DB 연결 해제
        await disconnectDB(DBType.ITEM);
    });

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
                itemCategory: Category.ELECTRONICS,
                itemName: 'testItem',
                itemImages: [
                    '0',
                ],
                itemDescription: 'testDescription',
                itemPrice: 10000,
                itemFeelingOfUse: 1,
                itemBarterPlace: getTestLocationData(),
                itemStatus: 1,
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);

        // DB 확인
        const itemDB = await connectDB(DBType.ITEM, process.env.MONGO_ITEM_DB_URI);

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
                itemCategory: Category.ELECTRONICS,
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
});

// getItemList API 테스트
describe('GET /api/item/get-item-list', () => {
    beforeEach(async () => {
        // DB 초기화
        await disconnectDB(DBType.ITEM);
    });

    it('정상적으로 item 목록을 가져오면 200 상태 코드를 반환한다.', async () => {
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

        // 아이템 추가
        const addItemResponse = await request(app)
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

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);

        // 응답 데이터 확인
        expect(response.body.itemList[0].itemName).toBe('testItem');
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list')

        // 응답 코드 확인
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 코드 확인
        expect(response.statusCode).toBe(402);
    });

    it('아이템이 없으면 빈 배열을 반환한다.', async () => {
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
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);

        // 응답 데이터 확인
        expect(response.body.itemList).toEqual([]);
    });
});

// updateItem API 테스트
describe('POST /api/item/update-item', () => {
    beforeEach(async () => {
        // DB 초기화
        await disconnectDB(DBType.ITEM);
    });

    it('정상적으로 item이 수정되면 200 상태 코드를 반환한다.', async () => {
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

        // 아이템 추가
        const addItemResponse = await request(app)
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

        // 내 아이템 목록 조회
        const getItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 데이터 확인
        expect(getItemListResponse.body.itemList[0].itemName).toBe('testItem');

        // 해당 아이템의 UUID
        const itemUUID = getItemListResponse.body.itemList[0].itemUUID;

        // 아이템 수정
        const response = await request(app)
            .post('/api/item/update-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                itemUUID: itemUUID,
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'updatedTestItem',
                itemImages: [
                    '0',
                ],
                itemDescription: 'updatedTestDescription',
                itemPrice: 20000,
                itemFeelingOfUse: 2,
                itemBarterPlace: getTestLocationData(),
                itemStatus: 1,
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);

        // 내 아이템 목록 조회
        const updatedItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 데이터 확인
        expect(updatedItemListResponse.body.itemList[0].itemName).toBe('updatedTestItem');
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

        // 아이템 추가
        const addItemResponse = await request(app)
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

        // 내 아이템 목록 조회
        const getItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);
            
        // 응답 데이터 확인
        expect(getItemListResponse.body.itemList[0].itemName).toBe('testItem');

        // 해당 아이템의 UUID
        const itemUUID = getItemListResponse.body.itemList[0].itemUUID;

        // 요청, 테스트를 위해 데이터를 누락시킴
        const response = await request(app)
            .post('/api/item/update-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                itemUUID: itemUUID,
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'updatedTestItem',
                // itemImages: [
                //     '0',
                // ],
                itemDescription: 'updatedTestDescription',
                itemPrice: 20000,
                itemFeelingOfUse: 2,
                itemBarterPlace: getTestLocationData(),
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(400);

        // 내 아이템 목록 조회
        const updatedItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 데이터 확인
        expect(updatedItemListResponse.body.itemList[0].itemName).toBe('testItem');
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await request(app)
            .post('/api/item/update-item')
            .send({
                itemUUID: 'testItemUUID',
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'updatedTestItem',
                itemImages: [
                    '0',
                ],
                itemDescription: 'updatedTestDescription',
                itemPrice: 20000,
                itemFeelingOfUse: 2,
                itemBarterPlace: getTestLocationData(),
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        // 요청
        const response = await request(app)
            .post('/api/item/update-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                itemUUID: 'testItemUUID',
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'updatedTestItem',
                itemImages: [
                    '0',
                ],
                itemDescription: 'updatedTestDescription',
                itemPrice: 20000,
                itemFeelingOfUse: 2,
                itemBarterPlace: getTestLocationData(),
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(402);
    });

    it('해당 아이템의 소유자가 아니면 402 상태 코드를 반환한다.', async () => {
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

        // 아이템 추가
        const addItemResponse = await request(app)
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

        // 내 아이템 목록 조회
        const getItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 데이터 확인
        expect(getItemListResponse.body.itemList[0].itemName).toBe('testItem');

        // 해당 아이템의 UUID
        const itemUUID = getItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저 생성
        const signupResponse2 = await request(app)
        .post('/api/user/signup')
        .send(getTestSignUpUserData(2));

        // 다른 유저 로그인
        const loginResponse2 = await request(app).post('/api/user/login').send({
            userID: getTestSignUpUserData(2).userID,
            userPassword: getTestSignUpUserData(2).userPassword,
            userDeviceID: getTestSignUpUserData(2).userDeviceID,
        });

        const userToken2 = loginResponse2.body.token;

        // 요청
        const response = await request(app)
            .post('/api/item/update-item')
            .set('Authorization', `Bearer ${userToken2}`)
            .send({ 
                itemUUID: itemUUID,
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'updatedTestItem',
                itemImages: [
                    '0',
                ],
                itemDescription: 'updatedTestDescription',
                itemPrice: 20000,
                itemFeelingOfUse: 2,
                itemBarterPlace: getTestLocationData(),
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(402);

        // 내 아이템 목록 조회
        const updatedItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 데이터 확인
        expect(updatedItemListResponse.body.itemList[0].itemName).toBe('testItem');
    });

    it('해당 아이템이 없으면 404 상태 코드를 반환한다.', async () => {
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
            .post('/api/item/update-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                itemUUID: 'testItemUUID',
                itemCategory: Category.ELECTRONICS.toString(),
                itemName: 'updatedTestItem',
                itemImages: [
                    '0',
                ],
                itemDescription: 'updatedTestDescription',
                itemPrice: 20000,
                itemFeelingOfUse: 2,
                itemBarterPlace: getTestLocationData(),
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(404);
    });
});

// deleteItem API 테스트
describe('DELETE /api/item/delete-item', () => {
    it('정상적으로 item이 삭제되면 200 상태 코드를 반환한다.', async () => {
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

        // 아이템 추가
        const addItemResponse = await request(app)
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

        // 내 아이템 목록 조회
        const getItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 데이터 확인
        expect(getItemListResponse.body.itemList[0].itemName).toBe('testItem');

        // 해당 아이템의 UUID
        const itemUUID = getItemListResponse.body.itemList[0].itemUUID;

        // 요청
        const response = await request(app)
            .delete('/api/item/delete-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemUUID: itemUUID });

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);

        // 내 아이템 목록 조회
        const updatedItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 데이터 확인
        expect(updatedItemListResponse.body.itemList).toEqual([]);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await request(app)
            .delete('/api/item/delete-item')
            .send({ itemUUID: 'testItemUUID' });

        // 응답 코드 확인
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        // 요청
        const response = await request(app)
            .delete('/api/item/delete-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemUUID: 'testItemUUID' });

        // 응답 코드 확인
        expect(response.statusCode).toBe(402);
    });

    it('해당 아이템의 소유자가 아니면 402 상태 코드를 반환한다.', async () => {
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

        // 아이템 추가
        const addItemResponse = await request(app)
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

        // 내 아이템 목록 조회
        const getItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 데이터 확인
        expect(getItemListResponse.body.itemList[0].itemName).toBe('testItem');

        // 해당 아이템의 UUID
        const itemUUID = getItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저 생성
        const signupResponse2 = await request(app)
        .post('/api/user/signup')
        .send(getTestSignUpUserData(2));

        // 다른 유저 로그인
        const loginResponse2 = await request(app).post('/api/user/login').send({
            userID: getTestSignUpUserData(2).userID,
            userPassword: getTestSignUpUserData(2).userPassword,
            userDeviceID: getTestSignUpUserData(2).userDeviceID,
        });

        const userToken2 = loginResponse2.body.token;

        // 요청
        const response = await request(app)
            .delete('/api/item/delete-item')
            .set('Authorization', `Bearer ${userToken2}`)
            .send({
                itemUUID: itemUUID,
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(402);

        // 내 아이템 목록 조회
        const updatedItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 데이터 확인
        expect(updatedItemListResponse.body.itemList[0].itemName).toBe('testItem');
    });

    it('해당 아이템이 없으면 404 상태 코드를 반환한다.', async () => {
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
            .delete('/api/item/delete-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                itemUUID: 'testItemUUID',
            });

        // 응답 코드 확인
        expect(response.statusCode).toBe(404);
    });

    it('itemUUID가 없으면 400 상태 코드를 반환한다.', async () => {
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
            .delete('/api/item/delete-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({});

        // 응답 코드 확인
        expect(response.statusCode).toBe(400);
    });
});

// getItemInfo API 테스트
describe('GET /api/item/get-item-info', () => {
    beforeEach(async () => {
        // DB 초기화
        await disconnectDB(DBType.ITEM);
    });

    it('정상적으로 item 정보를 가져오면 200 상태 코드를 반환한다.', async () => {
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

        // 아이템 추가
        const addItemResponse = await request(app)
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

        // 내 아이템 목록 조회
        const getItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken}`);

        // 응답 데이터 확인
        expect(getItemListResponse.body.itemList[0].itemName).toBe('testItem');

        // 해당 아이템의 UUID
        const itemUUID = getItemListResponse.body.itemList[0].itemUUID;

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ itemUUID: itemUUID });

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);

        // 응답 데이터 확인
        expect(response.body.item.itemName).toBe('testItem');
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
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken}`)
            .query({});

        // 응답 코드 확인
        expect(response.statusCode).toBe(400);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await request(app)
            .get('/api/item/get-item-info')
            .query({ itemUUID: 'testItemUUID' });

        // 응답 코드 확인
        expect(response.statusCode).toBe(401);
    });

    it('존재하지 않는 아이템이면 404 상태 코드를 반환한다.', async () => {
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
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ itemUUID: 'testItemUUID' });

        // 응답 코드 확인
        expect(response.statusCode).toBe(404);
    });

    it('Token의 userUUID와 itemOwnerUUID가 다르면 View Count가 1 증가한다.', async () => {
        // 테스트용 유저 생성
        const signupResponse1 = await request(app)
        .post('/api/user/signup')
        .send(getTestSignUpUserData(1));

        // 테스트용 유저 로그인
        const loginResponse1 = await request(app).post('/api/user/login').send({
            userID: getTestSignUpUserData(1).userID,
            userPassword: getTestSignUpUserData(1).userPassword,
            userDeviceID: getTestSignUpUserData(1).userDeviceID,
        });

        const userToken1 = loginResponse1.body.token;

        // 아이템 추가
        const addItemResponse = await request(app)
            .post('/api/item/add-item')
            .set('Authorization', `Bearer ${userToken1}`)
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

        // 내 아이템 목록 조회
        const getItemListResponse = await request(app)
            .get('/api/item/get-item-list')
            .set('Authorization', `Bearer ${userToken1}`);

        // 응답 데이터 확인
        expect(getItemListResponse.body.itemList[0].itemName).toBe('testItem');

        // 해당 아이템의 UUID
        const itemUUID = getItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저 생성
        const signupResponse2 = await request(app)
        .post('/api/user/signup')
        .send(getTestSignUpUserData(2));

        // 테스트용 유저 로그인
        const loginResponse2 = await request(app).post('/api/user/login').send({
            userID: getTestSignUpUserData(2).userID,
            userPassword: getTestSignUpUserData(2).userPassword,
            userDeviceID: getTestSignUpUserData(2).userDeviceID,
        });

        const userToken2 = loginResponse2.body.token;

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken2}`)
            .query({ itemUUID: itemUUID });

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);

        // 응답 데이터 확인
        expect(response.body.item.itemName).toBe('testItem');

        // 응답 데이터 확인
        expect(response.body.item.itemViews).toBe(1);

        // 다시 요청
        const response2 = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken2}`)
            .query({ itemUUID: itemUUID });

        // 응답 코드 확인
        expect(response2.statusCode).toBe(200);

        // 응답 데이터 확인
        expect(response2.body.item.itemName).toBe('testItem');

        // 응답 데이터 확인
        expect(response2.body.item.itemViews).toBe(2);
    });
});