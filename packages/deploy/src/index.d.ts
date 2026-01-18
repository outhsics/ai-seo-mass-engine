#!/usr/bin/env node
/**
 * Deployment Automation Module
 * 支持 Cloudflare Pages 和 Vercel 的批量部署
 */
interface DeployConfig {
    platform: 'cloudflare' | 'vercel';
    apiToken: string;
    projectName?: string;
    accountSlug?: string;
    teamId?: string;
    sites: SiteConfig[];
}
interface SiteConfig {
    name: string;
    domain: string;
    sourceDir: string;
    branch?: string;
    envVars?: Record<string, string>;
}
interface DeploymentResult {
    site: string;
    status: 'success' | 'failed';
    url?: string;
    error?: string;
    deployId?: string;
}
export declare class DeploymentManager {
    private config;
    constructor(config: DeployConfig);
    deployAll(): Promise<DeploymentResult[]>;
    deploySite(site: SiteConfig): Promise<DeploymentResult>;
    private deployToCloudflare;
    private configureCloudflareDomain;
    private deployToVercel;
    private saveDeploymentLog;
    private delay;
}
export {};
//# sourceMappingURL=index.d.ts.map