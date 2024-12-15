require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

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
  // 이미 연결된 경우, 연결을 유지함
  if (connections[dbName]) {
    return connections[dbName];
  }

  try {
    if (process.env.NODE_ENV === 'test') {
      // MongoMemoryServer 인스턴스를 생성하고 시작함
      console.log('Using MongoMemoryServer: ', dbName);
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
    if (process.env.NODE_ENV === 'test') {
      // MongoMemoryServer 인스턴스를 종료함

      if (mongoServer) {
        await mongoServer.stop();
      }
    } else {
      // MongoDB와의 연결을 끊음
      await connections[dbName].close();
    }

    delete connections[dbName];

    // 모든 연결이 해제되면 모든 mongoose 인스턴스를 종료함
    if (Object.keys(connections).length === 0) {
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
 */
const DBType = Object.freeze({
  USER: 'userDB',
  ITEM: 'itemDB',
  POLICY: 'policyDB',
});

/**
 * @name DBName
 * @description DB 모델 이름을 열거형으로 정의
 * @typedef {Object} DBName
 * ,
 * @property {String} USER - User DB 이름
 * @property {String} TempPhoneNumber - TempPhoneNumber DB 이름
 * @property {String} TempUserID - TempUserID DB 이름
 * @property {String} ITEM - Item DB 이름
 * @property {String} POLICY - Policy DB 이름
 */
const DBName = Object.freeze({
  USER: 'userModel',
  TEMP_PHONE_NUMBER: 'tempPhoneNumberModel',
  TEMP_USER_ID: 'tempUserIDModel',
  ITEM: 'itemModel',
  POLICY: 'policyModel',
});

module.exports = { connectDB, disconnectDB, isMongoDBConnected, DBType, DBName };