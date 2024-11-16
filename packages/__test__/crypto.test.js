// __test__/crypto.test.js
const { hashPassword, comparePassword, encryptData, decryptData } = require('../shared-utils/crypto');

describe('Crypto Utility Test', () => {
    test('비밀번호 해시화 테스트', async () => {
        const password = '1234';
        const hashedPassword = await hashPassword(password);
        expect(hashedPassword).not.toBeNull();
    });

    test('비밀번호 비교 테스트', async () => {
        const password = '1234';
        const hashedPassword = await hashPassword(password);
        const match = await comparePassword(password, hashedPassword);
        expect(match).toBe(true);
    });

    test('데이터 암호화 테스트', () => {
        const data = '01012345678';
        const encryptedData = encryptData(data);
        expect(encryptedData).not.toBeNull();
    });

    test('데이터 복호화 테스트', () => {
        const data = '01012345678';
        const encryptedData = encryptData(data);
        const decryptedData = decryptData(encryptedData);
        expect(decryptedData).toBe(data);
    });
});