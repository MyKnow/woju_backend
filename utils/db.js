require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/** # MongoDB 연결 함수
 * 
 * - MongoDB에 연결하는 함수
 * - 테스트 환경일 때는 MongoMemoryServer를 사용함
 * - 테스트 환경이 아닐 때는 .env 파일에 있는 MONGO_USER_DB_URI를 사용함
 * 
 * ## Returns
 * @returns Promise boolean - MongoDB 연결 성공 여부
 */

const connectDB = async () => {
  try {
    let uri;

    if (process.env.NODE_ENV === 'test') {
      // MongoMemoryServer 인스턴스를 생성하고 시작함
      mongoServer = await MongoMemoryServer.create();
      // 인스턴스가 시작된 후에 URI를 가져옴
      uri = mongoServer.getUri();
    } else {
      uri = process.env.MONGO_USER_DB_URI;
    }

    // MongoDB에 연결
    await mongoose.connect(uri);

    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return false;
  }
}

/** # MongoDB 연결 해제 함수
 * 
 * - MongoDB와의 연결을 해제하는 함수
 * - 테스트 환경일 때는 MongoMemoryServer를 종료함
 * - 테스트 환경이 아닐 때는 MongoDB와의 연결을 끊음
 * 
 * ## Returns
 * @returns Promise boolean - MongoDB 연결 해제 성공 여부
 * 
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    return true;
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
    return false;
  }
}

module.exports = { connectDB, disconnectDB };