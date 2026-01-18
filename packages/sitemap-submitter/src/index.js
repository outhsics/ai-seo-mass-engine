#!/usr/bin/env node
/**
 * Sitemap Submitter Module
 * 自动提交 Sitemap 到 Google Search Console
 */
import axios from 'axios';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { JWT } from 'google-auth-library';
export class SitemapSubmitter {
    config;
    jwt;
    constructor(config) {
        this.config = config;
        // 初始化 Google 认证
        const credentials = JSON.parse(readFileSync(config.credentialsPath, 'utf-8'));
        this.jwt = new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/webmasters']
        });
    }
    async submit() {
        console.log(`📤 Submitting sitemap to Google Search Console...`);
        try {
            // 获取访问令牌
            const accessToken = await this.jwt.authorize();
            const token = accessToken.access_token;
            // 提交 Sitemap
            const submitUrl = `https://www.googleapis.com/webmasters/v3/sites${encodeURIComponent(this.config.siteUrl)}/sitemaps/${encodeURIComponent(this.config.sitemapUrl)}`;
            const response = await axios.put(submitUrl, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`✅ Sitemap submitted successfully`);
            return {
                siteUrl: this.config.siteUrl,
                sitemapUrl: this.config.sitemapUrl,
                status: 'success',
                submittedAt: new Date().toISOString()
            };
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.data?.error?.message || error.message;
                console.error(`❌ Failed to submit sitemap: ${errorMsg}`);
                return {
                    siteUrl: this.config.siteUrl,
                    sitemapUrl: this.config.sitemapUrl,
                    status: 'failed',
                    submittedAt: new Date().toISOString(),
                    error: errorMsg
                };
            }
            throw error;
        }
    }
    async pingSearchEngines() {
        const searchEngines = [
            `https://www.google.com/ping?sitemap=${encodeURIComponent(this.config.sitemapUrl)}`,
            `https://www.bing.com/ping?sitemap=${encodeURIComponent(this.config.sitemapUrl)}`
        ];
        console.log('🔔 Pinging search engines...');
        for (const url of searchEngines) {
            try {
                await axios.get(url);
                console.log(`✅ Pinged: ${url.split('/')[2]}`);
            }
            catch (error) {
                console.error(`❌ Failed to ping: ${url.split('/')[2]}`);
            }
            await this.delay(500);
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
/**
 * 批量提交多个站点的 Sitemap
 */
export class BatchSitemapSubmitter {
    configs;
    constructor(configs) {
        this.configs = configs;
    }
    async submitAll() {
        console.log(`🚀 Submitting ${this.configs.length} sitemaps...`);
        const results = [];
        for (const config of this.configs) {
            const submitter = new SitemapSubmitter(config);
            try {
                const result = await submitter.submit();
                // 同时 ping 其他搜索引擎
                await submitter.pingSearchEngines();
                results.push(result);
            }
            catch (error) {
                results.push({
                    siteUrl: config.siteUrl,
                    sitemapUrl: config.sitemapUrl,
                    status: 'failed',
                    submittedAt: new Date().toISOString(),
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            // 避免请求过快
            await this.delay(2000);
        }
        return results;
    }
}
// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-credentials.json';
    if (!existsSync(credentialsPath)) {
        console.error('❌ Google Service Account credentials not found');
        console.log('Please set GOOGLE_SERVICE_ACCOUNT_KEY_PATH or provide google-credentials.json');
        process.exit(1);
    }
    // 单站点提交
    if (process.env.SITE_URL && process.env.SITEMAP_URL) {
        const config = {
            siteUrl: process.env.SITE_URL,
            sitemapUrl: process.env.SITEMAP_URL,
            credentialsPath
        };
        const submitter = new SitemapSubmitter(config);
        submitter.submit()
            .then(() => console.log('🎉 Sitemap submission completed'))
            .catch(console.error);
    }
    // 批量提交（从配置文件读取）
    else {
        const configPath = join(process.cwd(), 'data/sitemap-config.json');
        if (!existsSync(configPath)) {
            console.error('❌ sitemap-config.json not found');
            process.exit(1);
        }
        const configs = JSON.parse(readFileSync(configPath, 'utf-8'));
        const batchSubmitter = new BatchSitemapSubmitter(configs);
        batchSubmitter.submitAll()
            .then(results => {
            const successCount = results.filter(r => r.status === 'success').length;
            console.log(`\n🎉 Batch submission completed: ${successCount}/${results.length} successful`);
        })
            .catch(console.error);
    }
}
//# sourceMappingURL=index.js.map