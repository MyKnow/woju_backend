// services/chatService.js

// 필요한 라이브러리 불러오기
const { v4: uuidv4 } = require('uuid');

// 필요한 모델 불러오기
const { createChatModel, chatSchema, messageSchema } = require('../models/chatModel');

// 필요한 Utils 불러오기
const { connectDB, DBType, DBUri } = require('../utils/db');

// 필요한 Services 불러오기
const { getUserDisplaySchema } = require('./userService');
const { getItemInfo } = require('./itemService');

/** # 채팅방 생성 함수
 * @name createChatRoomService
 * 
 * ### Parameters
 * @param {string} requestUserUUID - 요청자 User UUID
 * @param {string} targetUserUUID - 대상자 User UUID
 * @param {string} requestItemUUID - 요청 아이템 UUID
 * @param {string} targetItemUUID - 대상 아이템 UUID
 * 
 * ### Result
 * @returns {String?} chatroomUUID - 채팅방 UUID
 * @returns {String?} message - 에러 메세지 (에러 발생 시)
 */
exports.createChatRoomService = async (requestUserUUID, requestItemUUID, targetUserUUID, targetItemUUID) => {
  // MongoDB 연결
  const chatDB = await connectDB(DBType.CHAT, DBUri);

  if (!chatDB) {
    return { chatroomUUID: null, message: 'DB 연결 실패' };
  }

  // Model 생성
  const Chat = createChatModel(chatDB);

  if (!Chat) {
    return { chatroomUUID: null, message: 'Chat Model 생성 실패' };
  }

  if (!requestUserUUID || !targetUserUUID || !requestItemUUID || !targetItemUUID) {
    return { chatroomUUID: null, message: '요청 정보가 부족합니다.' };
  }

  // 유저 검증
  if (requestUserUUID === targetUserUUID) {
    return { chatroomUUID: null, message: '자기 자신과 채팅방을 생성할 수 없습니다.' };
  }

  // 유저 존재 여부 확인
  const [requesterUser, targetUser] = await Promise.all([
    getUserDisplaySchema(requestUserUUID),
    getUserDisplaySchema(targetUserUUID),
  ]);

  if (!requesterUser || !targetUser) {
    return { chatroomUUID: null, message: '존재하지 않는 사용자입니다.' };
  }

  // relationItemUUIDs Map 생성
  const relationItemUUIDs = new Map();
  relationItemUUIDs.set(requestUserUUID, requestItemUUID);
  relationItemUUIDs.set(targetUserUUID, targetItemUUID);

  // 동일한 아이템으로 생성된 채팅방이 있는지 확인
  const existChat = await Chat.findOne({
    relationItemUUIDs,
  });

  if (existChat) {
    return { chatroomUUID: existChat.chatroomUUID, message: '이미 생성된 채팅방이 있습니다.' };
  } 

  // 중복되지 않는 채팅방 UUID 생성
  let chatroomUUID = uuidv4();

  try {
    // 채팅방 생성
    await Chat.create({
      chatroomUUID,
      users: [requesterUser, targetUser],
      relationItemUUIDs,
      messages: [],
    });

    return { chatroomUUID, message: null };
  } catch (error) {
    return { chatroomUUID: null, message: error.message };
  }
}

/** # 채팅방 조회 함수
 * @name getChatRoomService
 * 
 * ### Parameters
 * @param {string} chatroomUUID - 채팅방 UUID
 * @param {string} userUUID - 사용자 UUID
 * 
 * ### Result
 * @returns {import('../models/chatModel').chatSchema?} chat - 채팅방 정보
 * @returns {string?} message - 에러 메세지 (에러 발생 시)
 */
exports.getChatRoomService = async (chatroomUUID) => {
  // MongoDB 연결
  const db = await connectDB(DBType.CHAT, DBUri);

  if (!db) {
    return { chat: null, message: 'DB 연결 실패' };
  }

  // Chat Model 생성
  const Chat = createChatModel(db);

  try {
    // 채팅방 조회
    const chat = await Chat.findOne({ chatroomUUID });

    if (!chat) {
      return { chat: null, message: '존재하지 않는 채팅방입니다.' };
    }

    // 현재 시간으로 상대방 메세지의 seenUserUUIDs에 본인 UUID 추가
    chat.messages.forEach((message) => {
      if (message.userUUID !== userUUID) {
        message.seenUserUUIDs.push(userUUID);
      }
    });

    // 채팅방 업데이트
    await chat.save();

    return { chat, message: null };
  } catch (error) {
    return { chat: null, message: error.message };
  }
}

/** # 채팅방 메세지 추가 함수
 * @name addChatMessageService
 * @description 채팅방에 메세지를 추가하는 함수
 * 
 * ### Parameters
 * @param {string} chatroomUUID - 채팅방 UUID
 * @param {string} userUUID - 사용자 UUID
 * @param {string} content - 메세지
 * 
 * ### Result
 * @returns {boolean} 성공 여부
 * @returns {string?} message - 에러 메세지 (에러 발생 시)
 */
exports.addChatMessageService = async (chatroomUUID, userUUID, content) => {
  // MongoDB 연결
  const db = await connectDB(DBType.CHAT, DBUri);

  if (!db) {
    return { success: false, message: 'DB 연결 실패' };
  }

  // Chat Model 생성
  const Chat = createChatModel(db);

  if (!chatroomUUID || !userUUID || !content) {
    return { success: false, message: '요청 정보가 부족합니다.' };
  }

  // 사용자 정보 조회
  const user = await getUserDisplaySchema(userUUID);

  if (!user) {
    return { success: false, message: '존재하지 않는 사용자입니다.' };
  }

  try {
    // 채팅방 조회
    const chat = await Chat.findOne({ chatroomUUID });

    if (!chat) {
      return { success: false, message: '존재하지 않는 채팅방입니다.' };
    }

    /**
     * @type {import('../models/chatModel').messageSchema}
     */
    const message = {
      userUUID: userUUID,
      content: content,
    };

    // 메세지 추가
    chat.messages.push(message);

    // 현재 메세지 이전까지의 메세지들을 읽은 상태로 변경
    chat.messages.forEach((message) => {
      if (message.userUUID !== userUUID) {
        message.seenUserUUIDs.push(userUUID);
      }
    });

    // 채팅방 업데이트
    const updatedChat = await chat.save();

    return { success: updatedChat ? true : false, message: updatedChat ? null : '메세지 추가 실패' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/** # 채팅방 메세지 조회 함수
 * @name getChatMessagesService
 * @description 채팅방의 새로운 메세지를 조회하는 함수
 * 
 * ### Parameters
 * @param {string} chatroomUUID - 채팅방 UUID
 * @param {string} userUUID - 사용자 UUID
 * @param {date} lastSeen - 마지막으로 본 메세지 시간
 * 
 * ### Result
 * @returns {Array.<import('../models/chatModel').messageSchema>?} messages - 메세지 리스트
 * @returns {string?} message - 에러 메세지 (에러 발생 시)
 */
exports.getChatMessagesService = async (
  chatroomUUID,
  userUUID,
) => {
  // MongoDB 연결
  const db = await connectDB(DBType.CHAT, DBUri.CHAT);

  if (!db) {
    return { messages: null, message: 'DB 연결 실패' };
  }

  // Chat Model 생성
  const Chat = createChatModel(db);

  try {
    // 채팅방 조회
    /**
     * @type {import('../models/chatModel').chatSchema}
     */
    const chat = await Chat.findOne({ chatroomUUID });

    if (!chat) {
      return { messages: null, message: '존재하지 않는 채팅방입니다.' };
    }

    // 채팅방에 참여하지 않은 사용자인 경우
    let isUserInChat = false;
    chat.users.forEach((user) => {
      if (user.userUUID === userUUID) {
        isUserInChat = true;
      }
    });
    if (!isUserInChat) {
      return { messages: null, message: '채팅방에 참여하지 않은 사용자입니다.' };
    }
    // 해당 user가 본 마지막 메세지는, 전체 메세지 중에서 seenUserUUIDs에 본인의 UUID가 포함되어 있는 마지막 메세지
    const lastSeenMessage = chat.messages.filter((message) => message.seenUserUUIDs.includes(userUUID)).pop();

    // 만약 lastSeenMessage이 없다면, 아무 메세지도 본 적이 없다는 뜻이므로 모든 메세지를 반환
    let messages;
    if (!lastSeenMessage) {
      messages = chat.messages;
    } else {
      // 전체 메세지 중 created_at이 lastSeenMessage 이후의 시간에 해당하는 메세지들을 반환
      messages = chat.messages.filter((message) => message.createdAt > lastSeenMessage.createdAt);
    }

    // 현재 시간으로 상대방 메세지의 seenUserUUIDs에 본인 UUID 추가
    chat.messages.forEach((message) => {
      if (message.userUUID !== userUUID) {
        message.seenUserUUIDs.push(userUUID);
      }
    });

    // 채팅방 업데이트
    await chat.save();

    // 메세지 반환
    return { messages, message: messages ? null : '메세지 조회 실패' };
  } catch (error) {
    return { messages: null, message: error.message };
  }
}

/** # 채팅방 삭제 함수
 * @name deleteChatRoomService
 * @description 채팅방을 삭제하는 함수
 * 
 * ### Parameters
 * @param {string} chatroomUUID - 채팅방 UUID
 * @param {string} userUUID - 사용자 UUID
 * 
 * ### Result
 * @returns {boolean} 성공 여부
 * @returns {string?} message - 에러 메세지 (에러 발생 시)
 */
exports.deleteChatRoomService = async (chatroomUUID, userUUID) => {
  // MongoDB 연결
  const db = await connectDB(DBType.CHAT, DBUri.CHAT);

  if (!db) {
    return { success: false, message: 'DB 연결 실패' };
  }

  // Chat Model 생성
  const Chat = createChatModel(db);

  try {
    // 채팅방 조회
    const chat = await Chat.findOne({ chatroomUUID });

    // 채팅방이 존재하지 않는 경우
    if (!chat) {
      return { success: false, message: '존재하지 않는 채팅방입니다.' };
    }

    // 채팅방에 사용자가 포함되어 있지 않은 경우
    let isUserInChat = false;
    chat.users.forEach((chatUser) => {
      if (chatUser.userUUID === userUUID) {
        isUserInChat = true;
      }
    });
    if (!isUserInChat) {
      return { success: false, message: '채팅방에 참여하지 않은 사용자입니다.' };
    }

    // 채팅방 삭제
    const result = await Chat.deleteOne({ chatroomUUID });

    return { success: result.deletedCount > 0, message: result.deletedCount > 0 ? null : '채팅방 삭제 실패' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/** # 내 채팅방 목록 조회 함수
 * @name getMyChatRoomsService
 * @description 내 채팅방 목록을 조회하는 함수
 * 
 * ### Parameters
 * @param {string} userUUID - 사용자 UUID
 * 
 * ### Result
 * @returns {Array.<import('../models/chatModel').chatroomDisplaySchema>?} chatrooms - 채팅방 리스트
 * @returns {string?} message - 에러 메세지 (에러 발생 시)
 */
exports.getMyChatRoomsService = async (userUUID) => {
  // MongoDB 연결
  const db = await connectDB(DBType.CHAT, DBUri.CHAT);

  if (!db) {
    return { chatrooms: null, message: 'DB 연결 실패' };
  }

  // Chat Model 생성
  const Chat = createChatModel(db);

  if (!Chat) {
    return { chatrooms: null, message: 'Chat Model 생성 실패' };
  }

  if (!userUUID) {
    return { chatrooms: null, message: '요청 정보가 부족합니다.' };
  }

  try {
    // 채팅방 조회 (userDisplaySchema의 array인 users 필드에 userUUID가 포함되어 있는 경우)
    const chatrooms = await Chat.find({ users: { $elemMatch: { userUUID } } });

    /**
     * @type {Array.<import('../models/chatModel').chatroomDisplaySchema>}
     */
    const chatroomDisplayList = [];
    chatrooms.forEach((chatroom) => {
      chatroomDisplayList.push({
        chatroomUUID: chatroom.chatroomUUID,
        relationItemUUID: chatroom.relationItemUUID,
        users: chatroom.users,
        lastMessage: chatroom.messages[chatroom.messages.length - 1],
      });
    });

    return { chatrooms: chatroomDisplayList, message: null };
  } catch (error) {
    return { chatrooms: null, message: error.message };
  }
}

