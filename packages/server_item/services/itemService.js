// services/itemService.js

// 필요한 모델 불러오기
const { createItemModel } = require('../../server_item/models/itemModel');
const { getCategory }  = require('../../server_item/models/categoryModel');
const { isValidateLocation } = require('../models/locationModel');

// 필요한 라이브러리 불러오기
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// 필요한 Util 불러오기
const { isMongoDBConnected, connectDB, DBType } = require('../../shared/utils/db');

/**
 * @name healthCheckForDB
 * @description DB 연결 상태 확인 함수
 * 
 * @returns {boolean} - DB 연결 상태
 */
exports.healthCheckForItemDB = () => {
  return isMongoDBConnected(DBType.ITEM);
}

/**
 * @name parameterCheckForAddItem
 * @description 아이템 추가 파라미터 확인 함수
 * - itemCategory : String에서 Category로 변경 가능해야 함.
 * - itemName: 5글자 이상, 30글자 이하
 * - itemImages: 1개 이상, 5개 이하인 Buffer List
 * - itemDescription: 10글자 이상, 300글자 이하
 * - itemPrice: 0 이상, 100,000,000,000 이하
 * - itemFeelingOfUse: 1, 2, 3, 4, 5 중 하나
 * - itemBarterPlace: String에서 Location으로 변경 가능해야하며, 모든 Field가 존재해야 함.
 * - itemOwnerUUID: DB에 존재하는 User UUID여야 함.
 * 
 * @param {Object} itemData - 아이템 데이터
 * 
 * @returns {boolean} - 파라미터 유효성 여부
 */
const parameterCheckForAddItem = async function (itemData) {
    try {
        const {
            itemCategory,
            itemName,
            itemImages,
            itemDescription,
            itemPrice,
            itemFeelingOfUse,
            itemBarterPlace,
        } = itemData;

        // itemCategory: Category로 변경 가능해야 함.
        if (typeof itemCategory !== 'string' || getCategory(itemCategory) === null) {
            return false;
        }

        // itemName: 5글자 이상, 30글자 이하
        if (typeof itemName !== 'string' || itemName.length < 5 || itemName.length > 30) {
            return false;
        }

        // itemImages: 1개 이상, 5개 이하인 Buffer List
        if (!Array.isArray(itemImages) || itemImages.length < 1 || itemImages.length > 5) {
            return false;
        }

        // itemDescription: 10글자 이상, 300글자 이하
        if (typeof itemDescription !== 'string' || itemDescription.length < 10 || itemDescription.length > 300) {
            return false;
        }

        // itemPrice: 0 이상, 100,000,000,000 이하
        if (typeof itemPrice !== 'number' || itemPrice < 0 || itemPrice > 100000000000) {
            return false;
        }

        // itemFeelingOfUse: 0, 1, 2, 3, 4 중 하나
        if (typeof itemFeelingOfUse !== 'number' || itemFeelingOfUse < 0 || itemFeelingOfUse > 4) {
            return false;
        }

        // itemBarterPlace: String에서 Location으로 변경 가능해야하며, 모든 Field가 존재해야 함.
        if (isValidateLocation(itemBarterPlace) === false) {
            return false;
        }

        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

/**
 * @name parameterCheckForUpdateItem
 * @description 아이템 수정 파라미터 확인 함수
 * 
 * @param {Object} itemData - 아이템 데이터
 * - itemUUID: String
 * - itemCategory: String에서 Category로 변경 가능해야 함.
 * - itemName: 5글자 이상, 30글자 이하
 * - itemImages: 1개 이상, 5개 이하인 Buffer List
 * - itemDescription: 10글자 이상, 300글자 이하
 * - itemPrice: 0 이상, 100,000,000,000 이하
 * - itemFeelingOfUse: 1, 2, 3, 4, 5 중 하나
 * - itemBarterPlace: String에서 Location으로 변경 가능해야하며, 모든 Field가 존재해야 함.
 * - itemStatus: 0, 1, 2 중 하나
 * 
 * @returns {boolean} - 파라미터 유효성 여부
 */
const parameterCheckForUpdateItem = async function (itemData) {
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
        } = itemData;

        // itemUUID: String
        if (typeof itemUUID !== 'string') {
            return false;
        }

        // itemCategory: Category로 변경 가능해야 함.
        if (typeof itemCategory !== 'string' || getCategory(itemCategory) === null) {
            return false;
        }

        // itemName: 5글자 이상, 30글자 이하
        if (typeof itemName !== 'string' || itemName.length < 5 || itemName.length > 30) {
            return false;
        }

        // itemImages: 1개 이상, 5개 이하인 Buffer List
        if (!Array.isArray(itemImages) || itemImages.length < 1 || itemImages.length > 5) {
            return false;
        }

        // itemDescription: 10글자 이상, 300글자 이하
        if (typeof itemDescription !== 'string' || itemDescription.length < 10 || itemDescription.length > 300) {
            return false;
        }

        // itemPrice: 0 이상, 100,000,000,000 이하
        if (typeof itemPrice !== 'number' || itemPrice < 0 || itemPrice > 100000000000) {
            return false;
        }

        // itemFeelingOfUse: 0, 1, 2, 3, 4 중 하나
        if (typeof itemFeelingOfUse !== 'number' || itemFeelingOfUse < 0 || itemFeelingOfUse > 4) {
            return false;
        }

        // itemBarterPlace: String에서 Location으로 변경 가능해야하며, 모든 Field가 존재해야 함.
        if (isValidateLocation(itemBarterPlace) === false) {
            return false;
        }

        // itemStatus: 0, 1, 2 중 하나
        if (typeof itemStatus !== 'number' || itemStatus < 0 || itemStatus > 2) {
            return false;
        }

        return true;
    }
    catch (error) {
        console.error(error);
        return false;
    }
}

/**
 * @name addItem
 * @description 아이템 추가 함수
 * 
 * @param {Object} itemData - 아이템 데이터
 * 
 * @returns {{boolean, string?}} 
 * - [boolean] success: 성공 여부
 * - [string] error?: 에러 메시지
 */
const addItem = async function (itemData) {
    const {
        itemCategory,
        itemName,
        itemImages,
        itemDescription,
        itemPrice,
        itemFeelingOfUse,
        itemBarterPlace,
        itemOwnerUUID,
        itemStatus,
    } = itemData;

    // 아이템 생성일, 수정일 설정
    let itemUUID;
    let existing;

    // DB 연결
    const itemDB = await connectDB(DBType.ITEM, process.env.MONGO_ITEM_DB_URI);

    if (!itemDB || isMongoDBConnected(DBType.ITEM) === false) {
        return { success: false, error: 'DB 연결 실패' };
    }

    // 모델 생성
    const Item = createItemModel(itemDB);
    
    // 파라미터 체크
    const isParameterValid = await parameterCheckForAddItem(itemData);

    if (isParameterValid === false) {
        return { success: false, error: '파라미터가 올바르지 않습니다.' };
    }

    // 아이템 UUID 생성(중복 방지)
    do {
        itemUUID = uuidv4();
        existing = await Item.findOne({ 
            itemUUID: itemUUID,
        });
    } while (existing);

    const category = getCategory(itemCategory);
    
    // 아이템 생성
    const newItem = new Item({
        itemUUID,
        itemCategory: category,
        itemName,
        itemImages,
        itemDescription,
        itemPrice,
        itemFeelingOfUse,
        itemBarterPlace,
        itemOwnerUUID,
        itemStatus,
    });

    // 아이템 저장 및 결과 반환
    try {
        await newItem.save();
        return { success: true };
    } catch (error) {
        return { success: false, error: error };
    }
}

/**
 * @name getUsersItemList
 * @description 사용자의 아이템 목록 조회 함수
 * 
 * @param {string} userUUID - 사용자 UUID
 * 
 * @returns {{List<Object>, string?}}
 * - [List<Object>] itemList: 아이템 목록
 * - [string]? error: 에러 메시지
 */
const getItemList = async function (userUUID) {
    // DB 연결
    const itemDB = await connectDB(DBType.ITEM, process.env.MONGO_ITEM_DB_URI);

    if (!itemDB || isMongoDBConnected(DBType.ITEM) === false) {
        return { itemList: [], error: 'DB 연결 실패' };
    }

    // 모델 생성
    const Item = createItemModel(itemDB);

    // 사용자의 아이템 목록 조회
    try {
        const itemList = await Item.find({ itemOwnerUUID: userUUID });
        return { itemList, error: null };
    } catch (error) {
        return { itemList: [], error: error };
    }
}

/**
 * @name updateItem
 * @description 아이템 수정 함수
 * 
 * @param {String} userUUID - 사용자 UUID
 * @param {Object} itemData - 아이템 데이터
 * 
 * @returns {{boolean, string?}}
 * - [boolean] success: 성공 여부
 * - [string]? error: 에러 메시지
 */
const updateItem = async function (itemData) {
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
    } = itemData;

    // DB 연결
    const itemDB = await connectDB(DBType.ITEM, process.env.MONGO_ITEM_DB_URI);

    if (!itemDB || isMongoDBConnected(DBType.ITEM) === false) {
        return { success: false, error: 'DB 연결 실패' };
    }

    // 모델 생성
    const Item = createItemModel(itemDB);

    // 파라미터 체크
    const isParameterValid = await parameterCheckForUpdateItem(itemData);

    if (isParameterValid === false) {
        return { success: false, error: '파라미터가 올바르지 않습니다.' };
    }

    // 아이템 수정
    try {
        await Item.updateOne({ itemUUID: itemUUID }, {
            itemCategory,
            itemName,
            itemImages,
            itemDescription,
            itemPrice,
            itemFeelingOfUse,
            itemBarterPlace,
            itemStatus,
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error };
    }
};

/**
 * @name getItemInfo
 * @description 아이템 UUID를 통한 아이템 정보 조회 함수
 * 
 * @param {String} itemUUID - 아이템 UUID
 * 
 * @returns {Item}? - 아이템 정보 객체 (존재하지 않는 경우 null)
 */
const getItemInfo = async function (itemUUID) {
    // DB 연결
    const itemDB = await connectDB(DBType.ITEM, process.env.MONGO_ITEM_DB_URI);

    if (!itemDB || isMongoDBConnected(DBType.ITEM) === false) {
        return null;
    }

    // 모델 생성
    const Item = createItemModel(itemDB);

    // 아이템 조회
    try {
        const item = await Item.findOne({ itemUUID: itemUUID });

        if (!item) {
            return null;
        }

        return item;
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * @name deleteItem
 * @description 아이템 삭제 함수
 * 
 * @param {String} itemUUID - 아이템 UUID
 * 
 * @returns {{boolean, string?}}
 * - [boolean] success: 성공 여부
 * - [string]? error: 에러 메시지
 */
const deleteItem = async function (itemUUID) {
    // DB 연결
    const itemDB = await connectDB(DBType.ITEM, process.env.MONGO_ITEM_DB_URI);

    if (!itemDB || isMongoDBConnected(DBType.ITEM) === false) {
        return { success: false, error: 'DB 연결 실패' };
    }

    // 모델 생성
    const Item = createItemModel(itemDB);

    // 아이템 삭제
    try {
        await Item.deleteOne({ itemUUID: itemUUID });
        return { success: true };
    } catch (error) {
        return { success: false, error: error };
    }
}



exports.addItem = addItem;
exports.parameterCheckForAddItem = parameterCheckForAddItem;
exports.getItemList = getItemList;
exports.updateItem = updateItem;
exports.getItemInfo = getItemInfo;
exports.deleteItem = deleteItem;