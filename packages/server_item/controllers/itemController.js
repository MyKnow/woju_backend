// controllers/itemController.js

// 필요한 util 불러오기
const { verifyUser } = require('../../shared/utils/auth');
const { isMongoDBConnected, DBType } = require('../../shared/utils/db');

// 필요한 서비스 불러오기
const { addItem, parameterCheckForAddItem, getUsersItemList, updateItem, getItemInfo, deleteItem, getItemListWithQuery, requestLikeItem, requestUnlikeItem, requestMatchItem } = require('../../shared/services/itemService');
const { isExistUserUUID } = require('../../shared/services/userService');

/** # GET /health-check
 * @name healthCheck
 * @description 서버 상태 확인 API
 * 
 * ### Path Parameters
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * ### Returns
 * @returns {Object} - API 응답 결과
 */
exports.healthCheck = (req, res) => {
  const itemDB = isMongoDBConnected(DBType.ITEM);

  if (itemDB) {
    return res.status(200).json({
      message: 'Item DB가 연결되어 있습니다.',
    });
  }

  return res.status(500).json({
    message: 'Item DB 연결 상태를 확인해주세요.',
  });
};

/** # POST /item/add-item
 * @name addItem
 * @description 아이템 추가 API
 * 
 * ### Path Parameters
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 *
 * ### Return
 * @returns {Object} - API 응답 결과
 * 
 * ### Status Codes
 * @returns {200}: 아이템 추가 성공
 * @returns {400}: 요청 바디가 올바르지 않음
 * @returns {402}: 존재하지 않는 사용자
 * @returns {500}: 서버 에러
 * 
 * ### Security
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

/** # GET /item/get-users-item-list
 * @name getUsersItemList
 * @description 아이템 조회 API
 * 
 * ### Path Parameters
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * ### Returns
 * @returns {Object} - API 응답 결과
 * - List<Item> itemList: 사용자의 아이템 목록
 * - String error: 에러 메시지
 * 
  * ### Status Codes
 * @returns {200}: 아이템 조회 성공
 * @returns {400}: 요청 바디가 올바르지 않음
 * @returns {402}: 존재하지 않는 사용자
 * @returns {500}: 서버 에러
 * 
 * ### Security
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

/** # POST /item/update-item
 * @name updateItem
 * @description 아이템 수정 API
 * 
 * ### Path Parameters
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * ### Returns
 * @returns {Object} - API 응답 결과
 * - boolean success: 성공 여부
 * - String error: 에러 메시지
 * 
  * ### Status Codes
 * @returns {200}: 아이템 수정 성공
 * @returns {400}: 요청 바디가 올바르지 않음
 * @returns {402}: 존재하지 않는 사용자
 * @returns {404}: 존재하지 않는 아이템
 * @returns {500}: 서버 에러
 * 
 * ### Security
 * @security - JWT 토큰(Bearer Token) 필요
 */
exports.updateItem = [
  verifyUser, // 미들웨어로 verifyUser를 추가
  async (req, res) => {
    try {
      const {
        itemUUID,
        itemCategory,
        itemName,
        itemImages,
        itemDescription,
        itemPrice,
        itemFeelingOfUse,
        itemBarterPlace,
        itemStatus,
      } = req.body;
      const userUUID = req.userUUID;

      // 사용자 UUID 체크
      if (await isExistUserUUID(userUUID) === false) {
        return res.status(402).json({
          success: false,
          error: '존재하지 않는 사용자입니다.',
        });
      }

      // 아이템 존재 여부 체크
      const item = await getItemInfo(itemUUID);

      if (item === null || item === undefined) {
        return res.status(404).json({
          success: false,
          error: '존재하지 않는 아이템입니다.',
        });
      }

      // itemOwnerUUID와 userUUID가 다른 경우 수정 불가능
      if (item.itemOwnerUUID !== userUUID) {
        return res.status(402).json({
          success: false,
          error: '본인의 아이템만 수정 가능합니다.',
        });
      }


      // 아이템 수정
      const result = await updateItem({
          itemUUID,
          itemCategory,
          itemName,
          itemImages,
          itemDescription,
          itemPrice,
          itemFeelingOfUse,
          itemBarterPlace,
          itemStatus,
      });

      const isSuccess = result.success;

      // 결과 반환
      if (isSuccess) {
        return res.status(200).json({
          success: true,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Error in updateItem controller:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
];

/** # DELETE /item/delete-item
 * @name deleteItem
 * @description 아이템 삭제 API
 * 
 * ### Path Parameters
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * ### Returns
 * @returns {Object} - API 응답 결과
 * - boolean success: 성공 여부
 * - String error: 에러 메시지
 * 
  * ### Status Codes
 * @returns {200}: 아이템 삭제 성공
 * @returns {400}: 요청 바디가 올바르지 않음
 * @returns {402}: 존재하지 않는 사용자
 * @returns {404}: 존재하지 않는 아이템
 * @returns {500}: 서버 에러
 * 
 * ### Security
 * @security - JWT 토큰(Bearer Token) 필요
 * 
 */
exports.deleteItem = [
  verifyUser, // 미들웨어로 verifyUser를 추가
  async (req, res) => {
    try {
      const { itemUUID } = req.body;
      const userUUID = req.userUUID;

      if (!itemUUID) {
        return res.status(400).json({
          success: false,
          error: '요청 바디가 올바르지 않습니다.',
        });
      }

      // 사용자 UUID 체크
      if (await isExistUserUUID(userUUID) === false) {
        return res.status(402).json({
          success: false,
          error: '존재하지 않는 사용자입니다.',
        });
      }

      // 아이템 존재 여부 체크
      const item = await getItemInfo(itemUUID);

      if (item === null || item === undefined) {
        return res.status(404).json({
          success: false,
          error: '존재하지 않는 아이템입니다.',
        });
      }

      // itemOwnerUUID와 userUUID가 다른 경우 삭제 불가능
      if (item.itemOwnerUUID !== userUUID) {
        return res.status(402).json({
          success: false,
          error: '본인의 아이템만 삭제 가능합니다.',
        });
      }

      // 아이템 삭제
      const result = await deleteItem(itemUUID);

      const isSuccess = result.success;

      // 결과 반환
      if (isSuccess) {
        return res.status(200).json({
          success: true,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Error in deleteItem controller:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
];

/** # GET /item/get-item-info
 * @name getItemInfo
 * @description 아이템 조회 API
 * 
 * ### Path Parameters
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * ### Returns
 * @returns {Object} - API 응답 결과
 * - Item item: 아이템 정보 객체
 * - String error: 에러 메시지
 * 
 * ### Status Codes
 * @returns {200}: 아이템 조회 성공
 * @returns {400}: 요청 바디가 올바르지 않음
 * @returns {402}: 존재하지 않는 사용자
 * @returns {404}: 존재하지 않는 아이템
 * @returns {500}: 서버 에러
 * 
 * ### Security
 * @security - JWT 토큰(Bearer Token) 필요
 */
exports.getItemInfo = [
  verifyUser, // 미들웨어로 verifyUser를 추가
  async (req, res) => {
    try {
      const { itemUUID } = req.query;
      const userUUID = req.userUUID;

      if (!itemUUID) {
        return res.status(400).json({
          item: null,
          error: '요청 바디가 올바르지 않습니다.',
        });
      }

      // 아이템 조회
      const item = await getItemInfo(itemUUID);

      // 결과 반환
      if (item) {
        // itemOwnerUUID와 userUUID가 다른 경우 ViewCount 증가
        if (item.itemOwnerUUID !== userUUID) {
          item.itemViews += 1;
          await item.save();
        }
        
        return res.status(200).json({
          item,
        });
      } else {
        return res.status(404).json({
          item: null,
          error: '존재하지 않는 아이템입니다.',
        });
      }
    } catch (error) {
      console.error('Error in getItemInfo controller:', error);
      return res.status(500).json({
        item: null,
        error: error.message,
      });
    }
  }
];


/** # GET /item/get-item-list-with-query
 * @name getItemListWithQuery
 * @description 쿼리로 아이템 목록 조회 API
 * 
 * ### Path Parameters
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * ### Query Parameters Nullable
 * @param {Number?} query.limit - 조회 개수 (Null인 경우 10)
 * @param {Number?} query.page - 페이지 번호 (Null인 경우 1)
 * @param {Number?} query.sort - 정렬 방식 (Null인 경우 생성일 내림차순, 1: 생성일 오름차순, -1: 생성일 내림차순, 2: 가격 오름차순, -2: 가격 내림차순)
 * @param {String?} query.search - 검색어 (Null인 경우 전체)
 * @param {Object?} query.categoryList - 카테고리 목록 (Map<String, Number>) (Null인 경우 전체)
 * @param {String?} query.distanceLimit - 직선 거리 제한 (Null인 경우 전체)
 * @param {Number?} query.priceMin - 최소 가격 (Null인 경우 전체)
 * @param {Number?} query.priceMax - 최대 가격 (Null인 경우 전체)
 * @param {Number?} query.feelingOfUseMin - 사용감 하한선 (Null인 경우 전체)
 * @param {Number?} query.status - 아이템 상태 (Null인 경우 전체)
 * 
 * ### Returns
 * @returns {List<Item>} itemList: 아이템 목록
 * @returns {String?} error: 에러 메시지
 * 
 * ### Status Codes
 * @returns {200} 아이템 조회 성공
 * @returns {400} 요청 바디가 올바르지 않음
 * @returns {402} 존재하지 않는 사용자
 * @returns {500} 서버 에러
 * 
 * ### Security
 * @security - JWT 토큰(Bearer Token) 필요
 */
exports.getItemListWithQuery = [
  verifyUser, // 미들웨어로 verifyUser를 추가
  async (req, res) => {
    try {
      const {
        limit,
        page,
        sort,
        search,
        categoryList,
        categoryMap,
        distanceLimit,
        priceMin,
        priceMax,
        feelingOfUseMin,
        statusList
      } = req.query;

      const userUUID = req.userUUID;

      // 아이템 목록 조회
      const { itemList, error } = await getItemListWithQuery({
        userUUID,
        limit,
        page,
        sort,
        search,
        categoryList,
        categoryMap,
        distanceLimit,
        priceMin,
        priceMax,
        feelingOfUseMin,
        statusList
      });

      // 결과 반환
      if (error === null) {
        return res.status(200).json({
          itemList,
          error: null,
        });
      } else {
        return res.status(400).json({
          itemList: [],
          error,
        });
      }
    } catch (error) {
      console.error('Error in getItemListWithQuery controller:', error);
      return res.status(500).json({
        itemList: [],
        error: error.message,
      });
    }
  },
];

/** # POST /item/request-like-item
 * @name requestLikeItem
 * @description 아이템 좋아요 신청 API
 * 
 * ### Path Parameters
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * ### RequestBody
 * @param {String} myItemUUID - 아이템 UUID
 * @param {String} targetItemUUID - 매칭 대상 아이템 UUID
 * 
 * ### Returns
 * @returns {Object} - API 응답 결과
 * 
 * ### Status Codes
 * @returns {200}: 아이템 좋아요 신청 성공
 * @returns {400}: 요청 바디가 올바르지 않음
 * @returns {402}: 존재하지 않는 사용자
 * @returns {500}: 서버 에러
 * 
 * ### Security
 * @security - JWT 토큰(Bearer Token) 필요
 */
exports.requestLikeItem = [
  verifyUser, // 미들웨어로 verifyUser를 추가
  async (req, res) => {
    try {
      const { myItemUUID, targetItemUUID } = req.body;
      const myUserUUID = req.userUUID;

      // 사용자 UUID 체크
      if (await isExistUserUUID(myUserUUID) === false) {
        return res.status(402).json({
          success: false,
          error: '존재하지 않는 사용자입니다.',
        });
      }

      // 아이템 좋아요 신청
      const result = await requestLikeItem(
        myUserUUID,
        myItemUUID,
        targetItemUUID
      );

      // 결과 반환
      if (result.success) {
        return res.status(200).json({
          success: true,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Error in requestLikeItem controller:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
];

/** # POST /item/request-unlike-item
 * @name requestUnlikeItem
 * @description 아이템 싫어요 신청 API
 * 
 * ### Path Parameters
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * ### RequestBody
 * @param {String} targetItemUUID - 매칭 대상 아이템 UUID
 * 
 * ### Returns
 * @returns {Object} - API 응답 결과
 * 
 * ### Status Codes
 * @returns {200}: 아이템 싫어요 신청 성공
 * @returns {400}: 요청 바디가 올바르지 않음
 * @returns {402}: 존재하지 않는 사용자
 * @returns {404}: 존재하지 않는 아이템
 * @returns {500}: 서버 에러
 * 
 * ### Security
 * @security - JWT 토큰(Bearer Token) 필요
 */
exports.requestUnlikeItem = [
  verifyUser, // 미들웨어로 verifyUser를 추가
  async (req, res) => {
    try {
      const { targetItemUUID } = req.body;
      const myUserUUID = req.userUUID;

      // 사용자 UUID 체크
      if (await isExistUserUUID(myUserUUID) === false) {
        return res.status(402).json({
          success: false,
          error: '존재하지 않는 사용자입니다.',
        });
      }

      // 아이템 싫어요 신청
      const result = await requestUnlikeItem(
        myUserUUID,
        targetItemUUID,
      );

      // 결과 반환
      if (result.success) {
        return res.status(200).json({
          success: true,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Error in requestUnlikeItem controller:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
];

/** # POST /item/request-match-item
 * @name requestMatchItem
 * @description 아이템 매칭 신청 API
 * 
 * ### Path Parameters
 * @param {Object} req - Request 객체
 * @param {Object} res - Response 객체
 * 
 * ### RequestBody
 * @param {String} myItemUUID - 아이템 UUID
 * @param {String} targetItemUUID - 매칭 대상 아이템 UUID
 * 
 * ### Returns
 * @return {String} chatroomUUID: 채팅방 UUID
 * 
 * ### Status Codes
 * @returns {200}: 아이템 매칭 신청 성공
 * @returns {400}: 요청 바디가 올바르지 않음
 * @returns {402}: 존재하지 않는 사용자
 * @returns {404}: 존재하지 않는 아이템
 * @returns {500}: 서버 에러
 * 
 * ### Security
 * @security - JWT 토큰(Bearer Token) 필요
 */
exports.requestMatchItem = [
  verifyUser, // 미들웨어로 verifyUser를 추가
  async (req, res) => {
    try {
      const { myItemUUID, targetItemUUID } = req.body;
      const myUserUUID = req.userUUID;

      // 사용자 UUID 체크
      if (await isExistUserUUID(myUserUUID) === false) {
        return res.status(402).json({
          success: false,
          error: '존재하지 않는 사용자입니다.',
        });
      }

      // 아이템 존재 여부 체크
      const item = await getItemInfo(myItemUUID);
      const targetItem = await getItemInfo(targetItemUUID);

      if (item === null || item === undefined) {
        return res.status(400).json({
          success: false,
          error: '존재하지 않는 아이템입니다.',
        });
      }
      if (targetItem === null || targetItem === undefined) {
        return res.status(404).json({
          success: false,
          error: '존재하지 않는 매칭 대상 아이템입니다.',
        });
      }

      // 실소유자인지 확인
      if (item.itemOwnerUUID !== myUserUUID) {
        return res.status(402).json({
          success: false,
          error: '본인의 아이템만 매칭 가능합니다.',
        });
      }

      // 아이템 매칭 신청
      const {chatroomUUID, error} = await requestMatchItem(
        myUserUUID,
        myItemUUID,
        targetItemUUID,
      );
      console.log('chatroomUUID:', chatroomUUID);
      console.log('error:', error);

      // 결과 반환
      if (chatroomUUID) {
        return res.status(200).json({
          chatroomUUID: chatroomUUID,
          result: null,
        });
      } else {
        return res.status(400).json({
          chatroomUUID: null,
          error: error,
        });
      }
    } catch (error) {
      console.error('Error in requestMatchItem controller:', error);
      return res.status(500).json({
        chatroomUUID: null,
        error: error.message,
      });
    }
  },
];