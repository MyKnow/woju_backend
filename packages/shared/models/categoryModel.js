
/**
 * @enum {Category}
 * 
 * @description 아이템의 카테고리 Enum, Class 정의
 * 
 * @default
 * @param {String} Category.ALL - 전체
 * @param {String} Category.ELECTRONICS - 전자기기
 * @param {String} Category.FURNITURE - 가구
 * @param {String} Category.LIFESTYLE - 생활용품
 * @param {String} Category.FASHION - 패션의류
 * @param {String} Category.BOOK - 도서
 * @param {String} Category.LAYETTE - 유아용품(의류)
 * @param {String} Category.COSMETIC - 뷰티용품
 * @param {String} Category.SPORTS_EQUIPMENT - 스포츠용품
 * @param {String} Category.HOBBY_GOODS - 취미용품
 * @param {String} Category.ALBUM - 음반
 * @param {String} Category.CAR_GOODS - 자동차용품
 * @param {String} Category.TICKET - 티켓
 * @param {String} Category.PET_GOODS - 반려동물용품
 * @param {String} Category.PLANT - 식물
 * @param {String} Category.ETC - 기타
 */
const Category = {
    ALL: 'all',
    ELECTRONICS: 'electronics',
    FURNITURE: 'furniture',
    LIFESTYLE: 'lifestyle',
    FASHION: 'fashion',
    BOOK: 'book',
    LAYETTE: 'layette',
    COSMETIC: 'cosmetic',
    SPORTS_EQUIPMENT: 'sportsEquipment',
    HOBBY_GOODS: 'hobbyGoods',
    ALBUM: 'album',
    CAR_GOODS: 'carGoods',
    TICKET: 'ticket',
    PET_GOODS: 'petGoods',
    PLANT: 'plant',
    ETC: 'etc'
};

/**
 * @name getCategory
 * @description 입력된 카테고리에 해당하는 Category Enum 반환
 * 
 * @param {String} category - 입력된 카테고리
 * 
 * @returns {Category} 입력된 카테고리에 해당하는 Category Enum
 */
const getCategory = (category) => {
    switch (category) {
        case 'electronics':
            return Category.ELECTRONICS;
        case 'furniture':
            return Category.FURNITURE;
        case 'lifestyle':
            return Category.LIFESTYLE;
        case 'fashion':
            return Category.FASHION;
        case 'book':
            return Category.BOOK;
        case 'layette':
            return Category.LAYETTE;
        case 'cosmetic':
            return Category.COSMETIC;
        case 'sportsEquipment':
            return Category.SPORTS_EQUIPMENT;
        case 'hobbyGoods':
            return Category.HOBBY_GOODS;
        case 'album':
            return Category.ALBUM;
        case 'carGoods':
            return Category.CAR_GOODS;
        case 'ticket':
            return Category.TICKET;
        case 'petGoods':
            return Category.PET_GOODS;
        case 'plant':
            return Category.PLANT;
        case 'etc':
            return Category.ETC;
        default:
            return null;
    }
}

/**
 * @name isValidCategory
 * @description 입력된 카테고리가 유효한지 확인
 * 
 * @param {String} category - 입력된 카테고리
 * 
 * @returns {Boolean} 유효한 카테고리인지 여부
 */
const isValidCategory = (category) => {
    return getCategory(category) !== null;
}

/**
 * @name getAllCategories
 * @description ALL을 제외한 모든 카테고리를 배열로 반환
 * 
 * @returns {Array<String>} 모든 카테고리 배열
 */
const getAllCategories = () => {
    return [
        Category.ELECTRONICS,
        Category.FURNITURE,
        Category.LIFESTYLE,
        Category.FASHION,
        Category.BOOK,
        Category.LAYETTE,
        Category.COSMETIC,
        Category.SPORTS_EQUIPMENT,
        Category.HOBBY_GOODS,
        Category.ALBUM,
        Category.CAR_GOODS,
        Category.TICKET,
        Category.PET_GOODS,
        Category.PLANT,
        Category.ETC
    ];
}

/**
 * @name isValidCategoryMap
 * @description 입력된 카테고리 맵이 유효한지 확인
 * 
 * @param {Object} categoryMap - 입력된 카테고리 맵
 * 
 * @returns {Boolean} 유효한 카테고리 맵인지 여부
 * 
 * ### Note
 * - categoryMap은 카테고리 String을 key로, 선호 순위를 value로 가지는 객체
 * - categoryMap의 key는 유효한 카테고리여야 함
 * - categoryMap의 value는 0 이상의 정수여야 하며, 0부터 N까지에서 0이 가장 높은 선호도를 의미하며, 중복된 값이 없어야 함
 * - categoryMap이 유효한 경우 true, 그렇지 않은 경우 false 반환
 */
const isValidCategoryMap = (categoryMap) => {
    const categories = getAllCategories();

    if (typeof categoryMap === 'object') {
        for (const key in categoryMap) {
            // 카테고리가 유효한지 확인
            if (!categories.includes(key)) {
                return false;
            }
            // 선호도가 0 이상의 정수인지 확인
            const parsedValue = parseInt(categoryMap[key]);

            if (!Number.isInteger(parsedValue) || parsedValue < 0) {
                return false;
            }
        }
        // 중복된 선호도 값이 있는지 확인
        const values = Object.values(categoryMap);
        const parsedValues = values.map(value => parseInt(value));
        const uniqueValues = [...new Set(parsedValues)];

        if (parsedValues.length !== uniqueValues.length) {
            return false;
        }

        // 선호도가 0부터 N까지인지 확인
        for (let i = 0; i < parsedValues.length; i++) {
            if (!parsedValues.includes(i)) {
                return false;
            }
        }

    } else {
        return false;
    }
    return true;
}

// Category Enum을 외부에서 사용할 수 있도록 export
module.exports.Category = Category;
module.exports.getCategory = getCategory;
module.exports.isValidCategory = isValidCategory;
module.exports.getAllCategories = getAllCategories;
module.exports.isValidCategoryMap = isValidCategoryMap;