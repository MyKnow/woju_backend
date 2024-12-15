// __test__/db.test.js

const { isAfter } = require('date-fns');
const mongoose = require('mongoose');
const { connectDB, disconnectDB, isMongoDBConnected, DBType } = require('../packages/shared/utils/db');


describe('DB Utility Test', () => {
    afterAll(async () => {
        await Promise.all(Object.values(DBType).map(async (dbType) => {
            await disconnectDB(dbType);
        }));

        await mongoose.disconnect();
        await mongoose.connection.close();
    });

    // process.env.NODE_ENV === 'test'일 때 테스트
    it('DB 연결 테스트 (테스트 환경)', async () => {
        process.env.NODE_ENV = 'test';

        const dbTypes = [DBType.USER, DBType.ITEM, DBType.POLICY];
        const dbUris = [process.env.MONGO_USER_DB_URI, process.env.MONGO_ITEM_DB_URI, process.env.MONGO_POLICY_DB_URI];

        await Promise.all(dbTypes.map((dbType, index) => connectDB(dbType, dbUris[index])));
        dbTypes.forEach(dbType => expect(isMongoDBConnected(dbType)).toBeTruthy());

        await Promise.all(dbTypes.map(disconnectDB));
        dbTypes.forEach(dbType => expect(isMongoDBConnected(dbType)).toBe(false));
    });

    // process.env.NODE_ENV === 'test' 아닐 때 테스트
    it('DB 연결 테스트 (프로덕션 환경)', async () => {
        process.env.NODE_ENV = 'production';

        const dbTypes = [DBType.USER, DBType.ITEM, DBType.POLICY];
        const dbUris = [process.env.MONGO_USER_DB_URI, process.env.MONGO_ITEM_DB_URI, process.env.MONGO_POLICY_DB_URI];

        await Promise.all(dbTypes.map((dbType, index) => connectDB(dbType, dbUris[index])));
        dbTypes.forEach(dbType => expect(isMongoDBConnected(dbType)).toBeTruthy());

        await Promise.all(dbTypes.map(disconnectDB));
        dbTypes.forEach(dbType => expect(isMongoDBConnected(dbType)).toBe(false));
    });
});