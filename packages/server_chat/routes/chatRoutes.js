// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 서버 연결 상태 확인
router.get('/check-connection-status', chatController.dbStatus);


module.exports = router;