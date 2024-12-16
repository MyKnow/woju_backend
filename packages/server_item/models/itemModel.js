// itemModel.js

// 필요한 라이브러리 불러오기
const mongoose = require('mongoose');

// 필요한 모델 불러오기
const { Category } = require('../../shared/models/categoryModel');
const { locationSchema } = require('../models/locationModel');

// 필요한 Util 불러오기
const { DBName } = require('../../shared/utils/db');

/** # Item Schema
 * @name itemSchema
 * @description 아이템 데이터 스키마 정의
 * 
 * @required
 * @param {String} itemUUID - 아이템의 UUID, Non-Null
 * @param {Category} itemCategory - 아이템의 카테고리, Non-Null
 * @param {String} itemName - 아이템의 이름, Non-Null
 * @param {List<Buffer>} itemImages - 아이템의 이미지, Non-Null
 * @param {String} itemDescription - 아이템의 설명, Non-Null
 * @param {Number} itemPrice - 아이템의 가격, Non-Null
 * @param {int} itemFeelingOfUse - 아이템의 사용감, 0: 미개봉, 1: 단순개봉, 2: 사용감 적음, 3: 사용감 많음, 4: 고장 또는 파손, Non-Null
 * @param {Location} itemBarterPlace - 아이템의 교환 장소, Non-Null
 * @param {String} itemOwnerUUID - 아이템의 소유자 UUID, Non-Null
 * @TODO : {String} itemVectorValue - 아이템의 벡터값, Non-Null, TODO 추후 추가
 * 
 * @optional - Default 값이 존재하는 Parameter
 * @param {Date} createdAt - 아이템의 생성일, Non-Null, Default: 현재 시간
 * @param {Date} updatedAt - 아이템의 수정일, Non-Null, Default: 현재 시간
 * @param {int} itemStatus - 아이템의 상태, 0: 예약없음, 1: 예약중, 2: 교환완료, Non-Null, Default: 0
 * @param {int} itemViews - 아이템의 조회수, Non-Null, Default: 0
 * @param {Map<String, String>} itemLikedUsers - 아이템의 매칭 신청 유저 목록(유저 UUID, 아이템 UUID), Non-Null, Default: []
 * @param {List<String>} itemUnlikedUsers - 아이템의 매칭 거절 유저 목록(유저 UUID), Non-Null, Default: []
 * @param {Map<String, String>} itemMatchedUsers - 아이템의 매칭 완료 유저 목록(유저 UUID, 아이템 UUID), Non-Null, Default: []
 */
const itemSchema = new mongoose.Schema({
    // Required
    itemUUID: { type: String, required: true, unique: true },
    itemCategory: { type: String, required: true },
    itemName: { type: String, required: true },
    itemImages: { type: [Buffer], required: true },
    itemDescription: { type: String, required: true },
    itemPrice: { type: Number, required: true },
    itemFeelingOfUse: { type: Number, required: true },
    itemBarterPlace: { type: locationSchema, required: true },
    itemOwnerUUID: { type: String, required: true },
    // Optional
    itemStatus: { type: Number, default: 0 },
    itemViews: { type: Number, default: 0 },
    itemLikedUsers: { type: Map, of: String, default: {} },
    itemUnlikedUsers: { type: [String], default: [] },
    itemMatchedUsers: { type: Map, of: String, default: {} },
}, {
    timestamps: true,
});

/** # Create Item Model
 * @name createItemModel
 * @description 아이템 모델 생성 함수
 * 
 * @param {mongoose.Connection} db - DB Connection
 * @returns {mongoose.Model} - Item Model
 */
const createItemModel = (db) => {
    if (!db) {
        throw new Error('DB 연결이 필요합니다.');
    }

    if (db.models[DBName.ITEM]) {
        return db.models[DBName.ITEM];
    }
    // Item DB 연결
    return db.model(DBName.ITEM, itemSchema);
};

// Export Module
module.exports = { 
    itemSchema,
    createItemModel,
};