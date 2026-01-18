#!/usr/bin/env node
/**
 * Sitemap Submitter Module
 * 自动提交 Sitemap 到 Google Search Console
 */
interface SitemapSubmitConfig {
    siteUrl: string;
    sitemapUrl: string;
    credentialsPath: string;
}
interface SubmitResult {
    siteUrl: string;
    sitemapUrl: string;
    status: 'success' | 'failed';
    submittedAt: string;
    error?: string;
}
export declare class SitemapSubmitter {
    private config;
    private jwt;
    constructor(config: SitemapSubmitConfig);
    submit(): Promise<SubmitResult>;
    pingSearchEngines(): Promise<void>;
    private delay;
}
/**
 * 批量提交多个站点的 Sitemap
 */
export declare class BatchSitemapSubmitter {
    private configs;
    constructor(configs: SitemapSubmitConfig[]);
    submitAll(): Promise<SubmitResult[]>;
}
export {};
//# sourceMappingURL=index.d.ts.map