#!/usr/bin/env node

/**
 * Deployment Automation Module
 * 支持 Cloudflare Pages 和 Vercel 的批量部署
 */

import axios from 'axios';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface DeployConfig {
  platform: 'cloudflare' | 'vercel';
  apiToken: string;
  projectName?: string;
  accountSlug?: string; // Cloudflare 需要
  teamId?: string; // Vercel 可选
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

export class DeploymentManager {
  private config: DeployConfig;

  constructor(config: DeployConfig) {
    this.config = config;
  }

  async deployAll(): Promise<DeploymentResult[]> {
    console.log(`🚀 Starting deployment to ${this.config.platform}...`);

    const results: DeploymentResult[] = [];

    for (const site of this.config.sites) {
      try {
        const result = await this.deploySite(site);
        results.push(result);
        console.log(`✅ ${site.name}: ${result.url}`);
      } catch (error) {
        results.push({
          site: site.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`❌ ${site.name}: Deployment failed`);
      }

      // 避免请求过快
      await this.delay(1000);
    }

    // 保存部署记录
    this.saveDeploymentLog(results);

    return results;
  }

  async deploySite(site: SiteConfig): Promise<DeploymentResult> {
    if (this.config.platform === 'cloudflare') {
      return this.deployToCloudflare(site);
    } else {
      return this.deployToVercel(site);
    }
  }

  private async deployToCloudflare(site: SiteConfig): Promise<DeploymentResult> {
    if (!this.config.accountSlug) {
      throw new Error('Cloudflare accountSlug is required');
    }

    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${this.config.accountSlug}/pages/projects/${site.name}/deployments`;

    try {
      // 创建部署
      const response = await axios.post(
        apiUrl,
        {
          branch: site.branch || 'main',
          production: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const deployId = response.data.result.id;
      const deployUrl = response.data.result.url;

      // 配置自定义域名
      if (site.domain) {
        await this.configureCloudflareDomain(site.name, site.domain);
      }

      return {
        site: site.name,
        status: 'success',
        url: deployUrl,
        deployId
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Cloudflare API error: ${error.response?.data?.errors?.[0]?.message || error.message}`);
      }
      throw error;
    }
  }

  private async configureCloudflareDomain(projectName: string, domain: string): Promise<void> {
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${this.config.accountSlug}/pages/projects/${projectName}/domains`;

    await axios.post(
      apiUrl,
      { name: domain },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`🌐 Domain configured: ${domain}`);
  }

  private async deployToVercel(site: SiteConfig): Promise<DeploymentResult> {
    const apiUrl = `https://api.vercel.com/v13/deployments`;

    try {
      const response = await axios.post(
        apiUrl,
        {
          name: site.name,
          project: this.config.projectName || site.name,
          target: 'production',
          gitSource: {
            type: 'github',
            repo: site.sourceDir,
            branch: site.branch || 'main'
          },
          env: site.envVars || {}
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const deployUrl = response.data.url;

      return {
        site: site.name,
        status: 'success',
        url: deployUrl,
        deployId: response.data.id
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Vercel API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  private saveDeploymentLog(results: DeploymentResult[]): void {
    const logsDir = join(process.cwd(), 'data/logs');
    mkdirSync(logsDir, { recursive: true });

    const timestamp = new Date().toISOString();
    const logFile = join(logsDir, `deployment-${timestamp.split('T')[0]}.json`);

    const logData = {
      timestamp,
      platform: this.config.platform,
      results
    };

    writeFileSync(logFile, JSON.stringify(logData, null, 2));
    console.log(`📝 Deployment log saved: ${logFile}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  // 示例配置
  const config: DeployConfig = {
    platform: process.env.DEPLOY_PLATFORM === 'vercel' ? 'vercel' : 'cloudflare',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || process.env.VERCEL_API_TOKEN || '',
    accountSlug: process.env.CLOUDFLARE_ACCOUNT_ID,
    projectName: process.env.VERCEL_PROJECT_NAME,
    sites: [
      {
        name: 'site-001',
        domain: 'site-001.example.com',
        sourceDir: './sites/site-001',
        branch: 'main',
        envVars: {
          NODE_ENV: 'production'
        }
      }
      // 可以添加更多站点...
    ]
  };

  if (!config.apiToken) {
    console.error('❌ API token not found. Please set CLOUDFLARE_API_TOKEN or VERCEL_API_TOKEN');
    process.exit(1);
  }

  const manager = new DeploymentManager(config);
  manager.deployAll()
    .then(results => {
      const successCount = results.filter(r => r.status === 'success').length;
      console.log(`\n🎉 Deployment completed: ${successCount}/${results.length} sites deployed successfully`);
    })
    .catch(console.error);
}
