"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isDefined(obj) {
    return obj !== null && typeof obj !== 'undefined';
}
exports.isDefined = isDefined;
function isUndefined(obj) {
    return !isDefined(obj);
}
exports.isUndefined = isUndefined;
/**
 * Create and log error
 * @param log
 *        logger to use
 * @param message
 *        message for log and error
 */
function createError(log, message) {
    log.error(message);
    return new Error(message);
}
exports.createError = createError;
