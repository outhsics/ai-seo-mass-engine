/**
 * @seo-spy/logger - Structured Logging System
 * Provides production-ready logging with multiple levels, contexts, and formatters
 */

// ============================================
// Types & Interfaces / 类型定义
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  module?: string;
  requestId?: string;
  userId?: string;
}

export interface LoggerOptions {
  level?: LogLevel;
  module?: string;
  pretty?: boolean;
  includeTimestamp?: boolean;
  colorize?: boolean;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  fatal(message: string, error?: Error, context?: LogContext): void;
  setLevel(level: LogLevel): void;
  setContext(context: LogContext): void;
  child(name: string, context?: LogContext): Logger;
}

// ============================================
// Constants / 常量
// ============================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const ANSI_COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  debug: '\x1b[36m',    // cyan
  info: '\x1b[32m',     // green
  warn: '\x1b[33m',     // yellow
  error: '\x1b[31m',    // red
  fatal: '\x1b[35m',    // magenta
  timestamp: '\x1b[90m', // gray
  context: '\x1b[90m',  // gray
  message: '\x1b[0m',   // reset
};

const LEVEL_EMOJIS = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  fatal: '💀',
};

// ============================================
// Environment Detection / 环境检测
// ============================================

function getEnvironment(): 'development' | 'production' | 'test' {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'test') return 'test';
  return 'development';
}

function isPrettyPrint(): boolean {
  return process.env.LOG_PRETTY === 'true' || getEnvironment() === 'development';
}

function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel as LogLevel;
  }
  return getEnvironment() === 'production' ? 'info' : 'debug';
}

// ============================================
// Formatters / 格式化器
// ============================================

function formatJSON(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function formatPretty(entry: LogEntry): string {
  const color = ANSI_COLORS[entry.level];
  const reset = ANSI_COLORS.reset;
  const timestamp = ANSI_COLORS.timestamp;
  const dim = ANSI_COLORS.dim;
  const emoji = LEVEL_EMOJIS[entry.level];
  const level = entry.level.toUpperCase().padEnd(5);
  const time = entry.timestamp.split('T')[1]?.split('.')[0] || entry.timestamp;

  let output = `${timestamp}${dim}[${time}]${reset} ${color}${emoji} ${level}${reset} `;

  if (entry.module) {
    output += `${dim}[${entry.module}]${reset} `;
  }

  output += `${ANSI_COLORS.message}${entry.message}${reset}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    const contextStr = Object.entries(entry.context)
      .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join(' ');
    output += ` ${ANSI_COLORS.context}(${contextStr})${reset}`;
  }

  if (entry.error) {
    output += `\n${ANSI_COLORS.error}  Error: ${entry.error.message}${reset}`;
    if (entry.error.stack) {
      output += `\n${dim}  Stack:\n${entry.error.stack.split('\n').map(l => `    ${l}`).join('\n')}${reset}`;
    }
  }

  return output;
}

// ============================================
// Logger Class / Logger 类
// ============================================

class StructuredLogger implements Logger {
  private level: LogLevel;
  private module?: string;
  private pretty: boolean;
  private includeTimestamp: boolean;
  private colorize: boolean;
  private baseContext: LogContext = {};

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? getLogLevel();
    this.module = options.module;
    this.pretty = options.pretty ?? isPrettyPrint();
    this.includeTimestamp = options.includeTimestamp ?? true;
    this.colorize = options.colorize ?? true;
    this.baseContext = {};
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  private format(entry: LogEntry): string {
    if (this.pretty) {
      return formatPretty(entry);
    }
    return formatJSON(entry);
  }

  private write(entry: LogEntry): void {
    const output = this.format(entry);
    const stream = entry.level === 'error' || entry.level === 'fatal' ? console.error : console.log;
    stream(output);
  }

  private createEntry(level: LogLevel, message: string, error?: Error, context?: LogContext): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (this.module) entry.module = this.module;
    if (this.includeTimestamp) entry.timestamp = new Date().toISOString();

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as unknown as { code?: string }).code,
      };
    }

    if (context || Object.keys(this.baseContext).length > 0) {
      entry.context = { ...this.baseContext, ...context };
    }

    return entry;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.write(this.createEntry('debug', message, undefined, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.write(this.createEntry('info', message, undefined, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.write(this.createEntry('warn', message, undefined, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      this.write(this.createEntry('error', message, error, context));
    }
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('fatal')) {
      this.write(this.createEntry('fatal', message, error, context));
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setContext(context: LogContext): void {
    this.baseContext = { ...this.baseContext, ...context };
  }

  child(name: string, context?: LogContext): Logger {
    const childLogger = new StructuredLogger({
      level: this.level,
      module: this.module ? `${this.module}:${name}` : name,
      pretty: this.pretty,
      includeTimestamp: this.includeTimestamp,
      colorize: this.colorize,
    });
    childLogger.setContext({ ...this.baseContext, ...context });
    return childLogger;
  }
}

// ============================================
// Global Logger Instance / 全局 Logger 实例
// ============================================

const globalLogger = new StructuredLogger();

// ============================================
// Module Helpers / 模块辅助函数
// ============================================

export function createLogger(moduleName: string, options?: Omit<LoggerOptions, 'module'>): Logger {
  return new StructuredLogger({ ...options, module: moduleName });
}

export function setGlobalLevel(level: LogLevel): void {
  globalLogger.setLevel(level);
}

export function setGlobalContext(context: LogContext): void {
  globalLogger.setContext(context);
}

// ============================================
// Named Loggers (Convenience) / 命名 Logger（便捷）
// ============================================

export const logger = globalLogger;
export const log = {
  debug: (message: string, context?: LogContext) => globalLogger.debug(message, context),
  info: (message: string, context?: LogContext) => globalLogger.info(message, context),
  warn: (message: string, context?: LogContext) => globalLogger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) => globalLogger.error(message, error, context),
  fatal: (message: string, error?: Error, context?: LogContext) => globalLogger.fatal(message, error, context),
};

// ============================================
// Export Default / 默认导出
// ============================================

export default StructuredLogger;
