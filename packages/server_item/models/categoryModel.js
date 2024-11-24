
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

// String을 Enum으로 변환하는 함수
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

// Category Enum을 외부에서 사용할 수 있도록 export
module.exports = Category;
module.exports.getCategory = getCategory;