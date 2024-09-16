// routes/policyRoutes.js
const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');

// 이용 약관 내용 조회 GET API
router.get('/terms', policyController.getPolicyContent);

// 이용 약관 수정 API
router.put('/terms', policyController.updatePolicyContent);

// 이용 약관 추가 API
router.post('/terms', policyController.addPolicyContent);

// 이용 약관 삭제 API
router.delete('/terms', policyController.deletePolicyContent);

module.exports = router;