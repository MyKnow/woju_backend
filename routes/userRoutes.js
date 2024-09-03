// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 사용자 조회 API 엔드포인트
router.post('/check-phonenumber-available', userController.checkPhoneNumberAvailable);

// 아이디 중복 확인 API 엔드포인트
router.post('/check-userid-available', userController.checkUserIDAvailable);

// 사용자 등록 API 엔드포인트
router.post('/signup', userController.signupUser);

// 사용자 로그인 API 엔드포인트
router.post('/login', userController.loginUser);

// 사용자 탈퇴 API 엔드포인트
router.post('/withdraw', userController.withdrawUser);

// 사용자 비밀번호 수정 API 엔드포인트
router.post('/update-user-password', userController.updateUserPassword);

// 사용자 비밀번호 재설정 API 엔드포인트
router.post('/reset-user-password', userController.resetUserPassword);

// 사용자 가입 여부 조회 API 엔드포인트
router.post('/check-user-exists', userController.checkUserExists);

// 사용자 정보 수정 API 엔드포인트
router.post('/update-user-info', userController.updateUserInfo);

/// 사용자 전화번호 수정 API 엔드포인트
router.post('/update-user-phonenumber', userController.updateUserPhoneNumber);

module.exports = router;