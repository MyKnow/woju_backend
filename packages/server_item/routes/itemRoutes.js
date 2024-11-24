// routes/itemRoutes.js

// 필요한 라이브러리 불러오기
const express = require('express');
const router = express.Router();

// itemController 가져오기
const itemController = require('../controllers/itemController');

/**  
 * @name GET /item/health-check
 * 
 * @description 서버 상태 확인 API
 */
router.get('/health-check', itemController.healthCheck);

/**
 * @name POST /item/add-item
 * 
 * @description 아이템 추가 API
 */
router.post('/add-item', itemController.addItem);



// Export the router
module.exports = router;