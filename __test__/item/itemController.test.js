// __tests__/item/itemController.test.js

// 필요한 라이브러리 불러오기
const request = require('supertest'); // HTTP 요청을 모의하기 위해 사용
const express = require('express');

// 필요한 Model 가져오기
const { createItemModel } = require('../../packages/shared/models/itemModel');
const { Category, getAllCategories } = require('../../packages/shared/models/categoryModel');
const { getTestLocationData } = require('../../packages/shared/models/locationModel');
const { getTestSignUpUserData, createUserModel } = require('../../packages/shared/models/userModel');
const { createChatModel } = require('../../packages/shared/models/chatModel');

// 필요한 Util 불러오기
const { connectDB, disconnectDB, DBType } = require('../../packages/shared/utils/db');
const { generateToken } = require('../../packages/shared/utils/auth');

// 필요한 라우터 가져오기
const itemRoutes = require('../../packages/server_item/routes/itemRoutes');
const userRoutes = require('../../packages/server_user/routes/userRoutes');
const chatRoutes = require('../../packages/server_chat/routes/chatRoutes');

// Express 앱 생성
const app = express();
app.use(express.json());

// 라우터 설정
app.use('/api/item', itemRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);

// DB 선언
/**
 * @type {import('mongoose').Connection}
 */
let itemDB;
/**
 * @type {import('mongoose').Connection}
 */
let userDB;
/**
 * @type {import('mongoose').Connection}
 */
let chatDB;

// Model 선언
/**
 * @type {import('mongoose').Model<import('../../packages/shared/models/itemModel').itemSchema, {}>}
 */
let Item;
/**
 * @type {import('mongoose').Model<import('../../packages/shared/models/userModel').userSchema, {}>}
 */
let User;
/**
 * @type {import('mongoose').Model<import('../../packages/shared/models/chatModel').chatSchema, {}>}
 */
let Chat;


// 테스트 시작 전 DB 연결
beforeAll(async () => {
    itemDB = await connectDB(DBType.ITEM);
    userDB = await connectDB(DBType.USER);
    chatDB = await connectDB(DBType.CHAT);

    if (!itemDB || !userDB) {
        console.error('Error connecting to DB');
        return;
    }

    Item = createItemModel(itemDB);
    User = createUserModel(userDB);
    Chat = createChatModel(chatDB);
});

// 테스트 종료 후 DB 연결 해제
afterAll(async () => {
    await disconnectDB(DBType.ITEM);
    await disconnectDB(DBType.USER);
    await disconnectDB(DBType.CHAT);
});

// 각 테스트 시작 전 DB 초기화
beforeEach(async () => {
    await Item.deleteMany({});
    await User.deleteMany({});
    await Chat.deleteMany({});
});

/**
 * @name getUserToken
 * @description 회원가입 및 로그인을 수행하여 유저 토큰을 반환하는 함수
 * 
 * @param {Number} index - 테스트용 회원가입 데이터 인덱스
 * 
 * @return {String} - 유저 토큰
 */
const getUserToken = async (index) => {
    // 테스트용 유저 생성
    await request(app)
        .post('/api/user/signup')
        .send(getTestSignUpUserData(index));

    // 테스트용 유저 로그인
    const loginResponse = await request(app).post('/api/user/login').send({
        userID: getTestSignUpUserData(index).userID,
        userPassword: getTestSignUpUserData(index).userPassword,
        userDeviceID: getTestSignUpUserData(index).userDeviceID,
    });
    return loginResponse.body.token;
}

/**
 * @name getTestItemData
 * @description 테스트용 아이템 데이터를 반환하는 함수
 * 
 * @param {Number} index - 테스트용 아이템 데이터 인덱스
 * @param {String?} itemUUID - 아이템 UUID
 * 
 * @return {Object} - 테스트용 아이템 데이터
 */
const getTestItemData = (index, itemUUID) => {
    return {
        itemUUID: itemUUID,
        itemCategory: Category.ELECTRONICS,
        itemName: itemUUID ? `updatedTestItem${index}` : `testItem${index}`,
        itemImages: [
            '0',
        ],
        itemDescription: itemUUID ? `updatedTestDescription${index}` : `testDescription${index}`,
        itemPrice: 10000,
        itemFeelingOfUse: 1,
        itemBarterPlace: getTestLocationData(),
        itemStatus: 1,
    };
}

/**
 * @name addItemFunction
 * @description 아이템을 추가하는 함수
 * 
 * @param {String?} userToken - 유저 토큰
 * @param {Number} index - 테스트용 아이템 데이터 인덱스
 * 
 * @return {Response} - 응답
 */
const addItemFunction = async (userToken, index) => {
    if (userToken === null) {
        return await request(app)
            .post('/api/item/add-item')
            .send(getTestItemData(index));
    }

    return await request(app)
        .post('/api/item/add-item')
        .set('Authorization', `Bearer ${userToken}`)
        .send(getTestItemData(index));
}

/**
 * @name updateItemFunction
 * @description 아이템을 수정하는 함수
 * 
 * @param {String?} userToken - 유저 토큰
 * @param {Number} index - 테스트용 아이템 데이터 인덱스
 * @param {String?} itemUUID - 아이템 UUID
 * 
 * @return {Response} - 응답
 */
const updateItemFunction = async (userToken, index, itemUUID) => {
    if (userToken === null) {
        return await request(app)
            .post('/api/item/update-item')
            .send(getTestItemData(index, itemUUID));
    }

    return await request(app)
        .post('/api/item/update-item')
        .set('Authorization', `Bearer ${userToken}`)
        .send(getTestItemData(index, itemUUID));
}

// Health Check API 테스트
describe('GET /api/item/health-check', () => {
    it('DB가 연결된 상태일 때, 200 상태 코드를 반환한다.', async () => {
        const response = await request(app).get('/api/item/health-check');
        expect(response.statusCode).toBe(200);
    });

    it('DB가 연결 해제된 상태일 때, 500 상태 코드를 반환한다.', async () => {
        await disconnectDB(DBType.ITEM);

        // 요청
        const response = await request(app).get('/api/item/health-check');
        expect(response.statusCode).toBe(500);

        // User DB 재연결
        await connectDB(DBType.ITEM);

        // 응답 코드 확인
        const response2 = await request(app).get('/api/item/health-check');
        expect(response2.statusCode).toBe(200);
    });
});

// addItem API 테스트
describe('POST /api/item/add-item', () => {
    it('정상적으로 item이 등록되면 200 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);
        
        const response = await addItemFunction(userToken, 1);
        expect(response.statusCode).toBe(200);
    });

    it('Parameter Validation에 실패하면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

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
        expect(response.statusCode).toBe(400);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await addItemFunction(null, 1);
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        const response = await addItemFunction(userToken, 1);
        expect(response.statusCode).toBe(402);
    });
});

// getUsersItemList API 테스트
describe('GET /api/item/get-users-item-list', () => {
    it('정상적으로 item 목록을 가져오면 200 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        await addItemFunction(userToken, 1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.itemList[0].itemName).toBe(getTestItemData(1).itemName);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        const response = await request(app)
            .get('/api/item/get-users-item-list')
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        // 요청
        const response = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(response.statusCode).toBe(402);
    });

    it('아이템이 없으면 빈 배열을 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.itemList).toEqual([]);
    });
});

// updateItem API 테스트
describe('POST /api/item/update-item', () => {
    it('정상적으로 item이 수정되면 200 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        await addItemFunction(userToken, 1);

        // 내 아이템 목록 조회
        const getUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(getUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const itemUUID = getUsersItemListResponse.body.itemList[0].itemUUID;

        // 아이템 수정
        const response = await updateItemFunction(userToken, 1, itemUUID);
        expect(response.statusCode).toBe(200);

        // 내 아이템 목록 조회
        const updatedItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(updatedItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, itemUUID).itemName);
    });

    it('Parameter Validation에 실패하면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 아이템 추가
        await addItemFunction(userToken, 1);

        // 내 아이템 목록 조회
        const getUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(getUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const itemUUID = getUsersItemListResponse.body.itemList[0].itemUUID;

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
        expect(response.statusCode).toBe(400);

        // 내 아이템 목록 조회
        const updatedItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(updatedItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await updateItemFunction(null, 1, 'testItemUUID');
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        // 요청
        const response = await updateItemFunction(userToken, 1, 'testItemUUID');
        expect(response.statusCode).toBe(402);
    });

    it('해당 아이템의 소유자가 아니면 402 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 아이템 추가
        await addItemFunction(userToken, 1);

        // 내 아이템 목록 조회
        const getUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(getUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const itemUUID = getUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저 생성
        const userToken2 = await getUserToken(2);
        const response = await updateItemFunction(userToken2, 1, itemUUID);
        expect(response.statusCode).toBe(402);

        // 내 아이템 목록 조회
        const updatedItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(updatedItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);
    });

    it('해당 아이템이 없으면 404 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);
        const response = await updateItemFunction(userToken, 1, 'testItemUUID');
        expect(response.statusCode).toBe(404);
    });
});

// deleteItem API 테스트
describe('DELETE /api/item/delete-item', () => {
    it('정상적으로 item이 삭제되면 200 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 아이템 추가
        await addItemFunction(userToken, 1);

        // 내 아이템 목록 조회
        const getUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(getUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const itemUUID = getUsersItemListResponse.body.itemList[0].itemUUID;
        const response = await request(app)
            .delete('/api/item/delete-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemUUID: itemUUID });
        expect(response.statusCode).toBe(200);

        // 내 아이템 목록 조회
        const updatedItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(updatedItemListResponse.body.itemList).toEqual([]);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        const response = await request(app)
            .delete('/api/item/delete-item')
            .send({ itemUUID: 'testItemUUID' });
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        const response = await request(app)
            .delete('/api/item/delete-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ itemUUID: 'testItemUUID' });
        expect(response.statusCode).toBe(402);
    });

    it('해당 아이템의 소유자가 아니면 402 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 아이템 추가
        await addItemFunction(userToken, 1);

        // 내 아이템 목록 조회
        const getUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(getUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const itemUUID = getUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저 생성
        const userToken2 = await getUserToken(2);

        // 요청
        const response = await request(app)
            .delete('/api/item/delete-item')
            .set('Authorization', `Bearer ${userToken2}`)
            .send({
                itemUUID: itemUUID,
            });
        expect(response.statusCode).toBe(402);

        // 내 아이템 목록 조회
        const updatedItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(updatedItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);
    });

    it('해당 아이템이 없으면 404 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        const response = await request(app)
            .delete('/api/item/delete-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                itemUUID: 'testItemUUID',
            });
        expect(response.statusCode).toBe(404);
    });

    it('itemUUID가 없으면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        const response = await request(app)
            .delete('/api/item/delete-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({});
        expect(response.statusCode).toBe(400);
    });
});

// getItemInfo API 테스트
describe('GET /api/item/get-item-info', () => {
    it('정상적으로 item 정보를 가져오면 200 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 아이템 추가
        await addItemFunction(userToken, 1);

        // 내 아이템 목록 조회
        const getUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(getUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const itemUUID = getUsersItemListResponse.body.itemList[0].itemUUID;
        const response = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ itemUUID: itemUUID });
        expect(response.statusCode).toBe(200);
        expect(response.body.item.itemName).toBe(getTestItemData(1, null).itemName);
    });

    it('Parameter Validation에 실패하면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청, 테스트를 위해 데이터를 누락시킴
        const response = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken}`)
            .query({});
        expect(response.statusCode).toBe(400);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await request(app)
            .get('/api/item/get-item-info')
            .query({ itemUUID: 'testItemUUID' });
        expect(response.statusCode).toBe(401);
    });

    it('존재하지 않는 아이템이면 404 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        const response = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ itemUUID: 'testItemUUID' });
        expect(response.statusCode).toBe(404);
    });

    it('Token의 userUUID와 itemOwnerUUID가 다르면 View Count가 1 증가한다.', async () => {
        // 테스트용 유저 생성
        const userToken1 = await getUserToken(1);

        // 아이템 추가
        await addItemFunction(userToken1, 1);

        // 내 아이템 목록 조회
        const getUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken1}`);
        expect(getUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        const itemUUID = getUsersItemListResponse.body.itemList[0].itemUUID;
        
        const userToken2 = await getUserToken(2);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken2}`)
            .query({ itemUUID: itemUUID });

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);
        expect(response.body.item.itemName).toBe(getTestItemData(1, null).itemName);
        expect(response.body.item.itemViews).toBe(1);

        // 다시 요청
        const response2 = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken2}`)
            .query({ itemUUID: itemUUID });

        // 응답 코드 확인
        expect(response2.statusCode).toBe(200);
        expect(response2.body.item.itemName).toBe(getTestItemData(1, null).itemName);
        expect(response2.body.item.itemViews).toBe(2);
    });
});

// getItemListWithQuery API 테스트
describe('GET /api/item/get-item-list-with-query', () => {
    beforeAll(async () => {
        // DB 초기화
        await Item.deleteMany({});
        await User.deleteMany({});

        // 테스트용 유저 생성
        const userToken1 = await getUserToken(1);
        const userToken2 = await getUserToken(2);

        // 아이템 추가 (getALLCategories().length * 10)
        // userToken1 또는 userToken2로 로그인한 유저가 아이템을 추가
        // 각 카테고리마다 10개씩 추가
        for (let i = 0; i < getAllCategories().length; i++) {
            const category = getAllCategories()[i];
            for (let j = 0; j < 10; j++) {
                await request(app)
                    .post('/api/item/add-item')
                    .set('Authorization', i % 2 === 0 ? `Bearer ${userToken1}` : `Bearer ${userToken2}`)
                    .send({
                        itemCategory:category,
                        itemName: `testItem${i * 10 + j}`,
                        itemImages: [
                            '0',
                        ],
                        itemDescription: 'testDescription',
                        itemPrice: 10000 + i * 10 + j,
                        itemFeelingOfUse: Math.floor(Math.random() * 5),
                        itemBarterPlace: getTestLocationData(),
                    });
            }
        }
    });

    it('정상적으로 item 목록을 가져오면 200 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ itemName: 'testItem' });
        expect(response.statusCode).toBe(200);
        expect(response.body.itemList.length).toBe(10);
        expect(response.body.itemList[0].itemName).toBe('testItem'+(getAllCategories().length * 10 - 1));
        expect(response.body.itemList[9].itemName).toBe('testItem'+(getAllCategories().length * 10 - 10));
    });

    it('query.limit, query.page 테스트', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ itemName: 'testItem', limit: 20});

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);
        expect(response.body.itemList.length).toBe(20);
        expect(response.body.itemList[0].itemName).toBe('testItem'+(getAllCategories().length * 10 - 1));
        expect(response.body.itemList[19].itemName).toBe('testItem'+(getAllCategories().length * 10 - 20));

        // 요청
        const response2 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ itemName: 'testItem', limit: 20, page: 2 });

        // 응답 코드 확인
        expect(response2.statusCode).toBe(200);
        expect(response2.body.itemList.length).toBe(20);
        expect(response2.body.itemList[0].itemName).toBe('testItem'+(getAllCategories().length * 10 - 21));
        expect(response2.body.itemList[9].itemName).toBe('testItem'+(getAllCategories().length * 10 - 30));

        // 요청
        const response3 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ itemName: 'testItem', limit: 10, page: 1000 });

        // 응답 코드 확인
        expect(response3.statusCode).toBe(200);
        expect(response3.body.itemList.length).toBe(0);
    });

    it('query.sort 테스트', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ itemName: 'testItem', sort: 2 });
        // 응답 코드 확인
        expect(response.statusCode).toBe(200);
        // 첫번째 아이템과 마지막 아이템의 가격을 비교하여, 오름차순 정렬되었는지 확인
        expect(response.body.itemList[0].itemPrice).toBeLessThanOrEqual(response.body.itemList[9].itemPrice);

        // 요청
        const response2 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ itemName: 'testItem', sort: -2 });
        // 응답 코드 확인
        expect(response2.statusCode).toBe(200);
        // 첫번째 아이템과 마지막 아이템의 가격을 비교하여, 내림차순 정렬되었는지 확인
        expect(response2.body.itemList[0].itemPrice).toBeGreaterThanOrEqual(response2.body.itemList[9].itemPrice);
    });

    it('query.search 테스트', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ search: 'testItem29' });

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);
        expect(response.body.itemList.length).toBe(1);
        expect(response.body.itemList[0].itemName).toBe('testItem29');

        // 요청
        const response2 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ search: 'testItem2', limit: 11 });
        expect(response2.statusCode).toBe(200);
        expect(response2.body.itemList.length).toBe(11);
        expect(response2.body.itemList[0].itemName).toBe('testItem29');
        expect(response2.body.itemList[10].itemName).toBe('testItem2');

        // 없는 아이템 요청
        const response3 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ search: 'notExistItem' });
        expect(response3.statusCode).toBe(200);
        expect(response3.body.itemList.length).toBe(0);

        // TODO : 부분 일치 검색 기능 추가
        // 부분 일치 검색
        // const response4 = await request(app)
        //     .get('/api/item/get-item-list-with-query')
        //     .set('Authorization', `Bearer ${userToken}`)
        //     .query({ search: 'tsItem2' });

        // // 응답 코드 확인
        // expect(response4.statusCode).toBe(200);

        // // 응답 데이터 확인
        // expect(response4.body.itemList.length).toBe(11);

        // // 응답 데이터 확인
        // expect(response4.body.itemList[0].itemName).toBe('testItem29');
        // expect(response4.body.itemList[10].itemName).toBe('testItem2');
    });

    it('query.categoryMap 테스트', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ categoryMap: {
                [Category.ELECTRONICS]: 0
            }});
        expect(response.statusCode).toBe(200);

        // 응답 데이터 확인 (응답 데이터 중에서 전자제품 카테고리와 다른 카테고리의 비율이 0.5로 같아야 함)
        let electronicsCount = response.body.itemList.filter((item) => item.itemCategory === Category.ELECTRONICS.toString()).length;
        let anotherCount = response.body.itemList.filter((item) => item.itemCategory !== Category.ELECTRONICS.toString()).length;
        expect(electronicsCount).toBe(anotherCount);

        // 요청
        const response2 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ categoryMap: { 
                [Category.ELECTRONICS]: 0, 
                [Category.FURNITURE]: 1, 
            }});
        expect(response2.statusCode).toBe(200);

        // 비율 확인
        electronicsCount = response2.body.itemList.filter((item) => item.itemCategory === Category.ELECTRONICS.toString()).length;
        let furnitureCount = response2.body.itemList.filter((item) => item.itemCategory === Category.FURNITURE.toString()).length;
        anotherCount = response2.body.itemList.filter((item) => item.itemCategory !== Category.ELECTRONICS.toString() && item.itemCategory !== Category.FURNITURE.toString()).length;

        expect(electronicsCount).toBeGreaterThan(furnitureCount);
        expect(furnitureCount).toBe(anotherCount);
    });

    it('query.categoryList 테스트', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ categoryList: [Category.ELECTRONICS].toString() });

        // 응답 코드 확인
        expect(response.statusCode).toBe(200);
        expect(response.body.itemList.length).toBe(10);

        // 응답 데이터 확인
        response.body.itemList.forEach((item) => {
            expect(item.itemCategory).toBe(Category.ELECTRONICS.toString());
        });

        // 요청
        const response2 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ categoryList: [Category.ELECTRONICS, Category.FURNITURE].toString() });

        // 응답 코드 확인
        expect(response2.statusCode).toBe(200);
        expect(response2.body.itemList.length).toBe(10);

        // 응답 데이터 확인
        response2.body.itemList.forEach((item) => {
            const trueOfFalse = item.itemCategory === Category.ELECTRONICS.toString() || item.itemCategory === Category.FURNITURE.toString();
            expect(trueOfFalse).toBe(true);
        });

        // 요청
        const response3 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ categoryList: [Category.ELECTRONICS, Category.FURNITURE, Category.BOOK, Category.FURNITURE].toString() });
        
        // 응답 코드 확인
        expect(response3.statusCode).toBe(200);
        expect(response3.body.itemList.length).toBe(10);

        // 응답 데이터 확인
        response3.body.itemList.forEach((item) => {
            const trueOfFalse = item.itemCategory === Category.ELECTRONICS.toString() || item.itemCategory === Category.FURNITURE.toString() || item.itemCategory === Category.BOOK.toString() || item.itemCategory === Category.FURNITURE.toString();
            expect(trueOfFalse).toBe(true);
        });
    });

    it('query.priceMin, query.priceMax 테스트', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ priceMin: 10100 });
        expect(response.statusCode).toBe(200);

        // 응답 데이터 확인
        response.body.itemList.forEach((item) => {
            expect(item.itemPrice).toBeGreaterThanOrEqual(10100);
        });

        // 요청
        const response2 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ priceMin: 10000, priceMax: 10010 });
        expect(response2.statusCode).toBe(200);

        // 응답 데이터 확인
        response2.body.itemList.forEach((item) => {
            expect(item.itemPrice).toBeGreaterThanOrEqual(10000);
            expect(item.itemPrice).toBeLessThanOrEqual(10010);
        });

        // 요청
        const response3 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ priceMax: 10000 });
        expect(response3.statusCode).toBe(200);

        // 응답 데이터 확인
        response3.body.itemList.forEach((item) => {
            expect(item.itemPrice).toBeLessThanOrEqual(10000);
        });
    });

    it('query.feelingOfUse 테스트', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ feelingOfUseMin: 2 });
        expect(response.statusCode).toBe(200);

        // 응답 데이터 확인
        response.body.itemList.forEach((item) => {
            expect(item.itemFeelingOfUse).toBeLessThanOrEqual(2);
        });

        // 요청
        const response2 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ feelingOfUseMin: 4 });
        expect(response2.statusCode).toBe(200);

        // 응답 데이터 확인
        response2.body.itemList.forEach((item) => {
            expect(item.itemFeelingOfUse).toBeLessThanOrEqual(4);
        });
    });

    it('query.statusList 테스트', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ statusList: [0, 1].toString() }); 
        expect(response.statusCode).toBe(200);

        // 응답 데이터 확인
        response.body.itemList.forEach((item) => {
            const trueOfFalse = item.itemStatus === 0 || item.itemStatus === 1;
            expect(trueOfFalse).toBe(true);
        });

        // 요청
        const response2 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ statusList: [0].toString() });
        expect(response2.statusCode).toBe(200);

        // 응답 데이터 확인
        response2.body.itemList.forEach((item) => {
            expect(item.itemStatus).toBe(0);
        });
    });

    it('결과가 없어도 200 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ search: 'notExistItem' });
        expect(response.statusCode).toBe(200);
        expect(response.body.itemList.length).toBe(0);
    });

    it('Parameter Validation에 실패하면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청, 테스트를 위해 데이터를 누락시킴
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({
                priceMax: 'Test',
            });
        expect(response.statusCode).toBe(400);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .query({ itemName: 'testItem' });

        // 응답 코드 확인
        expect(response.statusCode).toBe(401);
    });

    it('itemLikedUsers, itemUnlikedUsers, itemBarterUsers에 검색하는 User의 userUUID가 포함되는 결과는 제외하고 검색한다.', async () => {
        const userToken = await getUserToken(1);
        const userToken2 = await getUserToken(2);
        const userToken3 = await getUserToken(3);

        // 두 유저의 아이템을 2개씩 생성
        await addItemFunction(userToken, 1);
        await addItemFunction(userToken, 2);
        await addItemFunction(userToken2, 3);
        await addItemFunction(userToken2, 4);

        // 첫번째 유저의 아이템 목록 조회
        const firstItemResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(firstItemResponse.statusCode).toBe(200);

        // 두번째 유저의 아이템 목록 조회
        const secondItemResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken2}`);
        expect(secondItemResponse.statusCode).toBe(200);

        // 첫번째 유저가 두번째 유저의 아이템을 좋아요 요청
        const likeItemResponse = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                myItemUUID: firstItemResponse.body.itemList[0].itemUUID,
                targetItemUUID: secondItemResponse.body.itemList[0].itemUUID,
            });
        expect(likeItemResponse.statusCode).toBe(200);

        // 첫번째 유저가 전체 아이템 검색
        const response = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken}`)
            .query({ });
        expect(response.statusCode).toBe(200);

        // 응답 데이터 확인 (본인 아이템, 좋아요 한 아이템, 싫어요 한 아이템, 교환 요청한 아이템이 포함되어 있으면 안됨)
        let firstUserCount = 0;
        let secondUserCount = 0;

        response.body.itemList.forEach((item) => {
            if (item.itemOwnerUUID === firstItemResponse.body.itemList[0].itemOwnerUUID) {
                firstUserCount++;
            }
            if (item.itemOwnerUUID === secondItemResponse.body.itemList[0].itemOwnerUUID) {
                secondUserCount++;
            }
            // 본인 아이템이 포함되어 있으면 안됨
            expect(item.itemOwnerUUID).not.toBe(firstItemResponse.body.itemList[0].itemOwnerUUID);

            // 좋아요 한 아이템이 포함되어 있으면 안됨
            Object.entries(item.itemLikedUsers).forEach(([key, value]) => {
                expect(key).not.toBe(firstItemResponse.body.itemList[0].itemOwnerUUID);
            });
            
            // 싫어요 한 아이템이 포함되어 있으면 안됨
            Object.entries(item.itemUnlikedUsers).forEach(([key, value]) => {
                expect(key).not.toBe(firstItemResponse.body.itemList[0].itemOwnerUUID);
            });

            // 교환 요청한 아이템이 포함되어 있으면 안됨
            Object.entries(item.itemMatchedUsers).forEach(([key, value]) => {
                expect(key).not.toBe(firstItemResponse.body.itemList[0].itemOwnerUUID);
            });
        });
        expect(firstUserCount).toBe(0);
        expect(secondUserCount).toBe(1);


        // 두번째 유저가 첫번째 유저의 아이템을 싫어요 요청
        const unlikeItemResponse = await request(app)
            .post('/api/item/request-unlike-item')
            .set('Authorization', `Bearer ${userToken2}`)
            .send({
                targetItemUUID: firstItemResponse.body.itemList[1].itemUUID,
            });
        expect(unlikeItemResponse.statusCode).toBe(200);

        // 두번째 유저가 전체 아이템 검색
        const response2 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken2}`)
            .query({ });
        expect(response2.statusCode).toBe(200);

        // 응답 데이터 확인 (본인 아이템, 좋아요 한 아이템, 싫어요 한 아이템, 교환 요청한 아이템이 포함되어 있으면 안됨)
        let firstUserCountOfResponse2 = 0;
        let secondUserCountResponse2 = 0;
        response2.body.itemList.forEach((item) => {
            if (item.itemOwnerUUID === firstItemResponse.body.itemList[0].itemOwnerUUID) {
                firstUserCountOfResponse2++;
            }
            if (item.itemOwnerUUID === secondItemResponse.body.itemList[0].itemOwnerUUID) {
                secondUserCountResponse2++;
            }
            // 본인 아이템이 포함되어 있으면 안됨
            expect(item.itemOwnerUUID).not.toBe(secondItemResponse.body.itemList[0].itemOwnerUUID);

            // 좋아요 한 아이템이 포함되어 있으면 안됨
            Object.entries(item.itemLikedUsers).forEach(([key, value]) => {
                expect(key).not.toBe(secondItemResponse.body.itemList[0].itemOwnerUUID);
            });
            
            // 싫어요 한 아이템이 포함되어 있으면 안됨
            Object.entries(item.itemUnlikedUsers).forEach(([key, value]) => {
                expect(key).not.toBe(secondItemResponse.body.itemList[0].itemOwnerUUID);
            });

            // 교환 요청한 아이템이 포함되어 있으면 안됨
            Object.entries(item.itemMatchedUsers).forEach(([key, value]) => {
                expect(key).not.toBe(secondItemResponse.body.itemList[0].itemOwnerUUID);
            });
        });
        expect(firstUserCountOfResponse2).toBe(1);
        expect(secondUserCountResponse2).toBe(0);

        // 세번째 유저가 전체 아이템 검색
        const response3 = await request(app)
            .get('/api/item/get-item-list-with-query')
            .set('Authorization', `Bearer ${userToken3}`)
            .query({ });
        expect(response3.statusCode).toBe(200);

        // 응답 데이터 확인 (모든 아이템이 포함되어 있어야 함)
        // 모든 아이템을 읽어서 첫번째, 두번째 유저의 아이템이 포함되어 있는 지 확인
        let firstUserCountOfResponse3 = 0;
        let secondUserCountResponse3 = 0;
        response3.body.itemList.forEach((item) => {
            if (item.itemOwnerUUID === firstItemResponse.body.itemList[0].itemOwnerUUID) {
                firstUserCountOfResponse3++;
            }
            if (item.itemOwnerUUID === secondItemResponse.body.itemList[0].itemOwnerUUID) {
                secondUserCountResponse3++;
            }
        });

        expect(firstUserCountOfResponse3).toBe(2);
        expect(secondUserCountResponse3).toBe(2);
    });
});

// POST /api/item/request-like-item API 테스트
describe('POST /api/item/request-like-item', () => {
    it('정상적으로 아이템 좋아요 요청이 되면 200 상태 코드를 반환한다.', async () => {
        const userToken1 = await getUserToken(1);
        const userToken2 = await getUserToken(2);

        // 아이템 추가
        await addItemFunction(userToken1, 1);
        await addItemFunction(userToken2, 2);

        // 내 아이템 목록 조회
        const getFirstUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken1}`);
        expect(getFirstUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const myItemUUID = getFirstUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저의 아이템 목록 조회
        const getSecondUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken2}`);
        expect(getSecondUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(2, null).itemName);

        // 해당 아이템의 UUID
        const targetItemUUID = getSecondUsersItemListResponse.body.itemList[0].itemUUID;

        // 첫번째 유저가 두번째 유저의 아이템을 좋아요 요청
        const response = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                myItemUUID: myItemUUID,
                targetItemUUID: targetItemUUID,
            });
        expect(response.statusCode).toBe(200);

        // getItemInfo 요청
        const getItemInfoResponse = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken2}`)
            .query({ itemUUID: targetItemUUID });
        expect(getItemInfoResponse.statusCode).toBe(200);

        for (const [_, value] of Object.entries(getItemInfoResponse.body.item.itemLikedUsers)) {
            // 좋아요 요청한 ItemUUID가 정확한지 확인
            expect(value === myItemUUID).toBe(true);
        }
    });

    it('Parameter Validation에 실패하면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청, 테스트를 위해 데이터를 누락시킴
        const response = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                myItemUUID: 'testItemUUID',
            });
        expect(response.statusCode).toBe(400);
    });

    it('해당 아이템이 없으면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                myItemUUID: 'testItemUUID',
                targetItemUUID: 'testItemUUID',
            });
        expect(response.statusCode).toBe(400);
    });

    it('해당 아이템의 소유자가 아니면 400 상태 코드를 반환한다.', async () => {
        const userToken1 = await getUserToken(1);
        const userToken2 = await getUserToken(2);

        // 아이템 추가
        await addItemFunction(userToken1, 1);
        await addItemFunction(userToken2, 2);

        // 내 아이템 목록 조회
        const getFirstUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken1}`);
        expect(getFirstUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const myItemUUID = getFirstUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저의 아이템 목록 조회
        const getSecondUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken2}`);
        expect(getSecondUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(2, null).itemName);

        // 해당 아이템의 UUID
        const targetItemUUID = getSecondUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저 생성
        const userToken3 = await getUserToken(3);

        // 요청
        const response = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken3}`)
            .send({
                myItemUUID: myItemUUID,
                targetItemUUID: targetItemUUID,
            });
        expect(response.statusCode).toBe(400);
    });

    it('자신의 아이템에 좋아요 요청을 하면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 아이템 추가
        await addItemFunction(userToken, 1);

        // 내 아이템 목록 조회
        const getUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken}`);
        expect(getUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const itemUUID = getUsersItemListResponse.body.itemList[0].itemUUID;

        // 요청
        const response = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                myItemUUID: itemUUID,
                targetItemUUID: itemUUID,
            });
        expect(response.statusCode).toBe(400);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await request(app)
            .post('/api/item/request-like-item')
            .send({ myItemUUID: 'testItemUUID' });
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        // 요청
        const response = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                myItemUUID: 'testItemUUID',
                targetItemUUID: 'testItemUUID',
            });
        expect(response.statusCode).toBe(402);
    });

    it('이미 좋아요 요청을 한 아이템이어도 200 상태 코드를 반환한다.', async () => {
        const userToken1 = await getUserToken(1);
        const userToken2 = await getUserToken(2);

        // 아이템 추가
        await addItemFunction(userToken1, 1);
        await addItemFunction(userToken2, 2);

        // 내 아이템 목록 조회
        const getFirstUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken1}`);
        expect(getFirstUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const myItemUUID = getFirstUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저의 아이템 목록 조회
        const getSecondUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken2}`);
        expect(getSecondUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(2, null).itemName);

        // 해당 아이템의 UUID
        const targetItemUUID = getSecondUsersItemListResponse.body.itemList[0].itemUUID;

        // 첫번째 유저가 두번째 유저의 아이템을 좋아요 요청
        const response = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                myItemUUID: myItemUUID,
                targetItemUUID: targetItemUUID,
            });
        expect(response.statusCode).toBe(200);

        // 다시 요청
        const response2 = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                myItemUUID: myItemUUID,
                targetItemUUID: targetItemUUID,
            });
        expect(response2.statusCode).toBe(200);
    });

    it('이미 Unlike 요청을 한 아이템이면, Like로 전환 후 200 상태 코드를 반환한다.', async () => {
        const userToken1 = await getUserToken(1);
        const userToken2 = await getUserToken(2);

        // 아이템 추가
        await addItemFunction(userToken1, 1);
        await addItemFunction(userToken2, 2);

        // 내 아이템 목록 조회
        const getFirstUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken1}`);
        expect(getFirstUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const myItemUUID = getFirstUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저의 아이템 목록 조회
        const getSecondUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken2}`);
        expect(getSecondUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(2, null).itemName);

        // 해당 아이템의 UUID
        const targetItemUUID = getSecondUsersItemListResponse.body.itemList[0].itemUUID;

        // 첫번째 유저가 두번째 유저의 아이템을 좋아요 요청
        const response = await request(app)
            .post('/api/item/request-unlike-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                targetItemUUID: targetItemUUID,
            });
        expect(response.statusCode).toBe(200);

        // 다시 Like 요청
        const response2 = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                myItemUUID: myItemUUID,
                targetItemUUID: targetItemUUID,
            });
        expect(response2.statusCode).toBe(200);

        // getItemInfo 요청
        const getItemInfoResponse = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken2}`)
            .query({ itemUUID: targetItemUUID });

        // itemLikedUsers 길이가 증가했는지 확인
        const itemLikedUsersLength = Object.entries(getItemInfoResponse.body.item.itemLikedUsers).length;
        expect(itemLikedUsersLength).toBe(1);

        // itemUnlikedUsers 길이가 감소했는지 확인
        expect(getItemInfoResponse.body.item.itemUnlikedUsers.length).toBe(0);
    });

});

// POST /api/item/request-unlike-item API 테스트
describe('POST /api/item/request-unlike-item', () => {
    it('정상적으로 아이템 unlike 요청이 되면 200 상태 코드를 반환한다.', async () => {
        const userToken1 = await getUserToken(1);
        const userToken2 = await getUserToken(2);

        // 아이템 추가
        await addItemFunction(userToken1, 1);
        await addItemFunction(userToken2, 2);

        // 내 아이템 목록 조회
        const getFirstUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken1}`);
        expect(getFirstUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const myItemUUID = getFirstUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저의 아이템 목록 조회
        const getSecondUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken2}`);
        expect(getSecondUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(2, null).itemName);

        // 해당 아이템의 UUID
        const targetItemUUID = getSecondUsersItemListResponse.body.itemList[0].itemUUID;

        // 첫번째 유저가 두번째 유저의 아이템에 Unlike 요청
        const response = await request(app)
            .post('/api/item/request-unlike-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                targetItemUUID: targetItemUUID,
            });
        expect(response.statusCode).toBe(200);

        // getItemInfo 요청
        const getItemInfoResponse = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken2}`)
            .query({ itemUUID: targetItemUUID });
        expect(getItemInfoResponse.statusCode).toBe(200);

        // itemUnlikedUsers 길이가 증가했는지 확인
        expect(getItemInfoResponse.body.item.itemUnlikedUsers.length).toBe(1);
    });

    it('이미 Like 요청을 한 아이템이면 400 상태 코드를 반환한다.', async () => {
        const userToken1 = await getUserToken(1);
        const userToken2 = await getUserToken(2);

        // 아이템 추가
        await addItemFunction(userToken1, 1);
        await addItemFunction(userToken2, 2);

        // 내 아이템 목록 조회
        const getFirstUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken1}`);
        expect(getFirstUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const myItemUUID = getFirstUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저의 아이템 목록 조회
        const getSecondUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken2}`);
        expect(getSecondUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(2, null).itemName);

        // 해당 아이템의 UUID
        const targetItemUUID = getSecondUsersItemListResponse.body.itemList[0].itemUUID;

        // 첫번째 유저가 두번째 유저의 아이템을 좋아요 요청
        const response = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                myItemUUID: myItemUUID,
                targetItemUUID: targetItemUUID,
            });
        expect(response.statusCode).toBe(200);

        // 다시 Unlike 요청
        const response2 = await request(app)
            .post('/api/item/request-unlike-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                targetItemUUID: targetItemUUID,
            });
        expect(response2.statusCode).toBe(400);
    });

    it('이미 Unlike 요청을 한 아이템이어도 200 상태 코드를 반환한다.', async () => {
        const userToken1 = await getUserToken(1);
        const userToken2 = await getUserToken(2);

        // 아이템 추가
        await addItemFunction(userToken1, 1);
        await addItemFunction(userToken2, 2);

        // 내 아이템 목록 조회
        const getFirstUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken1}`);
        expect(getFirstUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const myItemUUID = getFirstUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저의 아이템 목록 조회
        const getSecondUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken2}`);
        expect(getSecondUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(2, null).itemName);

        // 해당 아이템의 UUID
        const targetItemUUID = getSecondUsersItemListResponse.body.itemList[0].itemUUID;

        // 첫번째 유저가 두번째 유저의 아이템에 Unlike 요청
        const response = await request(app)
            .post('/api/item/request-unlike-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                targetItemUUID: targetItemUUID,
            });
        expect(response.statusCode).toBe(200);

        // 다시 요청
        const response2 = await request(app)
            .post('/api/item/request-unlike-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                targetItemUUID: targetItemUUID,
            });
        expect(response2.statusCode).toBe(200);

        // UnLike 길이가 변함 없는지 확인
        const getItemInfoResponse = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken2}`)
            .query({ itemUUID: targetItemUUID });

        // itemUnlikedUsers 길이가 증가했는지 확인
        expect(getItemInfoResponse.body.item.itemUnlikedUsers.length).toBe(1);
    });

    it('Parameter Validation에 실패하면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청, 테스트를 위해 데이터를 누락시킴
        const response = await request(app)
            .post('/api/item/request-unlike-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                targetItemUUID: 'testItemUUID',
            });
        expect(response.statusCode).toBe(400);
    });

    it('해당 아이템이 없으면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .post('/api/item/request-unlike-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                targetItemUUID: 'testItemUUID',
            });
        expect(response.statusCode).toBe(400);
    });

    it('토큰이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await request(app)
            .post('/api/item/request-unlike-item')
            .send({ targetItemUUID: 'testItemUUID' });
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        // 요청
        const response = await request(app)
            .post('/api/item/request-unlike-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                targetItemUUID: 'testItemUUID',
            });
        expect(response.statusCode).toBe(402);
    });
});

// POST /api/item/request-match-item API 테스트
describe('POST /api/item/request-match-item', () => {
    it('정상적으로 아이템 매칭 요청이 되면 200 상태 코드를 반환한다.', async () => {
        const userToken1 = await getUserToken(1);
        const userToken2 = await getUserToken(2);

        // 아이템 추가
        await addItemFunction(userToken1, 1);
        await addItemFunction(userToken2, 2);

        // 내 아이템 목록 조회
        const getFirstUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken1}`);
        expect(getFirstUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const myItemUUID = getFirstUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저의 아이템 목록 조회
        const getSecondUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken2}`);
        expect(getSecondUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(2, null).itemName);

        // 해당 아이템의 UUID
        const targetItemUUID = getSecondUsersItemListResponse.body.itemList[0].itemUUID;

        // 두번째 유저가 첫번째 유저에게 itemLike 요청
        const likeResult = await request(app)
            .post('/api/item/request-like-item')
            .set('Authorization', `Bearer ${userToken2}`)
            .send({
                myItemUUID: targetItemUUID,
                targetItemUUID: myItemUUID,
            });
        expect(likeResult.statusCode).toBe(200);

        // 첫번째 유저가 두번째 유저의 아이템을 매칭 요청
        const response = await request(app)
            .post('/api/item/request-match-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                myItemUUID: myItemUUID,
                targetItemUUID: targetItemUUID,
            });
            console.log(response.body);
        expect(response.statusCode).toBe(200);

        // getItemInfo 요청
        const getFirstItemInfoResponse = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken1}`)
            .query({ itemUUID: myItemUUID });
        expect(getFirstItemInfoResponse.statusCode).toBe(200);
        const getSecondItemInfoResponse = await request(app)
            .get('/api/item/get-item-info')
            .set('Authorization', `Bearer ${userToken2}`)
            .query({ itemUUID: targetItemUUID });
        expect(getSecondItemInfoResponse.statusCode).toBe(200);

        // 두 아이템의 매칭 여부 확인
        let firstItemMatched = false;
        let secondItemMatched = false;

        // Map{String, String} 형태로 반환되는데, key는 userUUID, value는 itemUUID
        // 첫번째 유저의 아이템에 대한 매칭 여부 확인
        for (const [_, value] of Object.entries(getFirstItemInfoResponse.body.item.itemMatchedUsers)) {
            if (value === targetItemUUID) {
                firstItemMatched = true;
                break;
            }
        }
        for (const [_, value] of Object.entries(getSecondItemInfoResponse.body.item.itemMatchedUsers)) {
            if (value === myItemUUID) {
                secondItemMatched = true;
                break;
            }
        }
        expect(firstItemMatched).toBe(true);
        expect(secondItemMatched).toBe(true);

        // 두 아이템의 itemLikedUsers가 정상적으로 삭제되었는 지 확인
        let firstItemLiked = false;
        let secondItemLiked = false;

        // 좋아요 여부 확인
        for (const [_, value] of Object.entries(getFirstItemInfoResponse.body.item.itemLikedUsers)) {
            if (value === targetItemUUID) {
                firstItemLiked = true;
                break;
            }
        }
        for (const [_, value] of Object.entries(getSecondItemInfoResponse.body.item.itemLikedUsers)) {
            if (value === myItemUUID) {
                secondItemLiked = true;
                break;
            }
        }

        expect(firstItemLiked).toBe(false);
        expect(secondItemLiked).toBe(false);
    });

    it('Parameter Validation에 실패하면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청, 테스트를 위해 데이터를 누락시킴
        const response = await request(app)
            .post('/api/item/request-match-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                myItemUUID: 'testItemUUID',
            });
        expect(response.statusCode).toBe(400);
    });

    it('해당 아이템이 없으면 400 상태 코드를 반환한다.', async () => {
        const userToken = await getUserToken(1);

        // 요청
        const response = await request(app)
            .post('/api/item/request-match-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                myItemUUID: 'testItemUUID',
                targetItemUUID: 'testItemUUID',
            });
        expect(response.statusCode).toBe(400);
    });

    it('itemLikedUsers에 없는 상태에서 요청하면 400 상태 코드를 반환한다.', async () => {
        const userToken1 = await getUserToken(1);
        const userToken2 = await getUserToken(2);

        // 아이템 추가
        await addItemFunction(userToken1, 1);
        await addItemFunction(userToken2, 2);

        // 내 아이템 목록 조회
        const getFirstUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken1}`);
        expect(getFirstUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(1, null).itemName);

        // 해당 아이템의 UUID
        const myItemUUID = getFirstUsersItemListResponse.body.itemList[0].itemUUID;

        // 다른 유저의 아이템 목록 조회
        const getSecondUsersItemListResponse = await request(app)
            .get('/api/item/get-users-item-list')
            .set('Authorization', `Bearer ${userToken2}`);
        expect(getSecondUsersItemListResponse.body.itemList[0].itemName).toBe(getTestItemData(2, null).itemName);

        // 해당 아이템의 UUID
        const targetItemUUID = getSecondUsersItemListResponse.body.itemList[0].itemUUID;

        // 첫번째 유저가 두번째 유저의 아이템을 좋아요 요청하지 않음

        // 첫번째 유저가 두번째 유저의 아이템을 매칭 요청
        const response = await request(app)
            .post('/api/item/request-match-item')
            .set('Authorization', `Bearer ${userToken1}`)
            .send({
                myItemUUID: myItemUUID,
                targetItemUUID: targetItemUUID,
            });
        expect(response.statusCode).toBe(400);
    });

    it('Token이 없으면 401 상태 코드를 반환한다.', async () => {
        // 요청
        const response = await request(app)
            .post('/api/item/request-match-item')
            .send({ myItemUUID: 'testItemUUID' });
        expect(response.statusCode).toBe(401);
    });

    it('Token의 userUUID가 DB에 없으면 402 상태 코드를 반환한다.', async () => {
        const userToken = generateToken("USER", { userUUID: 'notExistUserUUID'});

        // 요청
        const response = await request(app)
            .post('/api/item/request-match-item')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                myItemUUID: 'testItemUUID',
                targetItemUUID: 'testItemUUID',
            });
        expect(response.statusCode).toBe(402);
    });
});