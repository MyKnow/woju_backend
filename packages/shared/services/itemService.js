// services/itemService.js

// 필요한 모델 불러오기
const { createItemModel, itemSchema } = require('../models/itemModel');
const { getCategory, isValidCategory, isValidCategoryMap, getAllCategories }  = require('../models/categoryModel');
const { isValidateLocation } = require('../models/locationModel');

// 필요한 라이브러리 불러오기
const { v4: uuidv4 } = require('uuid');

// 필요한 Util 불러오기
const { isMongoDBConnected, connectDB, DBType, DBUri } = require('../utils/db');

// 필요한 Service 불러오기
const { createChatRoomService } = require('../../shared/services/chatService');

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
    const itemDB = await connectDB(DBType.ITEM, DBUri.ITEM);

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
    try 
    {
        const result = await newItem.save();
        return { success: result !== null };
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
const getUsersItemList = async function (userUUID) {
    // DB 연결
    const itemDB = await connectDB(DBType.ITEM, DBUri.ITEM);

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
    const itemDB = await connectDB(DBType.ITEM, DBUri.ITEM);

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
    const itemDB = await connectDB(DBType.ITEM, DBUri.ITEM);

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
    const itemDB = await connectDB(DBType.ITEM, DBUri.ITEM);

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

/**
 * @name getItemListWithQuery
 * @description 홈 화면에 보여줄 아이템 목록 조회 함수
 * 
 * ### Notes
 * - 카테고리 선호도 맵이 존재하는 경우, 사용자 선호도에 따라 아이템을 필터링하여 조회
 * - 카테고리 선호도 맵이 없는 경우, 전체 아이템을 조회
 * - 조회 시, 조회하는 User의 UUID가 Item의 itemLikedUsers, itemUnlikedUsers, itemMatchedUsers에 있는 경우, 해당 아이템은 제외하고 조회함.
 * 
 * ### Query Parameters
 * @param {Number} query.userUUID - 조회를 요청한 사용자 UUID
 * 
 * ### Query Parameters Nullable
 * @param {Number?} query.limit - 조회 개수 (Null인 경우 10)
 * @param {Number?} query.page - 페이지 번호 (Null인 경우 1)
 * @param {Number?} query.sort - 정렬 방식 (Null인 경우 생성일 내림차순, 1: 생성일 오름차순, -1: 생성일 내림차순, 2: 가격 오름차순, -2: 가격 내림차순)
 * @param {String?} query.search - 검색어 (Null인 경우 전체)
 * @param {Object?} query.categoryMap - 카테고리 선호도 Map (Map<String, Number>) (Null인 경우 전체)
 * @param {String?} query.categoryList - 필터링 할 카테고리 리스트 (Null인 경우 전체)
 * @param {String?} query.distanceLimit - 직선 거리 제한 (Null인 경우 전체)
 * @param {Number?} query.priceMin - 최소 가격 (Null인 경우 전체)
 * @param {Number?} query.priceMax - 최대 가격 (Null인 경우 전체)
 * @param {Number?} query.feelingOfUseMin - 사용감 하한선 (Null인 경우 전체)
 * @param {Number?} query.status - 아이템 상태 (Null인 경우 전체)
 * 
 * ### Return
 * @returns {List<itemSchema>} - 아이템 목록
 * @returns {string?} - 에러 메시지 (존재하지 않는 경우 null)
 */
const getItemListWithQuery = async function (query) {
    // MongoDB 연결 시도
    const itemDB = await connectDB(DBType.ITEM, DBUri.ITEM);

    // MongoDB 연결 실패 시 에러 반환
    if (!itemDB || isMongoDBConnected(DBType.ITEM) === false) {
        return { itemList: [], error: 'DB 연결 실패' };
    }

    // 아이템 모델 생성
    const Item = createItemModel(itemDB);

    // 쿼리 파라미터 초기화 및 기본값 설정
    const {
        userUUID,           // 사용자 UUID (필수)
        limit = 10,         // 페이지당 조회 개수 (기본값: 10)
        page = 1,           // 페이지 번호 (기본값: 1)
        sort = -1,          // 정렬 방식 (기본값: 생성일 내림차순)
        search,             // 검색어 (Optional)
        categoryMap,        // 카테고리 선호도 맵 (Optional)
        categoryList,       // 검색할 단일 카테고리 (Optional)
        distanceLimit,      // 거리 제한 (현재 미구현)
        priceMin,           // 최소 가격 (Optional)
        priceMax,           // 최대 가격 (Optional)
        feelingOfUseMin,    // 사용감 하한선 (Optional)
        statusList              // 아이템 상태 리스트 (Optional)
    } = query;

    // 기본 검색 조건 객체 초기화
    const queryObject = {};

    // 정렬 방식 기본값 설정 (생성일 기준 내림차순)
    let sortForQuery = { createdAt: -1 };

    // 정렬 조건이 지정된 경우 처리
    const sortInt = parseInt(sort);
    if (sortInt === 1 || sortInt === -1) {
        sortForQuery = { createdAt: sortInt }; // 생성일 기준 정렬
    } else if (sortInt === 2 || sortInt === -2) {
        sortForQuery = { itemPrice: sortInt / 2 }; // 가격 기준 정렬
    }

    // 검색어가 있는 경우, itemName 필드에서 검색
    if (search) {
        queryObject.itemName = { $regex: search, $options: 'i' }; // 대소문자 구분 없이 검색
    }

    // 최소 가격 조건 추가 (정수만 입력 가능)
    if (priceMin) {
        // Number 또는 Number로 변환 가능한 문자열이 아닌 경우 에러 반환
        const convertedPriceMin = parseInt(priceMin);
        if (isNaN(convertedPriceMin) || convertedPriceMin < 0) {
            console.log(typeof priceMin);
            return { itemList: [], error: '유효하지 않은 최소 가격' };
        }
        queryObject.itemPrice = { $gte: priceMin };
    }

    // 최대 가격 조건 추가
    if (priceMax) {
        // Number 또는 Number로 변환 가능한 문자열이 아닌 경우 에러 반환
        const convertedPriceMax = parseInt(priceMax);
        if (isNaN(convertedPriceMax) || convertedPriceMax < 0) {
            return { itemList: [], error: '유효하지 않은 최대 가격' };
        }
        queryObject.itemPrice = { ...queryObject.itemPrice, $lte: priceMax };
    }

    // 사용감 하한선 조건 추가
    if (feelingOfUseMin) {
        // feelingOfUseMin 보다 작은 값(지정한 상태보다 더 좋은 아이템)만 조회
        // ex) feelingOfUseMin이 3인 경우, 0, 1, 2, 3인 아이템만 조회

        // Number 또는 Number로 변환 가능한 문자열이 아닌 경우 에러 반환
        const convertedFeelingOfUseMin = parseInt(feelingOfUseMin);
        if (isNaN(convertedFeelingOfUseMin) || convertedFeelingOfUseMin < 0 || convertedFeelingOfUseMin > 4) {
            return { itemList: [], error: '유효하지 않은 사용감 하한선' };
        }
        queryObject.itemFeelingOfUse = { $lte: feelingOfUseMin };
    }

    // 아이템 상태 리스트 조건 추가
    if (statusList) {
        // statusList가 문자열이 아닌 경우 에러 반환
        if (typeof statusList !== 'string') {
            return { itemList: [], error: '유효하지 않은 아이템 상태' };
        }
        const statusListSplited = statusList.split(',').map((status) => parseInt(status));
        queryObject.itemStatus = { $in: statusListSplited };
    }

    // userUUID가 없는 경우 에러 반환
    if (!userUUID) {
        return { itemList: [], error: '사용자 UUID가 없습니다.' };
    }

    // 조회한 User의 UUID가 itemLikedUsers, itemUnlikedUsers, itemMatchedUsers에 있는 경우, 해당 아이템은 제외하고 조회함.
    // itemLikedUsers는 Map({ userUUID: itemUUID }) 형태이므로, userUUID가 있는지 확인
    // itemUnlikedUsers는 List<userUUID> 형태이므로, userUUID가 있는지 확인
    // itemMatchedUsers는 Map({ userUUID: itemUUID }) 형태이므로, userUUID가 있는지 확인
    queryObject['itemLikedUsers.' + userUUID] = { $exists: false };
    queryObject['itemUnlikedUsers'] = { $ne: userUUID };
    queryObject['itemMatchedUsers.' + userUUID] = { $exists: false };

    // 본인 아이템은 조회되지 않도록 설정
    queryObject.itemOwnerUUID = { $ne: userUUID };

    try {
        // 카테고리 목록이 존재하는 경우 (선호도 상관없이 카테고리 목록으로 필터링하여 검색)
        if (categoryList) {
            const categoryListSplited = categoryList.split(','); // 쉼표로 구분된 카테고리 목록 분리
            if (!categoryListSplited.every(isValidCategory) || categoryListSplited.length === 0) {
                return { itemList: [], error: '유효하지 않은 카테고리' }; // 카테고리 검증 실패
            }
            queryObject.itemCategory = { $in: categoryListSplited }; // 카테고리 필터링 조건 추가
        }
        // 카테고리 목록이 존재하지 않고 카테고리 맵이 존재하는 경우 (사용자 선호도 기반 검색)
        else if (categoryMap) {
            if (!isValidCategoryMap(categoryMap)) {
                return { itemList: [], error: '유효하지 않은 카테고리 맵' }; // 카테고리 맵 검증 실패
            }

            // 카테고리 맵을 선호도 순으로 정렬
            const sortedCategories = Object.entries(categoryMap)
                .sort(([, a], [, b]) => a - b)
                .map(([key]) => key);

            // 카테고리별 노출 비율 계산
            const exposureRatios = [];
            let remainingRatio = 1; // 전체 비율 시작값 (100%)
            sortedCategories.forEach(() => {
                const ratio = remainingRatio / 2; // 각 카테고리에 할당할 비율
                exposureRatios.push(ratio);      // 계산된 비율 저장
                remainingRatio -= ratio;        // 남은 비율 감소
            });
            exposureRatios.push(remainingRatio); // 남은 비율은 나머지 카테고리에 할당

            // 각 카테고리에 대한 쿼리 생성
            const categoryQueries = sortedCategories.map((cat, idx) => {
                const ratio = exposureRatios[idx]; // 현재 카테고리 비율
                const query = { ...queryObject, itemCategory: getCategory(cat) }; // 해당 카테고리 조건 추가
                return { query, ratio };
            });

            // 나머지 카테고리에 대한 쿼리 생성
            const remainingQuery = { 
                ...queryObject, 
                itemCategory: { $nin: sortedCategories.map((cat) => getCategory(cat)) }  // 선호도에 없는 카테고리만 조회
            };

            // 각 카테고리별 아이템 목록 조회
            const itemList = await Promise.all(
                categoryQueries.map(async ({ query, ratio }) => 
                    Item.find(query)
                        .limit(Math.ceil(limit * ratio)) // 비율에 따른 조회 개수 설정
                        .sort(sortForQuery) // 정렬 방식 적용
                )
            );

            // 나머지 카테고리 아이템 조회
            const remainingItems = await Item.find(remainingQuery)
                .limit(Math.ceil(limit * exposureRatios.at(-1))) // 남은 비율 적용
                .sort(sortForQuery); // 정렬 방식 적용

            // 조회된 모든 아이템 병합
            const mergedItemList = itemList.flat().concat(remainingItems);

            return { itemList: mergedItemList, error: null }; // 최종 결과 반환
        } 

        // 카테고리 리스트와 맵이 모두 없는 경우 (전체 검색)
        const itemList = await Item.find(queryObject)
            .limit(limit) // 페이지당 조회 개수
            .skip((page - 1) * limit) // 페이지 번호에 따른 스킵 계산
            .sort(sortForQuery); // 정렬 방식 적용

        return { itemList, error: null }; // 최종 결과 반환
    } catch (error) {
        console.error(error); // 오류 로그 출력
        return { itemList: [], error: '검색 실패' }; // 오류 메시지 반환
    }
};

/**
 * @name requestLikeItem
 * @description 아이템 매칭 요청 함수
 * 
 * @param {String} myUserUUID - 사용자 UUID
 * @param {String} myItemUUID - 아이템 UUID
 * @param {String} targetItemUUID - 매칭 대상 아이템 UUID
 * 
 * @returns {{boolean, string?}}
 */
const requestLikeItem = async function (myUserUUID, myItemUUID, targetItemUUID) {
    let item = await getItemInfo(myItemUUID);
    let targetItem = await getItemInfo(targetItemUUID);

    // 아이템이 존재하지 않는 경우 에러 반환
    if (!item || !targetItem) {
        return { success: false, error: '아이템이 존재하지 않습니다.' };
    }

    // 본인 소유 아이템으로 target과 매칭하려 하는 지 확인
    if (item.itemOwnerUUID !== myUserUUID) {
        return { success: false, error: '본인 소유 아이템으로만 매칭 요청이 가능합니다.' };
    }

    // 본인 아이템에 대한 매칭 요청인 경우 에러 반환
    if (myItemUUID === targetItemUUID) {
        return { success: false, error: '본인 아이템에 대한 매칭 요청은 불가능합니다.' };
    }

    // 이미 매칭된 아이템인 경우 에러 반환
    if (item.itemMatchedUsers.has(targetItem.itemOwnerUUID)) {
        return { success: false, error: '이미 매칭된 아이템입니다.' };
    }

    // 이미 Like한 아이템인 경우 바로 성공 반환
    if (targetItem.itemLikedUsers.has(myUserUUID)) {
        return { success: true }; 
    }

    // 이미 Unlike한 아이템인 경우, Like 후 성공 반환
    if (targetItem.itemUnlikedUsers.includes(myUserUUID)) {
        targetItem.itemUnlikedUsers = targetItem.itemUnlikedUsers.filter((userUUID) => userUUID !== myUserUUID);
    }

    // Map({ userUUID: itemUUID })을 itemLikedUsers에 추가
    targetItem.itemLikedUsers.set(myUserUUID, myItemUUID);

    // TODO: 알림 서비스 연동 필요

    // 매칭 신청 유저 목록 업데이트
    try {
        await targetItem.save();
        return { success: true };
    } catch (error) {
        return { success: false, error: error };
    }
}

/**
 * @name requestUnlikeItem
 * @description 아이템 비매칭 요청 함수
 * 
 * @param {String} userUUID - 사용자 UUID
 * @param {String} targetItemUUID - 비매칭 대상 아이템 UUID
 * 
 * @returns {{boolean, string?}}
 */
const requestUnlikeItem = async function (userUUID, targetItemUUID) {
    const targetItem = await getItemInfo(targetItemUUID);

    // 아이템이 존재하지 않는 경우 에러 반환
    if (!targetItem) {
        return { success: false, error: '아이템이 존재하지 않습니다.' };
    }

    // 이미 비매칭 요청한 아이템인 경우 바로 성공 반환
    if (targetItem.itemUnlikedUsers.includes(userUUID)) {
        return { success: true };
    }

    // 이미 매칭된 아이템인 경우 에러 반환
    if (targetItem.itemMatchedUsers.has(userUUID)) {
        return { success: false, error: '이미 매칭된 아이템입니다.' };
    }

    // 이미 Like한 아이템인 경우, 에러 반환
    if (targetItem.itemLikedUsers.has(userUUID)) {
        return { success: false, error: '이미 Like한 아이템입니다.' };
    }

    // Map({ userUUID: itemUUID })을 itemUnlikedUsers에 추가
    targetItem.itemUnlikedUsers.push(userUUID);

    // TODO: Target 사용자에게 알림 전송

    // 비매칭 신청 유저 목록 업데이트
    try {
        await targetItem.save();
        return { success: true };
    } catch (error) {
        return { success: false, error: error };
    }
}

/**
 * @name requestMatchItem
 * @description 아이템 매칭 요청 함수
 * 
 * ### Notes
 * - 아이템 소유자가 ItemLikedUsers 중에 한 요청을 골라서 매칭을 확정 짓는 요청을 보내는 함수
 * - ItemLikedUsers에서 Map을 삭제하고 ItemMatchedUsers에 추가
 * - 매칭 요청을 받은 아이템과 매칭 요청을 보낸 아이템의 Status를 1로 변경
 * - 두 유저 간의 채팅방을 생성하고, 채팅방 ID를 두 유저의 ChatRooms에 추가
 * - 두 유저에게 알림을 전송 (TODO: 알림 서비스 연동 필요)
 * 
 * @param {String} myUserUUID - 사용자 UUID
 * @param {String} myItemUUID - 아이템 UUID
 * @param {String} targetItemUUID - 매칭 대상 아이템 UUID
 * 
 * @returns {{String, String?}}
 * - [String] chatroomUUID: 채팅방 UUID
 * - [String]? error: 에러 메시지
 */
const requestMatchItem = async function (myUserUUID, myItemUUID, targetItemUUID) {
    // 아이템 조회
    const myItem = await getItemInfo(myItemUUID);
    const targetItem = await getItemInfo(targetItemUUID);

    // 아이템이 존재하지 않는 경우 에러 반환
    if (!myItem || !targetItem) {
        console.log('requestMatchItem: 아이템이 존재하지 않습니다.\nmyItemUUID: ' + myItemUUID + ', targetItemUUID: ' + targetItemUUID);
        return { chatroomUUID: null, error: '아이템이 존재하지 않습니다.' };
    }

    // myItem의 myItemUUID를 통해 실소유자 확인
    if (myItem.itemOwnerUUID !== myUserUUID) {
        return { chatroomUUID: null, error: '본인 소유 아이템으로만 매칭 요청이 가능합니다.' };
    }

    // 해당 아이템의 itemLikedUsers에 targetItem의 itemOwnerUUID가 있는지 확인
    if (!myItem.itemLikedUsers.has(targetItem.itemOwnerUUID)) {
        return { chatroomUUID: null, error: 'Like 요청을 받은 아이템이 아닙니다.' };
    }

    // targetItem 소유자의 userUUID 확인
    const targetUserUUID = targetItem.itemOwnerUUID;

    // ItemLikedUsers에서 해당 유저의 매칭 요청을 삭제
    myItem.itemLikedUsers.delete(targetUserUUID);
    targetItem.itemLikedUsers.delete(myUserUUID);

    // ItemMatchedUsers에 해당 유저의 매칭 요청을 추가
    myItem.itemMatchedUsers.set(targetUserUUID, targetItemUUID);
    targetItem.itemMatchedUsers.set(myUserUUID, myItemUUID);

    // 매칭 요청을 받은 아이템과 매칭 요청을 보낸 아이템의 Status를 1로 변경
    targetItem.itemStatus = 1;
    myItem.itemStatus = 1;

    // 채팅방 생성 및 ID 반환
    const createResult = await createChatRoomService(myUserUUID, myItemUUID, targetUserUUID, targetItemUUID);

    // Item 저장
    try {
        await myItem.save();
        await targetItem.save();

        return { chatroomUUID: createResult.chatroomUUID, error: null };
    } catch (error) {
        return { chatroomUUID: null, error: error };
    }

    // 채팅방 생성 및 ID 반환 (TODO: 중복 방지 로직 필요)
    const chatRoomID = uuidv4();

    // TODO: 알림 서비스 연동 필요

    // TODO: 채팅방 생성 및 ID 반환
    return { chatRoomID, error: null };
}

exports.addItem = addItem;
exports.parameterCheckForAddItem = parameterCheckForAddItem;
exports.getUsersItemList = getUsersItemList;
exports.updateItem = updateItem;
exports.getItemInfo = getItemInfo;
exports.deleteItem = deleteItem;
exports.getItemListWithQuery = getItemListWithQuery;
exports.requestLikeItem = requestLikeItem;
exports.requestUnlikeItem = requestUnlikeItem;
exports.requestMatchItem = requestMatchItem;