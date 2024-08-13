// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 사용자 조회 API 엔드포인트
router.post('/check-exist-user', userController.checkUser);

module.exports = router;