/**
 * @seo-spy/moz-api - Moz API Integration
 * Provides access to Moz SEO metrics and backlink analysis
 */

import axios from 'axios';
import { createLogger } from '@seo-spy/logger';
import {
  AppError,
  createApiError,
  classifyError,
  withRetry,
  type ErrorMetadata,
} from '@seo-spy/error-handler';

// ============================================
// Types & Interfaces / 类型定义
// ============================================

export interface MozConfig {
  accessId: string;
  secretKey: string;
  baseURL?: string;
}

export interface DomainMetrics {
  domainAuthority: number;
  pageAuthority: number;
  rank: number;
  equityLinkCount: number;
  equityLinks: number;
  linkingRootDomains: number;
  totalLinks: number;
  totalExternalLinks: number;
  followedLinks: number;
  noFollowedLinks: number;
  justDiscoveredDomains: number;
  justDiscoveredLinks: number;
  deletedDomainsSince: number;
  deletedLinksSince: number;
}

export interface BacklinkData {
  sourceUrl: string;
  targetUrl: string;
  anchorText?: string;
  dateFirstDiscovered: string;
  dateLastUpdated: string;
  equityLink: boolean;
  noFollowed: boolean;
  deletedDomainsSince?: number;
}

export interface UrlMetrics {
  pageAuthority: number;
  equityLinks: number;
  equity: number;
  totalLinks: number;
  totalExternalLinks: number;
  followedLinks: number;
  noFollowedLinks: number;
}

export interface TopPages {
  url: string;
  pageAuthority: number;
  subdomain?: string;
  rootDomain?: string;
  lastUpdated?: string;
}

export interface KeywordMetrics {
  keyword: string;
  volume: number;
  difficulty: number;
  opportunity: number;
  potential: number;
}

export interface KeywordMetricsResponse {
  keyword: string;
  volume: number;
  difficulty: number;
  opportunity: number;
  potential: number;
  kd?: number;
  vol?: number;
  cpc?: number;
  comp?: number;
}

// ============================================
// Constants / 常量
// ============================================

const DEFAULT_BASE_URL = 'https://lsapi.seomoz.com/v2';
const BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 50;

// ============================================
// Moz API Client / Moz API 客户端
// ============================================

export class MozAPI {
  private accessId: string;
  private secretKey: string;
  private baseURL: string;
  private logger = createLogger('moz-api');

  constructor(config: MozConfig) {
    this.accessId = config.accessId;
    this.secretKey = config.secretKey;
    this.baseURL = config.baseURL || DEFAULT_BASE_URL;

    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.accessId || this.accessId.length === 0) {
      throw new AppError('Moz Access ID is required', {
        category: 'authentication',
        severity: 'critical',
        code: 'MOZ_ACCESS_ID_MISSING',
      });
    }

    if (!this.secretKey || this.secretKey.length === 0) {
      throw new AppError('Moz Secret Key is required', {
        category: 'authentication',
        severity: 'critical',
        code: 'MOZ_SECRET_KEY_MISSING',
      });
    }
  }

  /**
   * Generates authentication signature
   * 生成认证签名
   */
  private generateAuth(endpoint: string): string {
    const timestamp = Date.now();
    const encoded = `${this.accessId}\n${timestamp}`;
    const hash = this.hmacSHA1(encoded, this.secretKey);
    return `${this.accessId}:${hash}:${timestamp}`;
  }

  /**
   * HMAC SHA1 implementation
   */
  private hmacSHA1(key: string, message: string): string {
    const crypto = require('node:crypto') as typeof import('node:crypto');
    return crypto
      .createHmac('sha1', key)
      .update(message)
      .digest('base64');
  }

  /**
   * Makes authenticated API request
   * 发起认证 API 请求
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | boolean> = {},
    retries = 3
  ): Promise<T> {
    return withRetry(async () => {
      const tryCount = retries + 1;
      const url = this.buildURL(endpoint, params);

      this.logger.debug(`Making Moz API request: ${url}`, {
        endpoint,
        retryCount: tryCount,
      });

      try {
        const response = await axios.get<T>(url, {
          headers: {
            'User-Agent': '@seo-spy/moz-api v1.0.0',
            Accept: 'application/json',
          },
          timeout: 30000,
        });

        this.logger.debug(`Moz API response received`, {
          endpoint,
          status: response.status,
        });

        return response.data;
      } catch (error) {
        const apiError = this.handleRequestError(error, endpoint);
        this.logger.error(`Moz API request failed`, apiError, { endpoint, url });
        throw apiError;
      }
    }, {
      maxAttempts: retries,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
    });
  }

  /**
   * Handles request errors
   * 处理请求错误
   */
  private handleRequestError(error: unknown, endpoint: string): AppError {
    const category = classifyError(error instanceof Error ? error : new Error(String(error)));

    let statusCode: number | undefined;
    let message = 'Moz API request failed';

    if (axios.isAxiosError(error)) {
      statusCode = error.response?.status;
      message = error.response?.data?.message || error.message || message;
    }

    const metadata: ErrorMetadata = {
      category,
      statusCode,
      code: `MOZ_${endpoint.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    };

    return createApiError(message, statusCode, metadata);
  }

  /**
   * Builds full URL with auth
   * 构建带认证的完整 URL
   */
  private buildURL(
    endpoint: string,
    params: Record<string, string | number | boolean> = {}
  ): string {
    const url = new URL(`${this.baseURL}${endpoint}`);

    // Add authentication
    url.searchParams.set('AccessID', this.accessId);
    url.searchParams.set('Secret', this.secretKey);
    url.searchParams.set('Expires', Math.floor(Date.now() / 1000).toString());

    // Add parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  }

  // ============================================
  // Domain Metrics / 域名指标
  // ============================================

  /**
   * Gets domain metrics
   * 获取域名指标
   */
  async getDomainMetrics(domain: string): Promise<DomainMetrics> {
    this.logger.info(`Fetching domain metrics for: ${domain}`);

    try {
      const response = await this.request<{
        da: number;
        pa: number;
        pda: number;
        upa: number;
        upl: number;
        lrd: number;
        lrl: number;
        lt: number;
        ltl: number;
        flt: number;
        nlf: number;
        jdd: number;
        jdl: number;
        sdd: number;
        sdl: number;
      }>('/url_metrics/domain', { domain });

      return {
        domainAuthority: response.da || 0,
        pageAuthority: response.pa || 0,
        rank: response.pda || 0,
        equityLinkCount: response.upa || 0,
        equityLinks: response.upl || 0,
        linkingRootDomains: response.lrd || 0,
        totalLinks: response.lrl || 0,
        totalExternalLinks: response.lt || 0,
        followedLinks: response.ltl || 0,
        noFollowedLinks: response.nlf || 0,
        justDiscoveredDomains: response.jdd || 0,
        justDiscoveredLinks: response.jdl || 0,
        deletedDomainsSince: response.sdd || 0,
        deletedLinksSince: response.sdl || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get domain metrics for ${domain}`, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Gets URL metrics
   * 获取 URL 指标
   */
  async getUrlMetrics(url: string): Promise<UrlMetrics> {
    this.logger.info(`Fetching URL metrics for: ${url}`);

    try {
      const response = await this.request<{
        pa: number;
        ue: number;
        upe: number;
        ltp: number;
        ltt: number;
        ltl: number;
        nlf: number;
      }>('/url_metrics/url', { url });

      return {
        pageAuthority: response.pa || 0,
        equityLinks: response.ue || 0,
        equity: response.upe || 0,
        totalLinks: response.ltp || 0,
        totalExternalLinks: response.ltt || 0,
        followedLinks: response.ltl || 0,
        noFollowedLinks: response.nlf || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get URL metrics for ${url}`, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Gets top pages for a domain
   * 获取域名的顶级页面
   */
  async getTopPages(domain: string, limit = 25): Promise<TopPages[]> {
    this.logger.info(`Fetching top pages for: ${domain}`);

    try {
      const response = await this.request<TopPages[]>('/top_pages', {
        domain,
        limit: Math.min(limit, MAX_BATCH_SIZE),
      });

      this.logger.info(`Fetched ${response.length} top pages for ${domain}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to get top pages for ${domain}`, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  // ============================================
  // Backlinks / 反向链接
  // ============================================

  /**
   * Gets backlinks for a URL
   * 获取 URL 的反向链接
   */
  async getBacklinks(
    targetUrl: string,
    options: {
      limit?: number;
      scope?: 'page_to_domain' | 'page_to_page' | 'domain_to_domain';
    } = {}
  ): Promise<BacklinkData[]> {
    const { limit = MAX_BATCH_SIZE, scope = 'page_to_page' } = options;

    this.logger.info(`Fetching backlinks for: ${targetUrl}`, {
      limit,
      scope,
    });

    try {
      const response = await this.request<BacklinkData[]>('/links', {
        targetUrl,
        limit,
        scope,
      });

      this.logger.info(`Fetched ${response.length} backlinks for ${targetUrl}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to get backlinks for ${targetUrl}`, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Gets linking domains for a URL
   * 获取链接到 URL 的域名
   */
  async getLinkingDomains(
    targetUrl: string,
    limit = MAX_BATCH_SIZE
  ): Promise<BacklinkData[]> {
    this.logger.info(`Fetching linking domains for: ${targetUrl}`);

    try {
      const response = await this.request<BacklinkData[]>('/links', {
        targetUrl,
        scope: 'page_to_domain',
        limit,
      });

      this.logger.info(`Fetched ${response.length} linking domains for ${targetUrl}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to get linking domains for ${targetUrl}`, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Gets anchor text distribution
   * 获取锚文本分布
   */
  async getAnchorText(targetUrl: string, limit = MAX_BATCH_SIZE): Promise<Record<string, number>> {
    this.logger.info(`Fetching anchor text for: ${targetUrl}`);

    try {
      const response = await this.request<Record<string, number>>('/anchor_text', {
        targetUrl,
        limit,
      });

      this.logger.info(`Fetched anchor text for ${targetUrl}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to get anchor text for ${targetUrl}`, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  // ============================================
  // Keywords / 关键词
  // ============================================

  /**
   * Gets keyword metrics
   * 获取关键词指标
   */
  async getKeywordMetrics(
    keywords: string[],
    sourceData: 'google' | 'bing' = 'google'
  ): Promise<KeywordMetricsResponse[]> {
    if (keywords.length > BATCH_SIZE) {
      throw new AppError(
        `Batch size exceeds limit of ${BATCH_SIZE} keywords`,
        { category: 'validation', severity: 'low' }
      );
    }

    this.logger.info(`Fetching keyword metrics for ${keywords.length} keywords`, {
      sourceData,
    });

    try {
      const response = await this.request<KeywordMetricsResponse[]>(
        '/metrics_keywords_volume',
        {
          data: keywords.join(','),
          sourceData,
        }
      );

      this.logger.info(`Fetched metrics for ${response.length} keywords`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to get keyword metrics`, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Gets keyword difficulty
   * 获取关键词难度
   */
  async getKeywordDifficulty(keywords: string[]): Promise<KeywordMetricsResponse[]> {
    return this.getKeywordMetrics(keywords, 'google');
  }

  /**
   * Gets keyword volume
   * 获取关键词搜索量
   */
  async getKeywordVolume(keywords: string[]): Promise<KeywordMetricsResponse[]> {
    return this.getKeywordMetrics(keywords, 'google');
  }

  /**
   * Gets keyword suggestions
   * 获取关键词建议
   */
  async getKeywordSuggestions(
    keyword: string,
    limit = 10
  ): Promise<KeywordMetricsResponse[]> {
    this.logger.info(`Fetching keyword suggestions for: ${keyword}`);

    try {
      const response = await this.request<KeywordMetricsResponse[]>('/suggestions', {
        query: keyword,
        limit,
        sourceData: 'google',
      });

      this.logger.info(`Fetched ${response.length} suggestions for ${keyword}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to get keyword suggestions for ${keyword}`, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  // ============================================
  // Batch Operations / 批量操作
  // ============================================

  /**
   * Gets metrics for multiple domains
   * 批量获取多个域名指标
   */
  async getBatchDomainMetrics(domains: string[]): Promise<Record<string, DomainMetrics>> {
    this.logger.info(`Fetching batch metrics for ${domains.length} domains`);

    const results: Record<string, DomainMetrics> = {};

    for (const domain of domains) {
      try {
        const metrics = await this.getDomainMetrics(domain);
        results[domain] = metrics;
      } catch (error) {
        this.logger.warn(`Failed to get metrics for ${domain}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Gets metrics for multiple URLs
   * 批量获取多个 URL 指标
   */
  async getBatchUrlMetrics(urls: string[]): Promise<Record<string, UrlMetrics>> {
    this.logger.info(`Fetching batch metrics for ${urls.length} URLs`);

    const results: Record<string, UrlMetrics> = {};

    for (const url of urls) {
      try {
        const metrics = await this.getUrlMetrics(url);
        results[url] = metrics;
      } catch (error) {
        this.logger.warn(`Failed to get metrics for ${url}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Gets keyword metrics in batches
   * 批量获取关键词指标
   */
  async getBatchKeywordMetrics(
    keywords: string[]
  ): Promise<KeywordMetricsResponse[]> {
    this.logger.info(`Fetching batch keyword metrics for ${keywords.length} keywords`);

    const results: KeywordMetricsResponse[] = [];
    const chunks = this.chunkArray(keywords, BATCH_SIZE);

    for (const chunk of chunks) {
      const chunkResults = await this.getKeywordMetrics(chunk);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Chunks array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ============================================
  // Health Check / 健康检查
  // ============================================

  /**
   * Tests API connectivity
   * 测试 API 连接性
   */
  async testConnection(): Promise<boolean> {
    this.logger.info('Testing Moz API connection...');

    try {
      // Use a well-known domain for testing
      await this.getUrlMetrics('https://www.seomoz.org');

      this.logger.info('Moz API connection successful');
      return true;
    } catch (error) {
      this.logger.error('Moz API connection failed', error instanceof Error ? error : undefined);
      return false;
    }
  }
}

// ============================================
// Factory Function / 工厂函数
// ============================================

export function createMozClient(config: MozConfig): MozAPI {
  return new MozAPI(config);
}

// ============================================
// Export Default / 默认导出
// ============================================

export default MozAPI;
