// controllers/chatController.js

// 필요한 Util 불러오기
const { isMongoDBConnected, DBType } = require('../../shared/utils/db');
const { verifyUser } = require('../../shared/utils/auth');

// 필요한 Services 불러오기
const { createChatRoomService, addChatMessageService, getMyChatRoomsService, getChatMessagesService, deleteChatRoomService } = require('../../shared/services/chatService');
const { getItemInfo } = require('../../shared/services/itemService');

/** # GET /api/chat/check-connection-status
 * @name dbStatus
 * @description DB 연결 상태 확인 API
 * 
 * ### Return
 * @property {string} message - 메세지
 * 
 * ### Status Code
 * @returns {object} 200 - 성공
 * @returns {object} 500 - 서버 에러
 */
exports.dbStatus = (req, res) => {
  // DB 연결 상태 확인
  const mongooseState = isMongoDBConnected(DBType.CHAT);

  if (mongooseState) {
    return res.status(200).json({
      message: 'DB가 연결되어 있습니다.',
    });
  } else {
    return res.status(500).json({
      message: 'DB 연결 상태를 확인해주세요.',
    });
  }
};

/** # POST /api/chat/create-chat-room
 * @name createChatRoom
 * @description 채팅방 생성 API
 * 
 * ### Request Body
 * @property {string} targetUserUUID - 대상자 User UUID
 * @property {string} targetItemUUID - 대상 아이템 UUID
 * @property {string} requestItemUUID - 요청 아이템 UUID
 * 
 * ### Return
 * @property {string} chatroomUUID - 채팅방 UUID
 * @property {string} message - 에러 메세지 (에러 발생 시)
 * 
 * ### Status Code
 * @property {number} 200 - 성공
 * @property {number} 400 - 잘못된 요청
 * @property {number} 500 - 서버 에러
 * 
 * ### Security
 * @security Authorization Bearer Token
 */
exports.createChatRoom = [
  verifyUser,
  async (req, res) => {
    const requestUserUUID = req.userUUID;
    const { targetUserUUID, targetItemUUID, requestItemUUID } = req.body;

    try {
      // 요청하는 유저의 UUID가 아이템의 itemOwnerUUID와 같은지 확인
      const item = await getItemInfo(requestItemUUID);

      if (!item) {
        return res.status(400).json({
          chatroomUUID: null,
          message: '요청하는 아이템이 존재하지 않습니다.',
        });
      }

      const itemOwnerUUID = item.itemOwnerUUID;
      if (itemOwnerUUID !== requestUserUUID) {
        return res.status(400).json({
          chatroomUUID: null,
          message: '요청하는 유저의 아이템 UUID가 일치하지 않습니다.',
        });
      }

      const { chatroomUUID, message } = await createChatRoomService(requestUserUUID, requestItemUUID, targetUserUUID, targetItemUUID);

      if (chatroomUUID) {
        return res.status(200).json({
          chatroomUUID,
          message: null,
        });
      } else {
        return res.status(400).json({
          chatroomUUID: null,
          message,
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        chatroomUUID: null,
        message: `채팅방 생성 중 오류가 발생했습니다.: ${error}`,
      });
    }
  }
]

/** # POST /api/chat/send-message
 * @name sendMessage
 * @description 메세지 전송 API
 * 
 * ### Request Body
 * @property {string} chatroomUUID - 채팅방 UUID
 * @property {string} content - 메세지 내용
 * 
 * ### Return
 * @returns {boolean} success - 성공 여부
 * @returns {string?} message - 에러 메세지 (에러 발생 시)
 * 
 * ### Status Code
 * @property {number} 200 - 성공
 * @property {number} 400 - 잘못된 요청
 * @property {number} 500 - 서버 에러
 * 
 * ### Security
 * @security Authorization Bearer Token
 */
exports.sendMessage = [
  verifyUser,
  async (req, res) => {
    const userUUID = req.userUUID;
    const { chatroomUUID, content } = req.body;

    try {
      const { success, message } = await addChatMessageService(chatroomUUID, userUUID, content);

      if (success) {
        return res.status(200).json({
          success: true,
          message: null,
        });
      } else {
        return res.status(400).json({
          success: false,
          message,
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: `메세지 전송 중 오류가 발생했습니다.: ${error}`,
      });
    }
  }
]

/** # GET /api/chat/get-my-chat-rooms
 * @name getMyChatroomList
 * @description 내 채팅방 목록 조회 API
 * 
 * ### Return
 * @returns {Array.<chatRoomSchema>} chatrooms - 채팅방 리스트
 * @returns {string?} message - 에러 메세지 (에러 발생 시)
 * 
 * ### Status Code
 * @property {number} 200 - 성공
 * @property {number} 400 - 잘못된 요청
 * @property {number} 500 - 서버 에러
 * 
 * ### Security
 * @security Authorization Bearer Token
 */
exports.getMyChatroomList = [
  verifyUser,
  async (req, res) => {
    const userUUID = req.userUUID;

    try {
      const { chatrooms, message } = await getMyChatRoomsService(userUUID);

      if (message) {
        return res.status(400).json({
          chatrooms: null,
          message,
        });
      }

      return res.status(200).json({
        chatrooms,
        message: null,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        chatrooms: null,
        message: `채팅방 목록 조회 중 오류가 발생했습니다.: ${error}`,
      });
    }
  }
]

/** # GET /api/chat/get-unread-messages
 * @name getUnreadMessages
 * @description 읽지 않은 메세지 목록 조회 API
 * 
 * ### Query Parameters
 * @property {string} chatroomUUID - 채팅방 UUID
 * 
 * ### Return
 * @returns {Array.<messageSchema>?} messages - 메세지 리스트
 * @returns {string?} message - 에러 메세지 (에러 발생 시)
 * 
 * ### Status Code
 * @property {number} 200 - 성공
 * @property {number} 400 - 잘못된 요청
 * @property {number} 500 - 서버 에러
 * 
 * ### Security
 * @security Authorization Bearer Token
 */
exports.getUnreadMessages = [
  verifyUser,
  async (req, res) => {
    const userUUID = req.userUUID;
    const { chatroomUUID } = req.query;

    try {
      const { messages, message } = await getChatMessagesService(chatroomUUID, userUUID);

      if (message) {
        return res.status(400).json({
          messages: null,
          message,
        });
      }

      return res.status(200).json({
        messages,
        message: null,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        messages: null,
        message: `메세지 목록 조회 중 오류가 발생했습니다.: ${error}`,
      });
    }
  }
]

/** # DELETE /api/chat/delete-chat-room
 * @name deleteChatRoom
 * @description 채팅방 삭제 API
 * 
 * ### Request Body
 * @property {string} chatroomUUID - 채팅방 UUID
 * 
 * ### Return
 * @returns {boolean} success - 성공 여부
 * @returns {string?} message - 에러 메세지 (에러 발생 시)
 * 
 * ### Status Code
 * @property {number} 200 - 성공
 * @property {number} 400 - 잘못된 요청
 * @property {number} 500 - 서버 에러
 * 
 * ### Security
 * @security Authorization Bearer Token
 */
exports.deleteChatRoom = [
  verifyUser,
  async (req, res) => {
    const userUUID = req.userUUID;
    const { chatroomUUID } = req.body;

    try {
      const { success, message } = await deleteChatRoomService(chatroomUUID, userUUID);

      if (success) {
        return res.status(200).json({
          success: true,
          message: null,
        });
      } else {
        return res.status(400).json({
          success: false,
          message,
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: `채팅방 삭제 중 오류가 발생했습니다.: ${error}`,
      });
    }
  }
]