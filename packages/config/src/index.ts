#!/usr/bin/env node

/**
 * Configuration and Environment Variable Validation
 * 配置和环境变量验证
 */

import { z } from 'zod';
import { encrypt, decrypt, isEncrypted, encryptApiKey, decryptApiKey } from './encryption.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Environment Schema Validation
 * 环境变量模式验证
 */

// AI API Configuration
const aiApiSchema = z.object({
  anthropicApiKey: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  openaiApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
});

// Deployment Configuration
const deploymentSchema = z.object({
  platform: z.enum(['cloudflare', 'vercel', 'netlify', 'amplify']),
  cloudflareApiToken: z.string().optional(),
  cloudflareAccountId: z.string().optional(),
  vercelToken: z.string().optional(),
  vercelTeamId: z.string().optional(),
  netlifyToken: z.string().optional(),
  netlifyTeamId: z.string().optional(),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  awsRegion: z.string().default('us-east-1'),
});

// SEO API Configuration
const seoApiSchema = z.object({
  mozAccessId: z.string().optional(),
  mozSecretKey: z.string().optional(),
  ahrefsApiKey: z.string().optional(),
  semrushApiKey: z.string().optional(),
  serpapiKey: z.string().optional(),
});

// Security Configuration
const securitySchema = z.object({
  jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  jwtExpiresIn: z.string().default('7d'),
  encryptionKey: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),
  rateLimitWindowMs: z.string().transform(Number).default('900000'),
  rateLimitMaxRequests: z.string().transform(Number).default('100'),
  corsOrigin: z.string().default('http://localhost:3000'),
});

// Database Configuration
const databaseSchema = z.object({
  databaseUrl: z.string().optional(),
  databasePoolSize: z.string().transform(Number).default('10'),
  databaseSsl: z.string().transform(val => val === 'true').default('false'),
  mongodbUri: z.string().optional(),
  redisUrl: z.string().optional(),
  redisPassword: z.string().optional(),
});

// Email & Marketing Configuration
const emailSchema = z.object({
  sendgridApiKey: z.string().optional(),
  sendgridFromEmail: z.string().optional(),
  mailchimpApiKey: z.string().optional(),
  mailchimpListId: z.string().optional(),
  awsSesRegion: z.string().default('us-east-1'),
});

// Social Media Configuration
const socialSchema = z.object({
  twitterApiKey: z.string().optional(),
  twitterApiSecret: z.string().optional(),
  twitterAccessToken: z.string().optional(),
  twitterAccessSecret: z.string().optional(),
  twitterBearerToken: z.string().optional(),
  linkedinClientId: z.string().optional(),
  linkedinClientSecret: z.string().optional(),
  linkedinAccessToken: z.string().optional(),
  facebookAppId: z.string().optional(),
  facebookAppSecret: z.string().optional(),
  facebookAccessToken: z.string().optional(),
  facebookPageId: z.string().optional(),
});

// Monitoring Configuration
const monitoringSchema = z.object({
  sentryDsn: z.string().optional(),
  sentryEnvironment: z.string().default('development'),
  gaTrackingId: z.string().optional(),
});

// Storage Configuration
const storageSchema = z.object({
  s3BucketName: z.string().optional(),
  s3Region: z.string().default('us-east-1'),
  s3AccessKeyId: z.string().optional(),
  s3SecretAccessKey: z.string().optional(),
  r2AccountId: z.string().optional(),
  r2AccessKeyId: z.string().optional(),
  r2SecretAccessKey: z.string().optional(),
  r2BucketName: z.string().optional(),
});

// Application Configuration
const appSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  appName: z.string().default('ai-seo-mass-engine'),
  apiPort: z.string().transform(Number).default('3000'),
});

// Content Generation Configuration
const contentSchema = z.object({
  articleMinWords: z.string().transform(Number).default('1000'),
  articleMaxWords: z.string().transform(Number).default('3000'),
  articlesPerBatch: z.string().transform(Number).default('10'),
  defaultLanguage: z.string().default('en-US'),
  defaultTemperature: z.string().transform(val => parseFloat(val)).default('0.7'),
  batchSize: z.string().transform(Number).default('5'),
  batchDelayMs: z.string().transform(Number).default('1000'),
});

// Task Queue Configuration
const queueSchema = z.object({
  concurrency: z.string().transform(Number).default('5'),
  maxRetries: z.string().transform(Number).default('3'),
  retryDelayMs: z.string().transform(Number).default('5000'),
});

// Webhook Configuration
const webhookSchema = z.object({
  webhookSecret: z.string().optional(),
  webhookUrl: z.string().optional(),
});

/**
 * Complete Configuration Schema
 * 完整配置模式
 */
const configSchema = z.object({
  // Application
  NODE_ENV: appSchema.shape.nodeEnv,
  LOG_LEVEL: appSchema.shape.logLevel,
  APP_NAME: appSchema.shape.appName,
  API_PORT: appSchema.shape.apiPort,

  // AI APIs
  ANTHROPIC_API_KEY: aiApiSchema.shape.anthropicApiKey,
  OPENAI_API_KEY: aiApiSchema.shape.openaiApiKey,
  GEMINI_API_KEY: aiApiSchema.shape.geminiApiKey,

  // Deployment
  DEPLOY_PLATFORM: deploymentSchema.shape.platform,
  CLOUDFLARE_API_TOKEN: deploymentSchema.shape.cloudflareApiToken,
  CLOUDFLARE_ACCOUNT_ID: deploymentSchema.shape.cloudflareAccountId,
  VERCEL_TOKEN: deploymentSchema.shape.vercelToken,
  VERCEL_TEAM_ID: deploymentSchema.shape.vercelTeamId,
  NETLIFY_TOKEN: deploymentSchema.shape.netlifyToken,
  NETLIFY_TEAM_ID: deploymentSchema.shape.netlifyTeamId,
  AWS_ACCESS_KEY_ID: deploymentSchema.shape.awsAccessKeyId,
  AWS_SECRET_ACCESS_KEY: deploymentSchema.shape.awsSecretAccessKey,
  AWS_REGION: deploymentSchema.shape.awsRegion,

  // SEO APIs
  MOZ_ACCESS_ID: seoApiSchema.shape.mozAccessId,
  MOZ_SECRET_KEY: seoApiSchema.shape.mozSecretKey,
  AHREFS_API_KEY: seoApiSchema.shape.ahrefsApiKey,
  SEMRUSH_API_KEY: seoApiSchema.shape.semrushApiKey,
  SERPAPI_KEY: seoApiSchema.shape.serpapiKey,

  // Security
  JWT_SECRET: securitySchema.shape.jwtSecret,
  JWT_EXPIRES_IN: securitySchema.shape.jwtExpiresIn,
  ENCRYPTION_KEY: securitySchema.shape.encryptionKey,
  RATE_LIMIT_WINDOW_MS: securitySchema.shape.rateLimitWindowMs,
  RATE_LIMIT_MAX_REQUESTS: securitySchema.shape.rateLimitMaxRequests,
  CORS_ORIGIN: securitySchema.shape.corsOrigin,

  // Database
  DATABASE_URL: databaseSchema.shape.databaseUrl,
  DATABASE_POOL_SIZE: databaseSchema.shape.databasePoolSize,
  DATABASE_SSL: databaseSchema.shape.databaseSsl,
  MONGODB_URI: databaseSchema.shape.mongodbUri,
  REDIS_URL: databaseSchema.shape.redisUrl,
  REDIS_PASSWORD: databaseSchema.shape.redisPassword,

  // Email
  SENDGRID_API_KEY: emailSchema.shape.sendgridApiKey,
  SENDGRID_FROM_EMAIL: emailSchema.shape.sendgridFromEmail,
  MAILCHIMP_API_KEY: emailSchema.shape.mailchimpApiKey,
  MAILCHIMP_LIST_ID: emailSchema.shape.mailchimpListId,
  AWS_SES_REGION: emailSchema.shape.awsSesRegion,

  // Social Media
  TWITTER_API_KEY: socialSchema.shape.twitterApiKey,
  TWITTER_API_SECRET: socialSchema.shape.twitterApiSecret,
  TWITTER_ACCESS_TOKEN: socialSchema.shape.twitterAccessToken,
  TWITTER_ACCESS_SECRET: socialSchema.shape.twitterAccessSecret,
  TWITTER_BEARER_TOKEN: socialSchema.shape.twitterBearerToken,
  LINKEDIN_CLIENT_ID: socialSchema.shape.linkedinClientId,
  LINKEDIN_CLIENT_SECRET: socialSchema.shape.linkedinClientSecret,
  LINKEDIN_ACCESS_TOKEN: socialSchema.shape.linkedinAccessToken,
  FACEBOOK_APP_ID: socialSchema.shape.facebookAppId,
  FACEBOOK_APP_SECRET: socialSchema.shape.facebookAppSecret,
  FACEBOOK_ACCESS_TOKEN: socialSchema.shape.facebookAccessToken,
  FACEBOOK_PAGE_ID: socialSchema.shape.facebookPageId,

  // Monitoring
  SENTRY_DSN: monitoringSchema.shape.sentryDsn,
  SENTRY_ENVIRONMENT: monitoringSchema.shape.sentryEnvironment,
  GA_TRACKING_ID: monitoringSchema.shape.gaTrackingId,

  // Storage
  S3_BUCKET_NAME: storageSchema.shape.s3BucketName,
  S3_REGION: storageSchema.shape.s3Region,
  S3_ACCESS_KEY_ID: storageSchema.shape.s3AccessKeyId,
  S3_SECRET_ACCESS_KEY: storageSchema.shape.s3SecretAccessKey,
  R2_ACCOUNT_ID: storageSchema.shape.r2AccountId,
  R2_ACCESS_KEY_ID: storageSchema.shape.r2AccessKeyId,
  R2_SECRET_ACCESS_KEY: storageSchema.shape.r2SecretAccessKey,
  R2_BUCKET_NAME: storageSchema.shape.r2BucketName,

  // Content Generation
  ARTICLE_MIN_WORDS: contentSchema.shape.articleMinWords,
  ARTICLE_MAX_WORDS: contentSchema.shape.articleMaxWords,
  ARTICLES_PER_BATCH: contentSchema.shape.articlesPerBatch,
  DEFAULT_LANGUAGE: contentSchema.shape.defaultLanguage,
  DEFAULT_TEMPERATURE: contentSchema.shape.defaultTemperature,
  BATCH_SIZE: contentSchema.shape.batchSize,
  BATCH_DELAY_MS: contentSchema.shape.batchDelayMs,

  // Queue
  QUEUE_CONCURRENCY: queueSchema.shape.concurrency,
  QUEUE_MAX_RETRIES: queueSchema.shape.maxRetries,
  QUEUE_RETRY_DELAY_MS: queueSchema.shape.retryDelayMs,

  // Webhook
  WEBHOOK_SECRET: webhookSchema.shape.webhookSecret,
  WEBHOOK_URL: webhookSchema.shape.webhookUrl,

  // Google Services
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: z.string().optional(),
});

/**
 * Configuration Type
 * 配置类型
 */
export type Config = z.infer<typeof configSchema>;

/**
 * Validated configuration cache
 * 已验证配置缓存
 */
let validatedConfig: Config | null = null;

/**
 * Load and validate environment variables
 * 加载并验证环境变量
 */
export function loadConfig(): Config {
  if (validatedConfig) {
    return validatedConfig;
  }

  try {
    // Load .env file
    import('dotenv').then(dotenv => {
      dotenv.config();
    }).catch(error => {
      console.warn(`⚠️  Failed to load .env file: ${error.message}`);
    });

    // Wait for dotenv to load (synchronous fallback)
    const envPath = resolve(process.cwd(), '.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n').filter((line: string) => line.trim() && !line.trim().startsWith('#'));
      for (const line of lines) {
        const [key, value] = line.split('=').map((s: string) => s.trim());
        if (key && value) {
          process.env[key] = value;
        }
      }
    }

    // Get encryption key first
    const encryptionKey = process.env.ENCRYPTION_KEY;

    // Helper function to decrypt environment variable if needed
    const getDecryptedValue = (value: string | undefined): string | undefined => {
      if (!value || value.trim() === '') {
        return undefined;
      }

      // If value looks encrypted and we have an encryption key, decrypt it
      if (isEncrypted(value) && encryptionKey) {
        try {
          return decryptApiKey(value, encryptionKey);
        } catch (error) {
          console.warn(`⚠️  Failed to decrypt value: ${(error as Error).message}`);
          return value; // Return original value if decryption fails
        }
      }

      return value;
    };

    // Parse environment variables
    const rawConfig = {
      NODE_ENV: process.env.NODE_ENV,
      LOG_LEVEL: process.env.LOG_LEVEL,
      APP_NAME: process.env.APP_NAME,
      API_PORT: process.env.API_PORT,

      ANTHROPIC_API_KEY: getDecryptedValue(process.env.ANTHROPIC_API_KEY),
      OPENAI_API_KEY: getDecryptedValue(process.env.OPENAI_API_KEY),
      GEMINI_API_KEY: getDecryptedValue(process.env.GEMINI_API_KEY),

      DEPLOY_PLATFORM: process.env.DEPLOY_PLATFORM,
      CLOUDFLARE_API_TOKEN: getDecryptedValue(process.env.CLOUDFLARE_API_TOKEN),
      CLOUDFLARE_ACCOUNT_ID: getDecryptedValue(process.env.CLOUDFLARE_ACCOUNT_ID),
      VERCEL_TOKEN: getDecryptedValue(process.env.VERCEL_TOKEN),
      VERCEL_TEAM_ID: getDecryptedValue(process.env.VERCEL_TEAM_ID),
      NETLIFY_TOKEN: getDecryptedValue(process.env.NETLIFY_TOKEN),
      NETLIFY_TEAM_ID: getDecryptedValue(process.env.NETLIFY_TEAM_ID),
      AWS_ACCESS_KEY_ID: getDecryptedValue(process.env.AWS_ACCESS_KEY_ID),
      AWS_SECRET_ACCESS_KEY: getDecryptedValue(process.env.AWS_SECRET_ACCESS_KEY),
      AWS_REGION: process.env.AWS_REGION,

      MOZ_ACCESS_ID: getDecryptedValue(process.env.MOZ_ACCESS_ID),
      MOZ_SECRET_KEY: getDecryptedValue(process.env.MOZ_SECRET_KEY),
      AHREFS_API_KEY: getDecryptedValue(process.env.AHREFS_API_KEY),
      SEMRUSH_API_KEY: getDecryptedValue(process.env.SEMRUSH_API_KEY),
      SERPAPI_KEY: getDecryptedValue(process.env.SERPAPI_KEY),

      JWT_SECRET: getDecryptedValue(process.env.JWT_SECRET),
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY, // Encryption key should be in plain text for now
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
      CORS_ORIGIN: process.env.CORS_ORIGIN,

      DATABASE_URL: getDecryptedValue(process.env.DATABASE_URL),
      DATABASE_POOL_SIZE: process.env.DATABASE_POOL_SIZE,
      DATABASE_SSL: process.env.DATABASE_SSL,
      MONGODB_URI: getDecryptedValue(process.env.MONGODB_URI),
      REDIS_URL: getDecryptedValue(process.env.REDIS_URL),
      REDIS_PASSWORD: getDecryptedValue(process.env.REDIS_PASSWORD),

      SENDGRID_API_KEY: getDecryptedValue(process.env.SENDGRID_API_KEY),
      SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
      MAILCHIMP_API_KEY: getDecryptedValue(process.env.MAILCHIMP_API_KEY),
      MAILCHIMP_LIST_ID: getDecryptedValue(process.env.MAILCHIMP_LIST_ID),
      AWS_SES_REGION: process.env.AWS_SES_REGION,

      TWITTER_API_KEY: getDecryptedValue(process.env.TWITTER_API_KEY),
      TWITTER_API_SECRET: getDecryptedValue(process.env.TWITTER_API_SECRET),
      TWITTER_ACCESS_TOKEN: getDecryptedValue(process.env.TWITTER_ACCESS_TOKEN),
      TWITTER_ACCESS_SECRET: getDecryptedValue(process.env.TWITTER_ACCESS_SECRET),
      TWITTER_BEARER_TOKEN: getDecryptedValue(process.env.TWITTER_BEARER_TOKEN),
      LINKEDIN_CLIENT_ID: getDecryptedValue(process.env.LINKEDIN_CLIENT_ID),
      LINKEDIN_CLIENT_SECRET: getDecryptedValue(process.env.LINKEDIN_CLIENT_SECRET),
      LINKEDIN_ACCESS_TOKEN: getDecryptedValue(process.env.LINKEDIN_ACCESS_TOKEN),
      FACEBOOK_APP_ID: getDecryptedValue(process.env.FACEBOOK_APP_ID),
      FACEBOOK_APP_SECRET: getDecryptedValue(process.env.FACEBOOK_APP_SECRET),
      FACEBOOK_ACCESS_TOKEN: getDecryptedValue(process.env.FACEBOOK_ACCESS_TOKEN),
      FACEBOOK_PAGE_ID: getDecryptedValue(process.env.FACEBOOK_PAGE_ID),

      SENTRY_DSN: getDecryptedValue(process.env.SENTRY_DSN),
      SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
      GA_TRACKING_ID: process.env.GA_TRACKING_ID,

      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
      S3_REGION: process.env.S3_REGION,
      S3_ACCESS_KEY_ID: getDecryptedValue(process.env.S3_ACCESS_KEY_ID),
      S3_SECRET_ACCESS_KEY: getDecryptedValue(process.env.S3_SECRET_ACCESS_KEY),
      R2_ACCOUNT_ID: getDecryptedValue(process.env.R2_ACCOUNT_ID),
      R2_ACCESS_KEY_ID: getDecryptedValue(process.env.R2_ACCESS_KEY_ID),
      R2_SECRET_ACCESS_KEY: getDecryptedValue(process.env.R2_SECRET_ACCESS_KEY),
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,

      ARTICLE_MIN_WORDS: process.env.ARTICLE_MIN_WORDS,
      ARTICLE_MAX_WORDS: process.env.ARTICLE_MAX_WORDS,
      ARTICLES_PER_BATCH: process.env.ARTICLES_PER_BATCH,
      DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE,
      DEFAULT_TEMPERATURE: process.env.DEFAULT_TEMPERATURE,
      BATCH_SIZE: process.env.BATCH_SIZE,
      BATCH_DELAY_MS: process.env.BATCH_DELAY_MS,

      QUEUE_CONCURRENCY: process.env.QUEUE_CONCURRENCY,
      QUEUE_MAX_RETRIES: process.env.QUEUE_MAX_RETRIES,
      QUEUE_RETRY_DELAY_MS: process.env.QUEUE_RETRY_DELAY_MS,

      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
      WEBHOOK_URL: process.env.WEBHOOK_URL,

      // Google Services
      GOOGLE_SERVICE_ACCOUNT_KEY_PATH: getDecryptedValue(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH),
    };

    // Validate using Zod schema
    validatedConfig = configSchema.parse(rawConfig);

    console.log('✅ Configuration loaded and validated successfully');
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:\n');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\nPlease check your .env file and ensure all required variables are set.\n');
    }
    throw error;
  }
}

/**
 * Get configuration value by key
 * 通过键获取配置值
 */
export function getConfig<K extends keyof Config>(key: K): Config[K] {
  const config = loadConfig();
  return config[key];
}

/**
 * Check if running in development mode
 * 检查是否在开发模式下运行
 */
export function isDevelopment(): boolean {
  return getConfig('NODE_ENV') === 'development';
}

/**
 * Check if running in production mode
 * 检查是否在生产模式下运行
 */
export function isProduction(): boolean {
  return getConfig('NODE_ENV') === 'production';
}

/**
 * Check if running in test mode
 * 检查是否在测试模式下运行
 */
export function isTest(): boolean {
  return getConfig('NODE_ENV') === 'test';
}

/**
 * Validate required configuration for a specific feature
 * 验证特定功能所需的配置
 */
export function validateFeatureConfig(feature: string): { valid: boolean; missing: string[] } {
  const config = loadConfig();
  const missing: string[] = [];

  const featureRequirements: Record<string, (keyof Config)[]> = {
    'article-gen': ['ANTHROPIC_API_KEY'],
    'image-gen': ['OPENAI_API_KEY'],
    'gemini-gen': ['GEMINI_API_KEY'],
    'cloudflare-deploy': ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    'vercel-deploy': ['VERCEL_TOKEN'],
    'netlify-deploy': ['NETLIFY_TOKEN'],
    'amplify-deploy': ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
    'email': ['SENDGRID_API_KEY'],
    'seo-audit': ['MOZ_ACCESS_ID', 'MOZ_SECRET_KEY'],
    'rank-monitor': ['SERPAPI_KEY'],
  };

  const required = featureRequirements[feature] || [];

  for (const key of required) {
    if (!config[key]) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export {
  encrypt,
  decrypt,
  isEncrypted,
  encryptApiKey,
  decryptApiKey,
  generateKey,
  generateRandomKey,
  hashKey,
  validateKeyFormat,
  rotateKey
} from './encryption.js';

export default loadConfig;
