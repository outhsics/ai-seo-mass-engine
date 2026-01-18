/**
 * API Key Encryption System
 * API 密钥加密系统
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

// AES-256-CBC 加密配置
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size in bytes

/**
 * Generate a secure encryption key from a passphrase
 * 从密码生成安全的加密密钥
 */
export function generateKey(passphrase: string): string {
  const hash = createHash('sha256');
  hash.update(passphrase);
  return hash.digest('base64').substring(0, 32);
}

/**
 * Encrypt sensitive data using AES-256-CBC
 * 使用 AES-256-CBC 加密敏感数据
 */
export function encrypt(data: string, key: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, 'base64'), iv);

  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt encrypted data using AES-256-CBC
 * 使用 AES-256-CBC 解密数据
 */
export function decrypt(encryptedData: string, key: string): string {
  const [ivHex, encryptedHex] = encryptedData.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(key, 'base64'), iv);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

/**
 * Encrypt API key with validation
 * 加密 API 密钥（含验证）
 */
export function encryptApiKey(apiKey: string, encryptionKey: string): string {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key cannot be empty');
  }

  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error('Encryption key must be at least 32 characters');
  }

  return encrypt(apiKey, encryptionKey);
}

/**
 * Decrypt API key with validation
 * 解密 API 密钥（含验证）
 */
export function decryptApiKey(encryptedKey: string, encryptionKey: string): string {
  if (!encryptedKey || encryptedKey.trim() === '') {
    throw new Error('Encrypted key cannot be empty');
  }

  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error('Encryption key must be at least 32 characters');
  }

  return decrypt(encryptedKey, encryptionKey);
}

/**
 * Check if a string is encrypted (valid format)
 * 检查字符串是否是加密格式
 */
export function isEncrypted(data: string): boolean {
  if (!data || data.length < IV_LENGTH * 2 + 1) {
    return false;
  }

  const [ivHex, encryptedHex] = data.split(':');
  if (!ivHex || !encryptedHex) {
    return false;
  }

  // 验证 IV 和加密数据格式
  try {
    Buffer.from(ivHex, 'hex');
    Buffer.from(encryptedHex, 'hex');
    return ivHex.length === IV_LENGTH * 2;
  } catch {
    return false;
  }
}

/**
 * Generate a random encryption key
 * 生成随机加密密钥
 */
export function generateRandomKey(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Create a secure hash of encryption key for validation
 * 生成加密密钥的安全哈希值用于验证
 */
export function hashKey(key: string): string {
  const hash = createHash('sha256');
  hash.update(key);
  return hash.digest('hex');
}

/**
 * Validate encryption key format
 * 验证加密密钥格式
 */
export function validateKeyFormat(key: string): boolean {
  try {
    // 检查是否是有效的 base64 编码
    Buffer.from(key, 'base64');
    // 检查长度
    if (Buffer.from(key, 'base64').length !== 32) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Rotate encryption key
 * 轮换加密密钥
 */
export function rotateKey(oldKey: string, newKey: string, encryptedData: string): string {
  const decrypted = decrypt(encryptedData, oldKey);
  return encrypt(decrypted, newKey);
}
