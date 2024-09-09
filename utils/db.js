require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function connectDB() {
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

    await mongoose.connect(uri);
    // console.log('MongoDB connected');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

async function disconnectDB() {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
}

module.exports = { connectDB, disconnectDB };