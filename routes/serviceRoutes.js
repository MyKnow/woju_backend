// routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// 서버 연결 상태 확인
router.get('/check-connection-status', serviceController.status);


module.exports = router;