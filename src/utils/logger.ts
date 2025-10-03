// Centralized logging utility
import { LogLevel } from '../types/index.js';

export class Logger {
    private logLevel: LogLevel;

    constructor(logLevel: string = 'info') {
        this.logLevel = this.parseLogLevel(logLevel);
    }

    private parseLogLevel(level: string): LogLevel {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const index = levels.indexOf(level.toLowerCase() as LogLevel);
        return index >= 0 ? levels[index] : 'info';
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const currentIndex = levels.indexOf(this.logLevel);
        const messageIndex = levels.indexOf(level);
        return messageIndex >= currentIndex;
    }

    private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') : '';
        
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
    }

    debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, ...args));
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, ...args));
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, ...args));
        }
    }

    error(message: string, ...args: any[]): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, ...args));
        }
    }

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    getLogLevel(): LogLevel {
        return this.logLevel;
    }
}
