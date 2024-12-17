// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

/** # GET /api/chat/check-connection-status
 * @name checkConnectionStatus
 * @description DB 연결 상태 확인 API
 */
router.get('/check-connection-status', chatController.dbStatus);

/** # POST /api/chat/create-chat-room
 * @name createChatRoom
 * @description 채팅방 생성 API
 */
router.post('/create-chat-room', chatController.createChatRoom);

/** # POST /api/chat/send-message
 * @name addChatMessage
 * @description 채팅방 메세지 추가 API
 */
router.post('/send-message', chatController.sendMessage);

/** # GET /api/chat/get-my-chatroom-list
 * @name getMyChatRoomList
 * @description 내 채팅방 목록 조회 API
 */
router.get('/get-my-chat-rooms', chatController.getMyChatroomList);

/** # GET /api/chat/get-unread-messages
 * @name getUnreadMessages
 * @description 읽지 않은 메세지 목록 조회 API
 */
router.get('/get-unread-messages', chatController.getUnreadMessages);

/** # DELETE /api/chat/delete-chat-room
 * @name deleteChatRoom
 * @description 채팅방 삭제 API
 */
router.delete('/delete-chat-room', chatController.deleteChatRoom);

module.exports = router;