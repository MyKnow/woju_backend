require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * @name connections
 * @description MongoDB 연결 객체를 저장하는 객체
 * 
 * @type {Map<String, mongoose.Connection>}
 */
const connections = {};

/** # MongoDB 연결 함수
 * 
 * - MongoDB에 연결하는 함수
 * - 테스트 환경일 때는 MongoMemoryServer를 사용함
 * - 테스트 환경이 아닐 때는 .env 파일에 있는 MONGO_USER_DB_URI를 사용함
 * 
 * ## Returns
 * @returns Promise connection - Mongoose Connection 객체
 */
const connectDB = async function (dbName, dbUri) {
  // dbName이 DBType에 정의된 값이 아닌 경우, 에러를 발생시킴
  if (!Object.values(DBType).includes(dbName)) {
    console.error('Invalid DB Type:', dbName);
    throw new Error('Invalid DB Type: ' + dbName);
  }

  // Test 환경이 아닌데 dbUri가 없는 경우, 에러를 발생시킴
  if (process.env.NODE_ENV !== 'test' && !dbUri) {
    console.error('DB URI is missing');
    throw new Error('DB URI is missing');
  }
  
  // 이미 연결된 경우, 연결을 유지함
  if (connections[dbName]) {
    return connections[dbName];
  }

  try {
    if (process.env.NODE_ENV === 'test') {
      // MongoMemoryServer 인스턴스를 생성하고 시작함
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    } else {
      // .env 파일에 있는 MONGO_USER_DB_URI를 사용함
      uri = dbUri;
    }

    // MongoDB에 연결
    const connection = mongoose.createConnection(uri, {});

    // 연결이 완료될 때까지 기다림
    await new Promise((resolve, reject) => {
      connection.once('connected', resolve);
      connection.once('error', reject);
    });

    connections[dbName] = connection;

    return connection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return null;
  }
}

/** # MongoDB 연결 해제 함수
 * 
 * - MongoDB와의 연결을 해제하는 함수
 * - 테스트 환경일 때는 MongoMemoryServer를 종료함
 * - 테스트 환경이 아닐 때는 MongoDB와의 연결을 끊음
 * 
 * ## Parameters
 * @param {String} dbName - 연결 해제할 DB 이름
 * 
 * ## Returns
 * @returns Promise boolean - MongoDB 연결 해제 성공 여부
 * 
 */
const disconnectDB = async function (dbName) {
  // 연결되지 않은 경우, 연결 해제를 수행하지 않음
  if (!connections[dbName]) {
    return true;
  }
  
  try {
    if (process.env.NODE_ENV !== 'test') {
      await connections[dbName].close();
    }

    delete connections[dbName];

    // 모든 연결이 해제되면 모든 mongoose 인스턴스를 종료함
    if (Object.keys(connections).length === 0) {
      if (process.env.NODE_ENV === 'test') {
        await mongoServer.stop();
      }
      await mongoose.disconnect();
    }

    return true;
  }
  catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
    return false;
  }
}

/**
 * @name isMongoDBConnected
 * @description MongoDB 연결 상태 확인 함수
 * 
 * @param {String} dbName - 연결 확인할 DB 이름
 * @returns {Boolean} - MongoDB 연결 상태
 */
const isMongoDBConnected = (dbName) => {
  if (!connections[dbName]) {
    return false;
  }

  return connections[dbName].readyState === 1;
}

/**
 * @name DBType
 * @description DB의 타입을 열거형으로 정의
 * @typedef {Object} DBType
 * 
 * @property {String} USER - User DB
 * @property {String} ITEM - Item DB
 * @property {String} POLICY - Policy DB
 * @property {String} CHAT - Chat DB
 */
const DBType = Object.freeze({
  USER: 'userDB',
  ITEM: 'itemDB',
  POLICY: 'policyDB',
  CHAT: 'chatDB',
});

/**
 * @name DBName
 * @description DB 모델 이름을 열거형으로 정의
 * @typedef {Object} DBName
 * ,
 * @property {String} USER - User Model 이름
 * @property {String} TempPhoneNumber - TempPhoneNumber Model 이름
 * @property {String} TempUserID - TempUserID Model 이름
 * @property {String} ITEM - Item Model 이름
 * @property {String} POLICY - Policy Model 이름
 * @property {String} CHAT - Chat Model 이름
 */
const DBName = Object.freeze({
  USER: 'userModel',
  TEMP_PHONE_NUMBER: 'tempPhoneNumberModel',
  TEMP_USER_ID: 'tempUserIDModel',
  ITEM: 'itemModel',
  POLICY: 'policyModel',
  CHAT: 'chatModel',
});

/**
 * @name DBUrl
 * @description DB URI를 열거형으로 정의
 * 
 * @typedef {Object} DBUri
 * 
 * @property {String} USER - User DB URI
 * @property {String} ITEM - Item DB URI
 * @property {String} POLICY - Policy DB URI
 * @property {String} CHAT - Chat DB URI
 */
const DBUri = Object.freeze({
  USER: process.env.MONGO_USER_DB_URI,
  ITEM: process.env.MONGO_ITEM_DB_URI,
  POLICY: process.env.MONGO_POLICY_DB_URI,
  CHAT: process.env.MONGO_CHAT_DB_URI,
});

module.exports = { connectDB, disconnectDB, isMongoDBConnected, DBType, DBName, DBUri };