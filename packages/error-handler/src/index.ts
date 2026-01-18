/**
 * @seo-spy/error-handler - Centralized Error Handling
 * Provides error classification, retry logic, and global error handlers
 */

import { createLogger, type LogContext } from '@seo-spy/logger';

// ============================================
// Types & Interfaces / 类型定义
// ============================================

export type ErrorCategory =
  | 'network'
  | 'api'
  | 'database'
  | 'validation'
  | 'authentication'
  | 'rate_limit'
  | 'timeout'
  | 'internal'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorMetadata {
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  code?: string;
  requestId?: string;
  userId?: string;
  retryable?: boolean;
  statusCode?: number;
  [key: string]: unknown;
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: Array<ErrorCategory | string>;
  onRetry?: (attempt: number, error: Error) => void;
}

export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly retryable: boolean;
  public readonly metadata: ErrorMetadata;

  constructor(
    message: string,
    metadata: ErrorMetadata = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.category = metadata.category || 'unknown';
    this.severity = metadata.severity || 'medium';
    this.code = metadata.code;
    this.retryable = metadata.retryable ?? this.isRetryableByDefault(this.category);
    this.metadata = metadata;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  private isRetryableByDefault(category: ErrorCategory): boolean {
    return ['network', 'api', 'database', 'rate_limit', 'timeout'].includes(category);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      retryable: this.retryable,
      metadata: this.metadata,
      stack: this.stack,
    };
  }
}

// ============================================
// Error Classification / 错误分类
// ============================================

export function classifyError(error: Error | AppError): ErrorCategory {
  // Already classified
  if (error instanceof AppError) {
    return error.category;
  }

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (name.includes('network') || name.includes('econnrefused') || name.includes('etimedout')) {
    return 'network';
  }

  // Timeout errors
  if (name.includes('timeout') || message.includes('timeout')) {
    return 'timeout';
  }

  // Rate limit errors
  if (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests')
  ) {
    return 'rate_limit';
  }

  // API errors
  if (
    name.includes('api') ||
    message.includes('api key') ||
    message.includes('api error')
  ) {
    return 'api';
  }

  // Authentication errors
  if (
    name.includes('auth') ||
    name.includes('unauthorized') ||
    message.includes('401') ||
    message.includes('authentication')
  ) {
    return 'authentication';
  }

  // Database errors
  if (
    name.includes('database') ||
    name.includes('sql') ||
    message.includes('database') ||
    message.includes('connection')
  ) {
    return 'database';
  }

  // Validation errors
  if (
    name.includes('validation') ||
    name.includes('invalid') ||
    message.includes('validation') ||
    message.includes('invalid')
  ) {
    return 'validation';
  }

  return 'unknown';
}

export function getErrorSeverity(category: ErrorCategory, statusCode?: number): ErrorSeverity {
  // Critical errors
  if (category === 'internal' || category === 'authentication') {
    return 'critical';
  }

  // High severity based on status code
  if (statusCode && statusCode >= 500) {
    return 'high';
  }

  // Medium severity
  if (
    category === 'api' ||
    category === 'database' ||
    category === 'timeout'
  ) {
    return 'medium';
  }

  // Low severity
  return 'low';
}

export function isRetryable(category: ErrorCategory, statusCode?: number): boolean {
  // Don't retry client errors (except rate limit)
  if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return false;
  }

  return ['network', 'api', 'database', 'rate_limit', 'timeout'].includes(category);
}

// ============================================
// Retry Logic / 重试逻辑
// ============================================

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const logger = createLogger('retry');

  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryableErrors,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Classify error
      const category = classifyError(lastError);
      const appError = lastError instanceof AppError
        ? lastError
        : new AppError(lastError.message, { category });

      // Check if error is retryable
      const isRetryableError =
        appError.retryable &&
        (!retryableErrors || retryableErrors.includes(category));

      if (!isRetryableError || attempt >= maxAttempts) {
        logger.error('Max retries reached or non-retryable error', lastError, {
          attempt,
          category,
          maxAttempts,
        });
        throw appError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      logger.warn(`Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms`, {
        error: lastError.message,
        category,
      });

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Global Error Handling / 全局错误处理
// ============================================

const logger = createLogger('error-handler');

export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    const category = classifyError(error);
    const severity = getErrorSeverity(category);

    logger.fatal('Uncaught Exception', error, { category, severity });

    // Exit for critical errors
    if (severity === 'critical') {
      process.exit(1);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const category = classifyError(error);

    logger.fatal('Unhandled Promise Rejection', error, { category });
  });

  // Handle warning events
  process.on('warning', (warning: Error) => {
    logger.warn('Process warning', { message: warning.message });
  });

  logger.info('Global error handlers configured');
}

// ============================================
// Error Constructors / 错误构造函数
// ============================================

export function createNetworkError(message: string, metadata?: Partial<ErrorMetadata>): AppError {
  return new AppError(message, {
    category: 'network',
    severity: 'medium',
    retryable: true,
    ...metadata,
  });
}

export function createApiError(message: string, statusCode?: number, metadata?: Partial<ErrorMetadata>): AppError {
  return new AppError(message, {
    category: 'api',
    severity: getErrorSeverity('api', statusCode),
    statusCode,
    retryable: isRetryable('api', statusCode),
    ...metadata,
  });
}

export function createDatabaseError(message: string, metadata?: Partial<ErrorMetadata>): AppError {
  return new AppError(message, {
    category: 'database',
    severity: 'high',
    retryable: true,
    ...metadata,
  });
}

export function createValidationError(message: string, metadata?: Partial<ErrorMetadata>): AppError {
  return new AppError(message, {
    category: 'validation',
    severity: 'low',
    retryable: false,
    ...metadata,
  });
}

export function createAuthError(message: string, metadata?: Partial<ErrorMetadata>): AppError {
  return new AppError(message, {
    category: 'authentication',
    severity: 'critical',
    retryable: false,
    ...metadata,
  });
}

export function createRateLimitError(message: string, retryAfter?: number, metadata?: Partial<ErrorMetadata>): AppError {
  return new AppError(message, {
    category: 'rate_limit',
    severity: 'medium',
    retryable: true,
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter,
    ...metadata,
  });
}

export function createTimeoutError(message: string, metadata?: Partial<ErrorMetadata>): AppError {
  return new AppError(message, {
    category: 'timeout',
    severity: 'medium',
    retryable: true,
    ...metadata,
  });
}

// ============================================
// Safe Execution / 安全执行
// ============================================

export async function safeExecute<T>(
  fn: () => Promise<T>,
  fallback?: T,
  onError?: (error: Error) => void
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Safe execution failed', err);

    if (onError) {
      onError(err);
    }

    return fallback;
  }
}

export function safeExecuteSync<T>(
  fn: () => T,
  fallback?: T,
  onError?: (error: Error) => void
): T | undefined {
  try {
    return fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Safe execution failed', err);

    if (onError) {
      onError(err);
    }

    return fallback;
  }
}

// ============================================
// Export Default / 默认导出
// ============================================

export default {
  AppError,
  classifyError,
  getErrorSeverity,
  isRetryable,
  withRetry,
  setupGlobalErrorHandlers,
  createNetworkError,
  createApiError,
  createDatabaseError,
  createValidationError,
  createAuthError,
  createRateLimitError,
  createTimeoutError,
  safeExecute,
  safeExecuteSync,
};
