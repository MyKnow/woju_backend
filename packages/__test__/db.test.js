// __test__/db.test.js

const { connectDB, disconnectDB } = require('../shared-utils/db');

describe('DB Utility Test', () => {
    // process.env.NODE_ENV === 'test'일 때 테스트
    test('DB 연결 테스트 (테스트 환경)', async () => {
        process.env.NODE_ENV = 'test';

        const result = await connectDB();
        expect(result).toBe(true);

        const disconnectResult = await disconnectDB();
        expect(disconnectResult).toBe(true);
    });

    // process.env.NODE_ENV === 'test' 아닐 때 테스트
    test('DB 연결 테스트 (프로덕션 환경)', async () => {
        process.env.NODE_ENV = 'production';

        const result = await connectDB();
        expect(result).toBe(true);

        const disconnectResult = await disconnectDB();
        expect(disconnectResult).toBe(true);
    });
});