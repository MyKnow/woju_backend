// __test__/db.test.js

const { isAfter } = require('date-fns');
const mongoose = require('mongoose');
const { connectDB, disconnectDB, isMongoDBConnected } = require('../packages/shared/utils/db');


describe('DB Utility Test', () => {
    afterAll(async () => {
        await disconnectDB("User");
        await disconnectDB("Item");

        await mongoose.disconnect();
        await mongoose.connection.close();
    });

    // process.env.NODE_ENV === 'test'일 때 테스트
    it('DB 연결 테스트 (테스트 환경)', async () => {
        process.env.NODE_ENV = 'test';

        await connectDB("User", process.env.MONGO_USER_DB_URI)
        expect(isMongoDBConnected("User")).toBeTruthy();

        await connectDB("Item", process.env.MONGO_ITEM_DB_URI);
        expect(isMongoDBConnected("Item")).toBeTruthy();

        await disconnectDB("User");
        await disconnectDB("Item");

        expect(isMongoDBConnected("User")).toBe(false);
        expect(isMongoDBConnected("Item")).toBe(false);
    });

    // process.env.NODE_ENV === 'test' 아닐 때 테스트
    it('DB 연결 테스트 (프로덕션 환경)', async () => {
        process.env.NODE_ENV = 'production';

        await connectDB("User", process.env.MONGO_USER_DB_URI);
        expect(isMongoDBConnected("User")).toBeTruthy();

        await connectDB("Item", process.env.MONGO_ITEM_DB_URI);
        expect(isMongoDBConnected("Item")).toBeTruthy();

        await disconnectDB("User");
        await disconnectDB("Item");

        expect(isMongoDBConnected("User")).toBe(false);
        expect(isMongoDBConnected("Item")).toBe(false);
    });
});