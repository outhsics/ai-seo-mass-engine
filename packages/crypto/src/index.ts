/**
 * @seo-spy/crypto - Encryption and Security Utilities
 * Provides AES-256 encryption, hashing, and JWT utilities
 */

import crypto from 'node:crypto';
import { createLogger } from '@seo-spy/logger';

const logger = createLogger('crypto');

// ============================================
// Configuration / 配置
// ============================================

export interface EncryptionConfig {
  key: string;
  algorithm?: string;
  ivLength?: number;
}

export interface HashConfig {
  salt?: string;
  iterations?: number;
  keyLength?: number;
}

const DEFAULT_ALGORITHM = 'aes-256-gcm';
const DEFAULT_IV_LENGTH = 16;
const DEFAULT_SALT_LENGTH = 32;
const DEFAULT_ITERATIONS = 100000;
const DEFAULT_KEY_LENGTH = 64;

// ============================================
// Encryption / Encryption
// ============================================

/**
 * Encrypts data using AES-256-GCM
 * 使用 AES-256-GCM 加密数据
 */
export function encrypt(text: string, config: EncryptionConfig): string {
  try {
    const {
      key,
      algorithm = DEFAULT_ALGORITHM,
      ivLength = DEFAULT_IV_LENGTH,
    } = config;

    // Validate key
    const keyBuffer = getKeyBuffer(key, algorithm);
    if (!keyBuffer) {
      throw new Error('Invalid encryption key or algorithm');
    }

    // Generate IV
    const iv = crypto.randomBytes(ivLength);

    // Create cipher
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);

    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag (for GCM mode)
    let authTag: string | undefined;
    if (algorithm.includes('gcm')) {
      const cipherWithAuth = cipher as unknown as { getAuthTag: () => Buffer };
      const authTagBuffer = cipherWithAuth.getAuthTag();
      authTag = authTagBuffer.toString('hex');
    }

    // Combine IV + encrypted + auth tag
    const result = {
      iv: iv.toString('hex'),
      encrypted,
      authTag,
      algorithm,
    };

    return Buffer.from(JSON.stringify(result)).toString('base64');
  } catch (error) {
    logger.error('Encryption failed', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Decrypts data using AES-256-GCM
 * 使用 AES-256-GCM 解密数据
 */
export function decrypt(encryptedData: string, config: EncryptionConfig): string {
  try {
    const { key } = config;

    // Parse encrypted data
    const json = Buffer.from(encryptedData, 'base64').toString('utf8');
    const data = JSON.parse(json);

    const {
      iv: ivHex,
      encrypted,
      authTag,
      algorithm = DEFAULT_ALGORITHM,
    } = data as { iv: string; encrypted: string; authTag?: string; algorithm?: string };

    // Validate key
    const keyBuffer = getKeyBuffer(key, algorithm);
    if (!keyBuffer) {
      throw new Error('Invalid encryption key or algorithm');
    }

    // Parse IV
    const iv = Buffer.from(ivHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);

    // Set auth tag (for GCM mode)
    if (authTag && algorithm.includes('gcm')) {
      const decipherWithAuth = decipher as unknown as { setAuthTag: (tag: Buffer) => void };
      decipherWithAuth.setAuthTag(Buffer.from(authTag, 'hex'));
    }

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', error instanceof Error ? error : undefined);
    throw new Error('Decryption failed: invalid data or key');
  }
}

/**
 * Generates a secure encryption key
 * 生成安全的加密密钥
 */
export function generateEncryptionKey(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64');
}

// Helper: Get key buffer
function getKeyBuffer(key: string, algorithm: string): Buffer | null {
  try {
    const keyLength = getKeyLength(algorithm);
    if (keyLength === null) return null;

    // Try to decode as base64 first
    const decoded = Buffer.from(key, 'base64');

    // If length matches, use decoded key
    if (decoded.length === keyLength) {
      return decoded;
    }

    // Otherwise, derive key using SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(key);
    return hash.digest().subarray(0, keyLength);
  } catch {
    return null;
  }
}

// Helper: Get key length for algorithm
function getKeyLength(algorithm: string): number | null {
  const match = algorithm.match(/aes-(\d+)-/);
  if (!match) return null;

  const bits = parseInt(match[1], 10);
  return bits / 8;
}

// ============================================
// Hashing / Hashing
// ============================================

/**
 * Creates a SHA-256 hash
 * 创建 SHA-256 哈希
 */
export function hash(text: string, salt?: string): string {
  const hash = crypto.createHash('sha256');
  if (salt) hash.update(salt);
  hash.update(text);
  return hash.digest('hex');
}

/**
 * Creates a bcrypt-like hash (PBKDF2)
 * 创建 PBKDF2 哈希（类似 bcrypt）
 */
export function hashPassword(
  password: string,
  config: HashConfig = {}
): { hash: string; salt: string } {
  const {
    salt: existingSalt,
    iterations = DEFAULT_ITERATIONS,
    keyLength = DEFAULT_KEY_LENGTH,
  } = config;

  const saltValue = existingSalt || crypto.randomBytes(DEFAULT_SALT_LENGTH).toString('hex');

  const derivedKey = crypto.pbkdf2Sync(
    password,
    saltValue,
    iterations,
    keyLength,
    'sha512'
  );

  return {
    hash: derivedKey.toString('hex'),
    salt: saltValue,
  };
}

/**
 * Verifies a password against a hash
 * 验证密码是否匹配哈希
 */
export function verifyPassword(
  password: string,
  storedHash: string,
  salt: string,
  iterations: number = DEFAULT_ITERATIONS
): boolean {
  const { hash: computedHash } = hashPassword(password, {
    salt,
    iterations,
  });

  return computedHash === storedHash;
}

/**
 * Creates a random salt
 * 生成随机盐值
 */
export function generateSalt(length: number = DEFAULT_SALT_LENGTH): string {
  return crypto.randomBytes(length).toString('hex');
}

// ============================================
// JWT (JSON Web Tokens) / JWT
// ============================================

export interface JWTPayload {
  sub?: string;        // Subject (user ID)
  iss?: string;        // Issuer
  aud?: string;        // Audience
  exp?: number;        // Expiration time
  iat?: number;        // Issued at
  nbf?: number;        // Not before
  jti?: string;        // JWT ID
  [key: string]: unknown;
}

export interface JWTSignOptions {
  secret: string;
  expiresIn?: string | number; // e.g., "7d" or 604800
  issuer?: string;
  audience?: string;
}

export interface JWTVerifyOptions {
  secret: string;
  issuer?: string;
  audience?: string;
}

/**
 * Creates a JWT token
 * 创建 JWT 令牌
 */
export function signJWT(payload: JWTPayload, options: JWTSignOptions): string {
  const { secret, expiresIn, issuer, audience } = options;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);

  const tokenPayload: JWTPayload = {
    ...payload,
    iat: now,
  };

  // Add expiration
  if (expiresIn) {
    if (typeof expiresIn === 'number') {
      tokenPayload.exp = now + expiresIn;
    } else {
      tokenPayload.exp = now + parseTime(expiresIn);
    }
  }

  // Add issuer
  if (issuer) {
    tokenPayload.iss = issuer;
  }

  // Add audience
  if (audience) {
    tokenPayload.aud = audience;
  }

  // Base64Url encode
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));

  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * Verifies a JWT token
 * 验证 JWT 令牌
 */
export function verifyJWT(token: string, options: JWTVerifyOptions): JWTPayload | null {
  try {
    const { secret, issuer, audience } = options;

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureInput)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload;

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    // Check not before
    if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
      throw new Error('Token not yet valid');
    }

    // Verify issuer
    if (issuer && payload.iss !== issuer) {
      throw new Error('Invalid issuer');
    }

    // Verify audience
    if (audience && payload.aud !== audience) {
      throw new Error('Invalid audience');
    }

    return payload;
  } catch (error) {
    logger.error('JWT verification failed', error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Decodes a JWT token without verification
 * 解码 JWT 令牌（不验证签名）
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1])) as JWTPayload;
    return payload;
  } catch {
    return null;
  }
}

// Helper: Parse time string (e.g., "7d", "12h", "30m")
function parseTime(time: string): number {
  const match = time.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error('Invalid time format');

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const secondsPerUnit: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * (secondsPerUnit[unit] || 1);
}

// Helper: Base64Url encode
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Helper: Base64Url decode
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

// ============================================
// Random / Random
// =================================

/**
 * Generates a cryptographically secure random string
 * 生成加密安全的随机字符串
 */
export function randomString(length: number): string {
  const bytes = Math.ceil(length / 2);
  const random = crypto.randomBytes(bytes);
  return random.toString('hex').substring(0, length);
}

/**
 * Generates a random UUID v4
 * 生成随机 UUID v4
 */
export function randomUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generates a secure random number between min and max
 * 生成 min 和 max 之间的安全随机数
 */
export function randomInt(min: number, max: number): number {
  const range = max - min;
  const bytes = Math.ceil(Math.log2(range) / 8);
  const random = crypto.randomBytes(bytes);
  const offset = random.readUIntBE(0, bytes) % range;
  return min + offset;
}

// ============================================
// HMAC / HMAC
// ============================================

/**
 * Creates an HMAC signature
 * 创建 HMAC 签名
 */
export function createHMAC(
  data: string,
  secret: string,
  algorithm: string = 'sha256'
): string {
  return crypto
    .createHmac(algorithm, secret)
    .update(data)
    .digest('hex');
}

/**
 * Verifies an HMAC signature
 * 验证 HMAC 签名
 */
export function verifyHMAC(
  data: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  const expected = createHMAC(data, secret, algorithm);
  return expected === signature;
}

// ============================================
// Webhook Signing / Webhook 签名
// ============================================

/**
 * Signs a webhook payload
 * 签名 Webhook payload
 */
export function signWebhook(payload: string | Record<string, unknown>, secret: string): string {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const signaturePayload = `${timestamp}.${data}`;
  return `${timestamp}.${createHMAC(signaturePayload, secret)}`;
}

/**
 * Verifies a webhook signature
 * 验证 Webhook 签名
 */
export function verifyWebhook(
  payload: string | Record<string, unknown>,
  signature: string,
  secret: string
): boolean {
  try {
    const [timestamp, hmac] = signature.split('.');
    if (!timestamp || !hmac) return false;

    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signaturePayload = `${timestamp}.${data}`;
    const expected = createHMAC(signaturePayload, secret);

    return hmac === expected;
  } catch {
    return false;
  }
}

// ============================================
// Export Default / 默认导出
// ============================================

export default {
  encrypt,
  decrypt,
  generateEncryptionKey,
  hash,
  hashPassword,
  verifyPassword,
  generateSalt,
  signJWT,
  verifyJWT,
  decodeJWT,
  randomString,
  randomUUID,
  randomInt,
  createHMAC,
  verifyHMAC,
  signWebhook,
  verifyWebhook,
};
