// __tests__/chat/chatController.test.js

// 필요한 Library를 불러옵니다.
const request = require('supertest'); // HTTP 요청을 모의하기 위해 사용
const express = require('express');

// 필요한 Util을 불러옵니다.
const { connectDB, disconnectDB, DBType } = require('../../packages/shared/utils/db');
const { getUserUUIDFromToken } = require('../../packages/shared/utils/auth');

// 필요한 Router를 불러옵니다.
const chatRoutes = require('../../packages/server_chat/routes/chatRoutes');
const userRoutes = require('../../packages/server_user/routes/userRoutes');
const itemRoutes = require('../../packages/server_item/routes/itemRoutes');

// 필요한 Model을 불러옵니다.
const { createChatModel } = require('../../packages/shared/models/chatModel');
const { createUserModel, getTestSignUpUserData } = require('../../packages/shared/models/userModel');
const { Category } = require('../../packages/shared/models/categoryModel');
const { getTestLocationData } = require('../../packages/shared/models/locationModel');

// 테스트용 Express 앱 설정
const app = express();
app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/item', itemRoutes);

// DB 및 Model 선언
/**
 * @type {import('mongoose').Connection}
 */
let chatDB;
/**
 * @type {import('mongoose').Connection}
 */
let userDB;
/**
 * @type {import('mongoose').Connection}
 */
let itemDB;
/**
 * @type {import('mongoose').Model}
 */
let Chat;
/**
 * @type {import('mongoose').Model}
 */
let User;


// 테스트 시작 전 DB 연결
beforeAll(async () => {
    chatDB = await connectDB(DBType.CHAT);
    userDB = await connectDB(DBType.USER);

    // Chat Model 생성
    Chat = createChatModel(chatDB);
    User = createUserModel(userDB);
});

// 테스트 종료 후
afterAll(async () => {
    await disconnectDB(DBType.CHAT);
    await disconnectDB(DBType.USER);
});

// 각 it 실행 전
beforeEach(async () => {
    // Chat DB 초기화
    await Chat.deleteMany({});
    await User.deleteMany({});
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
 * @name getTestItemUUID
 * @description 해당 유저의 첫번째 itemUUID를 반환하는 함수
 * 
 * @param {String} userToken - 유저 토큰
 * 
 * @return {String} - 아이템 UUID
 */
const getTestItemUUID = async (userToken) => {
    const getUsersItemListResponse = await request(app)
                .get('/api/item/get-users-item-list')
                .set('Authorization', `Bearer ${userToken}`);
    
    // 해당 아이템의 UUID
    return getUsersItemListResponse.body.itemList[0].itemUUID;
}

/** # GET /api/chat/check-connection-status
  * @name checkConnectionStatus
  * @description DB 연결 상태 확인 API
  */
describe('GET /api/chat/check-connection-status', () => {
    it('DB가 정상적으로 연결된 상태에서는 200을 반환한다.', async () => {
        // 테스트용 MongoDB 연결
        await connectDB(DBType.CHAT);
        const response = await request(app).get('/api/chat/check-connection-status');
        expect(response.statusCode).toBe(200);
    });

    it('DB가 정상적으로 연결되지 않은 상태에서는 500과 DB 상태(에러) 반환한다.', async () => {
        // 테스트용 MongoDB 연결 해제
        await disconnectDB(DBType.CHAT);

        const response = await request(app).get('/api/chat/check-connection-status');
        expect(response.statusCode).toBe(500);

        // 다시 연결
        await connectDB(DBType.CHAT);
    });
});

/** # POST /api/chat/create-chat-room
  * @name createChatRoom
  * @description 채팅방 생성 API
  */
describe('POST /api/chat/create-chat-room', () => {
    it('채팅방을 생성하면 200을 반환한다.', async () => {
        // 유저 토큰 생성
        const [firstUserToken, secondUserToken] = await Promise.all([getUserToken(1), getUserToken(2)]);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);
        const secondUserUUID = getUserUUIDFromToken(secondUserToken);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);
        await addItemFunction(secondUserToken, 2);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);
        const secondItemUUID = await getTestItemUUID(secondUserToken);

        const response = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: secondUserUUID,
                targetItemUUID: secondItemUUID,
            });
        expect(response.statusCode).toBe(200);

        // 생성된 채팅방 확인
        const chatroomUUID = response.body.chatroomUUID;

        const chatroomResponse = await request(app)
            .get('/api/chat/get-my-chat-rooms')
            .set('Authorization', `Bearer ${firstUserToken}`);
        const chat = chatroomResponse.body.chatrooms[0];

        expect(chat).not.toBeNull();
        let firstUserExist = false;
        let secondUserExist = false;
        chat.users.forEach(user => {
            if (user.userUUID === firstUserUUID) {
                firstUserExist = true;
            }
            if (user.userUUID === secondUserUUID) {
                secondUserExist = true;
            }
        });
        expect(firstUserExist).toBe(true);
        expect(secondUserExist).toBe(true);
    });

    it('존재하지 않는 유저로 채팅방을 생성하면 400을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);

        const response = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: 'fakeUserUUID',
                targetItemUUID: 'fakeItemUUID',
            });
        expect(response.statusCode).toBe(400);
    });

    it('존재하지 않는 아이템으로 채팅방을 생성하면 400을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);

        const response = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: firstUserUUID,
                targetItemUUID: 'fakeItemUUID',
            });
        expect(response.statusCode).toBe(400);
    });

    it('요청하는 유저의 UUID가 아이템의 itemOwnerUUID와 일치하지 않으면 400을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);
        const secondUserToken = await getUserToken(2);
        const thirdUserToken = await getUserToken(3);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);
        const secondUserUUID = getUserUUIDFromToken(secondUserToken);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);
        await addItemFunction(secondUserToken, 2);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);
        const secondItemUUID = await getTestItemUUID(secondUserToken);

        const response = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${thirdUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: secondUserUUID,
                targetItemUUID: secondItemUUID,
            });
        expect(response.statusCode).toBe(400);
    });

    it('이미 생성된 채팅방이 있으면 200을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);
        const secondUserToken = await getUserToken(2);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);
        const secondUserUUID = getUserUUIDFromToken(secondUserToken);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);
        await addItemFunction(secondUserToken, 2);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);
        const secondItemUUID = await getTestItemUUID(secondUserToken);

        // 채팅방 생성
        const response = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: secondUserUUID,
                targetItemUUID: secondItemUUID,
            });
        expect(response.statusCode).toBe(200);
        const firstChatroomUUID = response.body.chatroomUUID;

        // 다시 채팅방 생성
        const secondResponse = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: secondUserUUID,
                targetItemUUID: secondItemUUID,
            });
        expect(secondResponse.statusCode).toBe(200);
        const secondChatroomUUID = secondResponse.body.chatroomUUID;

        expect(firstChatroomUUID).toBe(secondChatroomUUID);
    });

    it('userToken이 없으면 401을 반환한다.', async () => {
        const response = await request(app)
            .post('/api/chat/create-chat-room')
            .send({
                requestItemUUID: 'fakeItemUUID',
                targetUserUUID: 'fakeTargetUserUUID',
                targetItemUUID: 'fakeTargetItemUUID',
            });
        expect(response.statusCode).toBe(401);
    });

    it('요청하는 유저가 userDB에 없으면 402을 반환한다.', async () => {
        const response = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer fakeUserToken`)
            .send({
                requestItemUUID: 'fakeItemUUID',
                targetUserUUID: 'fakeTargetUserUUID',
                targetItemUUID: 'fakeTargetItemUUID',
            });
        expect(response.statusCode).toBe(402);
    });
});

/** # POST /api/chat/send-message
  * @name addChatMessage
  * @description 채팅방 메세지 추가 API
  */
describe('POST /api/chat/send-message', () => {
    it('메세지를 보내면 200을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);
        const secondUserToken = await getUserToken(2);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);
        const secondUserUUID = getUserUUIDFromToken(secondUserToken);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);
        await addItemFunction(secondUserToken, 2);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);
        const secondItemUUID = await getTestItemUUID(secondUserToken);

        // 채팅방 생성
        const chatroomResponse = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: secondUserUUID,
                targetItemUUID: secondItemUUID,
            });
        const chatroomUUID = chatroomResponse.body.chatroomUUID;

        // 메세지 전송
        const response = await request(app)
            .post('/api/chat/send-message')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                chatroomUUID: chatroomUUID,
                content: 'testMessage',
            });
        expect(response.statusCode).toBe(200);

        // 메세지 확인
        const chatroomResponse2 = await request(app)
            .get('/api/chat/get-my-chat-rooms')
            .set('Authorization', `Bearer ${firstUserToken}`);
        const chat = chatroomResponse2.body.chatrooms[0];

        expect(chat).not.toBeNull();
        expect(chat['lastMessage'].content).toBe('testMessage');
    });

    it('존재하지 않는 채팅방에 메세지를 보내면 400을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);

        // 메세지 전송
        const response = await request(app)
            .post('/api/chat/send-message')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                chatroomUUID: 'fakeChatroomUUID',
                content: 'testMessage',
            });
        expect(response.statusCode).toBe(400);
    });

    it('userToken이 없으면 401을 반환한다.', async () => {
        const response = await request(app)
            .post('/api/chat/send-message')
            .send({
                chatroomUUID: 'fakeChatroomUUID',
                content: 'testMessage',
            });
        expect(response.statusCode).toBe(401);
    });
});

/** # GET /api/chat/get-my-chatroom-list
  * @name getMyChatRoomList
  * @description 내 채팅방 목록 조회 API
  */
describe('GET /api/chat/get-my-chatroom-list', () => {
    it('내 채팅방 목록을 조회하면 200을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);
        const secondUserToken = await getUserToken(2);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);
        const secondUserUUID = getUserUUIDFromToken(secondUserToken);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);
        await addItemFunction(secondUserToken, 2);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);
        const secondItemUUID = await getTestItemUUID(secondUserToken);

        // 채팅방 생성
        const chatroomResponse = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: secondUserUUID,
                targetItemUUID: secondItemUUID,
            });
        const chatroomUUID = chatroomResponse.body.chatroomUUID;

        // 채팅방 목록 조회
        const response = await request(app)
            .get('/api/chat/get-my-chat-rooms')
            .set('Authorization', `Bearer ${firstUserToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.chatrooms[0].chatroomUUID).toBe(chatroomUUID);
    });

    it('userToken이 없으면 401을 반환한다.', async () => {
        const response = await request(app)
            .get('/api/chat/get-my-chat-rooms');
        expect(response.statusCode).toBe(401);
    });
});

/** # GET /api/chat/get-unread-messages
  * @name getUnreadMessages
  * @description 읽지 않은 메세지 목록 조회 API
  */
describe('GET /api/chat/get-unread-messages', () => {
    it('읽지 않은 메세지 목록을 조회하면 200을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);
        const secondUserToken = await getUserToken(2);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);
        const secondUserUUID = getUserUUIDFromToken(secondUserToken);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);
        await addItemFunction(secondUserToken, 2);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);
        const secondItemUUID = await getTestItemUUID(secondUserToken);

        // 채팅방 생성
        const chatroomResponse = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: secondUserUUID,
                targetItemUUID: secondItemUUID,
            });
        const chatroomUUID = chatroomResponse.body.chatroomUUID;

        // 첫번째 유저가 메세지 발송
        await request(app)
            .post('/api/chat/send-message')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                chatroomUUID: chatroomUUID,
                content: 'testMessage',
            });

        // 두번째 유저가 읽지 않은 메세지 목록 조회
        const response = await request(app)
            .get('/api/chat/get-unread-messages')
            .set('Authorization', `Bearer ${secondUserToken}`)
            .query({
                chatroomUUID: chatroomUUID,
            });
        expect(response.statusCode).toBe(200);
        expect(response.body.messages[0].content).toBe('testMessage');

        // 첫번째 유저가 메세지 발송
        await request(app)
            .post('/api/chat/send-message')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                chatroomUUID: chatroomUUID,
                content: 'testMessage2',
            });

        // 두번째 유저가 읽지 않은 메세지 목록 조회
        const response2 = await request(app)
            .get('/api/chat/get-unread-messages')
            .set('Authorization', `Bearer ${secondUserToken}`)
            .query({
                chatroomUUID: chatroomUUID,
            });
        expect(response2.statusCode).toBe(200);
        expect(response2.body.messages[0].content).toBe('testMessage2');

        // 메세지 4번 전송
        for (let i = 0; i < 4; i++) {
            await request(app)
                .post('/api/chat/send-message')
                .set('Authorization', `Bearer ${firstUserToken}`)
                .send({
                    chatroomUUID: chatroomUUID,
                    content: `testMessage${i}`,
                });
        }

        // 읽지 않은 메세지 목록 조회
        const response3 = await request(app)
            .get('/api/chat/get-unread-messages')
            .set('Authorization', `Bearer ${secondUserToken}`)
            .query({
                chatroomUUID: chatroomUUID,
            });
        expect(response3.statusCode).toBe(200);
        expect(response3.body.messages.length).toBe(4);
    });

    it('존재하지 않는 채팅방에 메세지를 보내면 400을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);

        // 메세지 전송
        const response = await request(app)
            .get('/api/chat/get-unread-messages')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .query({
                chatroomUUID: 'fakeChatroomUUID',
            });
        expect(response.statusCode).toBe(400);
    });

    it('채팅방에 존재하지 않는 유저가 메세지를 보내면 400을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);
        const secondUserToken = await getUserToken(2);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);
        const secondUserUUID = getUserUUIDFromToken(secondUserToken);
        const thirdUserToken = await getUserToken(3);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);
        await addItemFunction(secondUserToken, 2);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);
        const secondItemUUID = await getTestItemUUID(secondUserToken);

        // 채팅방 생성
        const chatroomResponse = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: secondUserUUID,
                targetItemUUID: secondItemUUID,
            });
        const chatroomUUID = chatroomResponse.body.chatroomUUID;

        // 메세지 전송
        const response = await request(app)
            .get('/api/chat/get-unread-messages')
            .set('Authorization', `Bearer ${thirdUserToken}`)
            .query({
                chatroomUUID: chatroomUUID,
            });
        expect(response.statusCode).toBe(400);
    });

    it('userToken이 없으면 401을 반환한다.', async () => {
        const response = await request(app)
            .get('/api/chat/get-unread-messages');
        expect(response.statusCode).toBe(401);
    });
});

/** # DELETE /api/chat/delete-chat-room
 * @name deleteChatRoom
 * @description 채팅방 삭제 API
 */
describe('DELETE /api/chat/delete-chat-room', () => {
    it('채팅방을 삭제하면 200을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);
        const secondUserToken = await getUserToken(2);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);
        const secondUserUUID = getUserUUIDFromToken(secondUserToken);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);
        await addItemFunction(secondUserToken, 2);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);
        const secondItemUUID = await getTestItemUUID(secondUserToken);

        // 채팅방 생성
        const chatroomResponse = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: secondUserUUID,
                targetItemUUID: secondItemUUID,
            });
        const chatroomUUID = chatroomResponse.body.chatroomUUID;

        // 채팅방 삭제
        const response = await request(app)
            .delete('/api/chat/delete-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                chatroomUUID: chatroomUUID,
            });
        expect(response.statusCode).toBe(200);
    });

    it('존재하지 않는 채팅방을 삭제하면 400을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);

        // 채팅방 삭제
        const response = await request(app)
            .delete('/api/chat/delete-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                chatroomUUID: 'fakeChatroomUUID',
            });
        expect(response.statusCode).toBe(400);
    });

    it('userToken이 없으면 401을 반환한다.', async () => {
        const response = await request(app)
            .delete('/api/chat/delete-chat-room')
            .send({
                chatroomUUID: 'fakeChatroomUUID',
            });
        expect(response.statusCode).toBe(401);
    });

    it('채팅방에 해당 유저가 없으면 400을 반환한다.', async () => {
        // 유저 토큰 생성
        const firstUserToken = await getUserToken(1);
        const secondUserToken = await getUserToken(2);
        const thirdUserToken = await getUserToken(3);
        const firstUserUUID = getUserUUIDFromToken(firstUserToken);
        const secondUserUUID = getUserUUIDFromToken(secondUserToken);

        // 아이템 추가
        await addItemFunction(firstUserToken, 1);
        await addItemFunction(secondUserToken, 2);

        // 아이템 UUID
        const firstItemUUID = await getTestItemUUID(firstUserToken);
        const secondItemUUID = await getTestItemUUID(secondUserToken);

        // 채팅방 생성
        const chatroomResponse = await request(app)
            .post('/api/chat/create-chat-room')
            .set('Authorization', `Bearer ${firstUserToken}`)
            .send({
                requestItemUUID: firstItemUUID,
                targetUserUUID: secondUserUUID,
                targetItemUUID: secondItemUUID,
            });
        const chatroomUUID = chatroomResponse.body.chatroomUUID;

        // 채팅방 삭제
        const response = await request(app)
            .delete('/api/chat/delete-chat-room')
            .set('Authorization', `Bearer ${thirdUserToken}`)
            .send({
                chatroomUUID: chatroomUUID,
            });
        expect(response.statusCode).toBe(400);
    });
});