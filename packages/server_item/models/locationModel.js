// models/locationModel.js

const mongoose = require('mongoose');

/**
 * @name locationSchema
 * @description 교환 장소 데이터 스키마 정의
 * 
 * @field
 * @param {String} simpleName - 거래 장소의 간단한 이름 (level4나 별도의 건물명이 저장됩니다).
 * @param {String} fullAddress - 거래 장소의 전체 주소 (도로명 주소가 저장됩니다).
 * @param {double} latitude - 거래 장소의 위도.
 * @param {double} longitude - 거래 장소의 경도.
 * @param {int} zipCode - 거래 장소의 우편번호.
 */
const locationSchema = new mongoose.Schema({
    simpleName: { type: String },
    fullAddress: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    zipCode: { type: Number },
});

/**
 * @name isValidateLocation
 * @description 교환 장소 데이터 유효성 검사 함수
 * 
 * @param {Object} locationData - 교환 장소 데이터
 * 
 * @returns {boolean} - 교환 장소 데이터 유효성 여부
 */
function isValidateLocation(locationData) {
    // locationData가 없는 경우
    if (!locationData) {
        return false;
    }

    const {
        simpleName,
        fullAddress,
        latitude,
        longitude,
        zipCode,
    } = locationData;

    // simpleName: String, Non-Null
    if (simpleName && typeof simpleName !== 'string') {
        return false;
    }

    // fullAddress: String, Non-Null
    if (fullAddress && typeof fullAddress !== 'string') {
        return false;
    }

    // latitude: Number, Non-Null
    if (typeof latitude !== 'number') {
        return false;
    }

    // longitude: Number, Non-Null
    if (typeof longitude !== 'number') {
        return false;
    }

    // zipCode: Number, Non-Null
    if (zipCode && typeof zipCode !== 'number') {
        return false;
    }

    return true;
}

/**
 * @name getTestLocationData
 * @description 테스트용 교환 장소 데이터 생성 함수
 * 
 * @returns {Object} - 테스트용 교환 장소 데이터
 */
function getTestLocationData() {
    return {
        simpleName: '역삼동',
        fullAddress: '서울특별시 강남구 역삼동',
        latitude: 37.495985,
        longitude: 127.028585,
        zipCode: 12345,
    };
}

/**
 * @name getLocationFromString
 * @description 문자열에서 교환 장소 데이터를 생성하는 함수
 * 
 * @param {String} locationDataJSON - 교환 장소 데이터 JSON 문자열
 * @returns {Location} - 교환 장소 데이터
 */
function getLocationFromString(locationDataJSON) {
    const locationData = JSON.parse(locationDataJSON);
    return new Location(locationData);
}

/**
 * @name getJSONFromLocation
 * @description 교환 장소 데이터에서 JSON 문자열을 생성하는 함수
 * 
 * @param {Location} location - 교환 장소 데이터
 * @returns {String} - 교환 장소 데이터 JSON 문자열
 */
function getJSONFromLocation(location) {
    return JSON.stringify(location);
}

module.exports = {
    locationSchema,
    isValidateLocation,
    getTestLocationData,
    getLocationFromString,
    getJSONFromLocation,
}