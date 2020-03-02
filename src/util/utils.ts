export function isDefined(obj: any): boolean {
    return obj !== null && typeof obj !== 'undefined';
}

export function isUndefined(obj: any): boolean {
    return !isDefined(obj);
}

/**
 * Create and log error
 * @param log
 *        logger to use
 * @param message
 *        message for log and error
 */
export function createError(log: ioBroker.Logger, message: string) {
    log.error(message);
    return new Error(message);
}