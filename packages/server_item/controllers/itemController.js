// controllers/itemController.js

// 필요한 util 불러오기
const { verifyUser } = require('../../shared/utils/auth');
const { isMongoDBConnected } = require('../../shared/utils/db');

// 필요한 서비스 불러오기
const { addItem, parameterCheckForAddItem, getUsersItemList } = require('../services/itemService');
const { isExistUserUUID } = require('../../shared/services/userService');

/**
 * @name healthCheck
 * 
 * @description 서버 상태 확인 API
 * 
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * @returns {Object} - API 응답 결과
 */
exports.healthCheck = (req, res) => {
  const itemDB = isMongoDBConnected('Item');

  if (itemDB) {
    return res.status(200).json({
      message: 'Item DB가 연결되어 있습니다.',
    });
  }

  return res.status(500).json({
    message: 'Item DB 연결 상태를 확인해주세요.',
  });
};

/**
 * @name addItem
 * 
 * @description 아이템 추가 API
 * 
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * @returns {Object} - API 응답 결과
 * - 200: 아이템 추가 성공
 * - 400: 요청 바디가 올바르지 않음
 * - 500: 서버 에러
 * 
 * @security - JWT 토큰(Bearer Token) 필요
 */
exports.addItem = [
  verifyUser, // 미들웨어로 verifyUser를 추가
  async (req, res) => {
    try {
      const {
        itemCategory,
        itemName,
        itemImages,
        itemDescription,
        itemPrice,
        itemFeelingOfUse,
        itemBarterPlace,
      } = req.body;
      const itemOwnerUUID = req.userUUID;

      const isExistUser = await isExistUserUUID(itemOwnerUUID);

      if (!isExistUser) {
        return res.status(402).json({
          message: '존재하지 않는 사용자입니다.',
        });
      }

      // body에 누락이 있는 지 확인
      const validationResult = parameterCheckForAddItem({
        itemCategory,
        itemName,
        itemImages,
        itemDescription,
        itemPrice,
        itemFeelingOfUse,
        itemBarterPlace,
        itemOwnerUUID,
      });

      if (!validationResult) {
        return res.status(400).json({
          message: '요청 바디가 올바르지 않습니다.',
        });
      }

      // 아이템 추가
      const result = await addItem({
        itemCategory,
        itemName,
        itemImages,
        itemDescription,
        itemPrice,
        itemFeelingOfUse,
        itemBarterPlace,
        itemOwnerUUID,
      });

      const isSuccess = result.success;

      // 결과 반환
      if (isSuccess) {
        return res.status(200).json({
          message: '아이템 추가 성공',
        });
      } else {
        return res.status(400).json({
          message: '아이템 추가 실패: ' + result.error,
        });
      }
    } catch (error) {
      console.error('Error in addItem controller:', error);
      return res.status(500).json({
        message: '서버 에러',
        error: error.message,
      });
    }
  },
];

/**
 * @name getUsersItemList
 * @description 아이템 조회 API
 * 
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * @returns {Object} - API 응답 결과
 * - List<Item> itemList: 사용자의 아이템 목록
 * - String error: 에러 메시지
 * 
 * - 200: 아이템 조회 성공
 * - 400: 요청 바디가 올바르지 않음
 * 
 * @security - JWT 토큰(Bearer Token) 필요
 */
exports.getUsersItemList = [
  verifyUser, // 미들웨어로 verifyUser를 추가
  async (req, res) => {
    try {
      const itemOwnerUUID = req.userUUID;

      const isExistUser = await isExistUserUUID(itemOwnerUUID);

      if (!isExistUser) {
        return res.status(402).json({
          itemList: [],
          message: '존재하지 않는 사용자입니다.',
        });
      }

      // 아이템 조회
      const { itemList, error } = await getUsersItemList(itemOwnerUUID); // 사용자의 아이템 목록 조회

      // 결과 반환
      if (error === null) {
        return res.status(200).json({
          itemList,
        });
      } else {
        return res.status(400).json({
          itemList: [],
          error,
        });
      }
    } catch (error) {
      console.error('Error in getItem controller:', error);
      return res.status(500).json({
        itemList: [],
        error: error.message,
      });
    }
  },
];