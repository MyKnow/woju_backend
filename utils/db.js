// db.js

// .env 파일을 사용하기 위한 설정
require('dotenv').config();

// db.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function connectDB() {
  try {
    const uri = process.env.NODE_ENV === 'test'
      ? new MongoMemoryServer().getUri()
      : process.env.MONGODB_URI;

    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // 에러 발생 시 프로그램 종료
  }
}


async function disconnectDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

module.exports = { connectDB, disconnectDB };