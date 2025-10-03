export class Logger {
    constructor(logLevel = 'info') {
        Object.defineProperty(this, "logLevel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.logLevel = this.parseLogLevel(logLevel);
    }
    parseLogLevel(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const index = levels.indexOf(level.toLowerCase());
        return index >= 0 ? levels[index] : 'info';
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentIndex = levels.indexOf(this.logLevel);
        const messageIndex = levels.indexOf(level);
        return messageIndex >= currentIndex;
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
    }
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, ...args));
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, ...args));
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, ...args));
        }
    }
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, ...args));
        }
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    getLogLevel() {
        return this.logLevel;
    }
}
//# sourceMappingURL=logger.js.map