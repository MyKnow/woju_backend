// models/chatModel.js
const mongoose = require('mongoose');

// 필요한 Model 불러오기
const { userDisplaySchema } = require('./userModel');

// 필요한 Util 불러오기
const { DBName } = require('../utils/db');

/** # Message Schema
 * @name messageSchema
 * @description Message Schema
 * 
 * ### Properties
 * @property {String} userUUID - 사용자 UUID (String, Required)
 * @property {String} content - 내용 (String, Required)
 * @property {Array.<String>} seenUserUUIDs - 읽은 사용자 UUID 리스트 (Array, Optional)
 * 
 * ### Timestamps
 * @property {Date} createdAt - 생성 일자 (Date, Default: Date.now)
 */
const messageSchema = new mongoose.Schema({
  userUUID: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  seenUserUUIDs: {
    type: Array.of(String),
    default: [],
  },
}, {
  timestamps: true,
});

/** # Chat Schema
 * @name chatSchema
 * @description Chat Schema
 * 
 * ### Properties
 * @property {string} chatroomUUID - 채팅방 UUID (String, Required)
 * @property {Map.<string, string>} relationItemUUIDs - 관련 아이템 UUID (Map{UserUUID: ItemUUID}, Required)
 * @property {Array.<userDisplaySchema>} users - 사용자 리스트 (Array, Required)
 * @property {Array.<messageSchema>} messages - 메세지 리스트 (Array, Optional)
 * 
 * ### Timestamps
 * @property {Date} createdAt - 생성 일자 (Date, Default: Date.now)
 * @property {Date} updatedAt - 업데이트 일자 (Date, Default: Date.now)
 * 
 */
const chatSchema = new mongoose.Schema({
  chatroomUUID: {
    type: String,
    required: true,
  },
  users: {
    type: Array.of(userDisplaySchema),
    required: true,
  },
  relationItemUUIDs: {
    type: Map,
    of: String,
    required: true,
  },
  messages: {
    type: Array.of(messageSchema),
    default: [],
  },
}, {
  timestamps: true,
});

/** # Chat Model 생성 함수
 * @name createChatModel
 * @description Chat 모델 생성 함수
 * 
 * @param {mongoose.Connection} db - DB Connection
 * 
 * @returns {mongoose.Model} - Chat Model
 */
const createChatModel = (db) => {
  if (!db) {
    throw new Error('DB 연결이 필요합니다.');
  }

  if (db.models[DBName.CHAT]) {
    return db.models[DBName.CHAT];
  }

  return db.model(DBName.CHAT, chatSchema);
}

/** # Chatroom Display Schema
 * @name chatroomDisplaySchema
 * @description Chatroom Display Schema
 * 
 * @type {mongoose.Schema}
 * 
 * ### Properties
 * @property {String} chatroomUUID - 채팅방 UUID
 * @property {Map.<String, String>} relationItemUUID - 관련 아이템 UUID
 * @property {Array.<userDisplaySchema>} users - 사용자 리스트
 * @property {messageSchema} lastMessage - 마지막 메세지
 * 
 * ### Timestamps
 * @property {Date} createdAt - 생성 일자
 * @property {Date} updatedAt - 업데이트 일자
 */
const chatroomDisplaySchema = new mongoose.Schema({
  chatroomUUID: { type: String, required: true },
  relationItemUUID: { type: Map, of: String, required: true },
  users: { type: Array.of(userDisplaySchema), required: true },
  lastMessage: { type: messageSchema },
}, {
  timestamps: true,
});

module.exports = {
  createChatModel,
  messageSchema,
  chatSchema,
  chatroomDisplaySchema,
};