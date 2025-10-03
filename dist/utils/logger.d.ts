import { LogLevel } from '../types/index.js';
export declare class Logger {
    private logLevel;
    constructor(logLevel?: string);
    private parseLogLevel;
    private shouldLog;
    private formatMessage;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    setLogLevel(level: LogLevel): void;
    getLogLevel(): LogLevel;
}
//# sourceMappingURL=logger.d.ts.map