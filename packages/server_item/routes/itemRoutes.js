// routes/itemRoutes.js

// 필요한 라이브러리 불러오기
const express = require('express');
const router = express.Router();

// itemController 가져오기
const itemController = require('../controllers/itemController');

/**
 * @name GET /item/health-check
 * @description 서버 상태 확인 API
 */
router.get('/health-check', itemController.healthCheck);

/**
 * @name POST /item/add-item
 * @description 아이템 추가 API
 */
router.post('/add-item', itemController.addItem);

/**
 * @name GET /item/get-users-item-list
 * @description 아이템 목록 조회 API
 */
router.get('/get-users-item-list', itemController.getUsersItemList);

/**
 * @name POST /item/update-item
 * @description 아이템 수정 API
 */
router.post('/update-item', itemController.updateItem);

/**
 * @name DELETE /item/delete-item
 * @description 아이템 삭제 API
 */
router.delete('/delete-item', itemController.deleteItem);

/**
 * @name GET /item/get-item-info
 * @description 아이템 상세 조회 API
 */
router.get('/get-item-info', itemController.getItemInfo);

/**
 * @name GET /item/get-item-list-with-query
 * @description 쿼리로 아이템 목록 조회 API
 */
router.get('/get-item-list-with-query', itemController.getItemListWithQuery);

/**
 * @name POST /item/request-like-item
 * @description 아이템 좋아요 신청 API
 */
router.post('/request-like-item', itemController.requestLikeItem);

/**
 * @name POST /item/request-unlike-item
 * @description 아이템 싫어요 신청 API
 */
router.post('/request-unlike-item', itemController.requestUnlikeItem);

/**
 * @name POST /item/request-match-item
 * @description 아이템 매칭 신청 API
 */
router.post('/request-match-item', itemController.requestMatchItem);

// Export the router
module.exports = router;