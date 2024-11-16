// crypto.js
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

const algorithm = 'aes-256-cbc';
const key = process.env.ENCRYPTION_KEY;
const ivLength = 16;


// 비밀번호를 해시화하는 함수
async function hashPassword(password) {
    const saltRounds = 10;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        // 비밀번호 해시화 중 오류 발생 시
        return null;
    }
}

// 비밀번호와 해시화된 비밀번호를 비교하는 함수
async function comparePassword(password, hashedPassword) {
    try {
        const match = await bcrypt.compare(password, hashedPassword);
        return match;
    } catch (error) {
        // 비밀번호 비교 중 오류 발생 시
        return false;
    }
}

// 전화번호 등의 데이터를 암호화하는 함수
function encryptData(data) {
    const iv = crypto.randomBytes(ivLength);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// 암호화된 데이터를 복호화하는 함수
function decryptData(encryptedData) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = {
    hashPassword,
    comparePassword,
    encryptData,
    decryptData
};