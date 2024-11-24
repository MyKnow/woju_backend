// services/itemService.js

// 필요한 모델 불러오기
const { createItemModel } = require('../../server_item/models/itemModel');
const { getCategory }  = require('../../server_item/models/categoryModel');
const { isValidateLocation } = require('../models/locationModel');

// 필요한 라이브러리 불러오기
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// 필요한 서비스 불러오기
const { isMongoDBConnected } = require('../../shared/utils/db');

// 필요한 Util 불러오기
const { connectDB } = require('../../shared/utils/db');

/**
 * @name healthCheckForDB
 * @description DB 연결 상태 확인 함수
 * 
 * @returns {boolean} - DB 연결 상태
 */
exports.healthCheckForDB = () => {
  return isMongoDBConnected('Item');
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
        if (typeof itemCategory !== 'string') {
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

        // itemFeelingOfUse: 1, 2, 3, 4, 5 중 하나
        if (typeof itemFeelingOfUse !== 'number' || itemFeelingOfUse < 1 || itemFeelingOfUse > 5) {
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
    const itemDB = await connectDB('Item', process.env.MONGO_ITEM_DB_URI);

    if (!itemDB || isMongoDBConnected('Item') === false) {
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
        category,
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

exports.addItem = addItem;
exports.parameterCheckForAddItem = parameterCheckForAddItem;


