// responseModel.js

// Enum for API failure reasons
const FailureReason = Object.freeze({
    USER_ID_NOT_AVAILABLE: 'USER_ID_NOT_AVAILABLE',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_ID_EMPTY: 'USER_ID_EMPTY',
    PHONENUMBER_NOT_AVAILABLE: 'PHONENUMBER_NOT_AVAILABLE',
    PHONENUMBER_EMPTY: 'PHONENUMBER_EMPTY',
    USER_LOGIN_INFO_EMPTY: 'USER_LOGIN_INFO_EMPTY',
    PASSWORD_NOT_MATCH: 'PASSWORD_NOT_MATCH',
    PASSWORD_EMPTY: 'PASSWORD_EMPTY',
    USER_UID_EMPTY: 'USER_UID_EMPTY',
    SERVER_ERROR: 'SERVER_ERROR',
});

module.exports = {
    FailureReason,
};