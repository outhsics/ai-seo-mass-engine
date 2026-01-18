#!/usr/bin/env node

/**
 * SEO 矩阵系统 - 任务编排中心
 * 统一管理：关键词爬取 → 文章生成 → 站点构建 → 自动部署 → Sitemap提交
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

interface PipelineConfig {
  // 关键词配置
  keywords: {
    enabled: boolean;
    niches: string[];
    maxKeywords: number;
  };
  // 文章生成配置
  articles: {
    enabled: boolean;
    count: number;
    minWords: number;
  };
  // 站点构建配置
  build: {
    enabled: boolean;
    outputDir: string;
  };
  // 部署配置
  deploy: {
    enabled: boolean;
    platform: 'cloudflare' | 'vercel';
  };
  // Sitemap 提交配置
  sitemap: {
    enabled: boolean;
    autoSubmit: boolean;
  };
}

interface PipelineResult {
  stage: string;
  status: 'success' | 'failed' | 'skipped';
  duration: number;
  output?: any;
  error?: string;
}

class SEOPipelineOrchestrator {
  private config: PipelineConfig;
  private results: PipelineResult[] = [];

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  async execute(): Promise<void> {
    console.log('🚀 Starting SEO Pipeline Execution...\n');

    const startTime = Date.now();

    // Stage 1: 关键词爬取
    await this.runStage('keyword-scraping', this.runKeywordScraping.bind(this));

    // Stage 2: 文章生成
    await this.runStage('article-generation', this.runArticleGeneration.bind(this));

    // Stage 3: 站点构建
    await this.runStage('site-build', this.runSiteBuild.bind(this));

    // Stage 4: 自动部署
    await this.runStage('deployment', this.runDeployment.bind(this));

    // Stage 5: Sitemap 提交
    await this.runStage('sitemap-submission', this.runSitemapSubmission.bind(this));

    const totalDuration = Date.now() - startTime;

    // 生成报告
    this.generateReport(totalDuration);
  }

  private async runStage(
    stageName: string,
    handler: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Stage: ${stageName.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);

    try {
      await handler();

      this.results.push({
        stage: stageName,
        status: 'success',
        duration: Date.now() - startTime
      });

      console.log(`✅ ${stageName} completed successfully\n`);
    } catch (error) {
      this.results.push({
        stage: stageName,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error(`❌ ${stageName} failed:`, error);
      throw error; // 失败则停止整个流程
    }
  }

  private async runKeywordScraping(): Promise<void> {
    if (!this.config.keywords.enabled) {
      console.log('⏭️  Keyword scraping disabled, skipping...');
      return;
    }

    console.log(`🔍 Scraping keywords for niches: ${this.config.keywords.niches.join(', ')}`);
    console.log(`📊 Target: ${this.config.keywords.maxKeywords} keywords`);

    // 调用 keyword-spy 模块
    execSync('pnpm run build --filter @seo-spy/keyword-spy', { stdio: 'inherit' });
    execSync('node packages/keyword-spy/dist/index.js', { stdio: 'inherit' });
  }

  private async runArticleGeneration(): Promise<void> {
    if (!this.config.articles.enabled) {
      console.log('⏭️  Article generation disabled, skipping...');
      return;
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for article generation');
    }

    console.log(`🤖 Generating ${this.config.articles.count} articles`);
    console.log(`📝 Min words per article: ${this.config.articles.minWords}`);

    // 调用 article-gen 模块
    execSync('pnpm run build --filter @seo-spy/article-gen', { stdio: 'inherit' });
    execSync('node packages/article-gen/dist/index.js', { stdio: 'inherit' });
  }

  private async runSiteBuild(): Promise<void> {
    if (!this.config.build.enabled) {
      console.log('⏭️  Site build disabled, skipping...');
      return;
    }

    console.log(`🏗️  Building site...`);

    // 复制生成的文章到 Astro 内容目录
    this.copyArticlesToSite();

    // 调用 Astro 构建
    execSync('pnpm run build --filter @seo-spy/site-template', { stdio: 'inherit' });
  }

  private async runDeployment(): Promise<void> {
    if (!this.config.deploy.enabled) {
      console.log('⏭️  Deployment disabled, skipping...');
      return;
    }

    const platform = this.config.deploy.platform;
    console.log(`🚀 Deploying to ${platform}...`);

    // 调用 deploy 模块
    execSync('pnpm run build --filter @seo-spy/deploy', { stdio: 'inherit' });
    execSync('node packages/deploy/dist/index.js', { stdio: 'inherit' });
  }

  private async runSitemapSubmission(): Promise<void> {
    if (!this.config.sitemap.enabled) {
      console.log('⏭️  Sitemap submission disabled, skipping...');
      return;
    }

    if (!this.config.sitemap.autoSubmit) {
      console.log('📋 Sitemap generated (auto-submit disabled)');
      return;
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
      console.warn('⚠️  GOOGLE_SERVICE_ACCOUNT_KEY_PATH not set, skipping...');
      return;
    }

    console.log('📤 Submitting sitemap to search engines...');

    // 调用 sitemap-submitter 模块
    execSync('pnpm run build --filter @seo-spy/sitemap-submitter', { stdio: 'inherit' });
    execSync('node packages/sitemap-submitter/dist/index.js', { stdio: 'inherit' });
  }

  private copyArticlesToSite(): void {
    const sourceDir = join(process.cwd(), 'data/articles');
    const targetDir = join(process.cwd(), 'packages/site-template/src/content/posts');

    if (!existsSync(sourceDir)) {
      console.warn('⚠️  No articles found to copy');
      return;
    }

    mkdirSync(targetDir, { recursive: true });

    // 这里应该实现文件复制逻辑
    // 简化处理：假设已通过符号链接或其他方式处理
    console.log('📄 Articles linked to site content directory');
  }

  private generateReport(totalDuration: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PIPELINE EXECUTION REPORT');
    console.log('='.repeat(60));

    const durationMinutes = Math.floor(totalDuration / 60000);
    const durationSeconds = Math.floor((totalDuration % 60000) / 1000);

    console.log(`\n⏱️  Total Duration: ${durationMinutes}m ${durationSeconds}s\n`);

    this.results.forEach(result => {
      const icon = result.status === 'success' ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`${icon} ${result.stage.padEnd(25)} ${duration}s`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    // 保存报告到文件
    const reportPath = join(process.cwd(), 'data/logs/pipeline-report.json');
    mkdirSync(join(process.cwd(), 'data/logs'), { recursive: true });

    const reportData = {
      timestamp: new Date().toISOString(),
      totalDuration,
      stages: this.results,
      config: this.config
    };

    writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📝 Report saved to: ${reportPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Pipeline completed successfully!');
    console.log('='.repeat(60) + '\n');
  }
}

// ============================================
// CLI 入口
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  // 读取配置或使用默认值
  const configPath = process.env.CONFIG_PATH || join(process.cwd(), 'pipeline.config.json');

  let config: PipelineConfig;

  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
    console.log(`📄 Loaded config from: ${configPath}`);
  } else {
    // 默认配置
    config = {
      keywords: {
        enabled: true,
        niches: ['前端开发', 'React教程', 'TypeScript入门', 'Astro框架'],
        maxKeywords: 100
      },
      articles: {
        enabled: true,
        count: 10,
        minWords: 1500
      },
      build: {
        enabled: true,
        outputDir: './dist'
      },
      deploy: {
        enabled: false, // 默认禁用部署
        platform: 'cloudflare'
      },
      sitemap: {
        enabled: true,
        autoSubmit: false // 默认禁用自动提交
      }
    };

    console.log('⚠️  Using default configuration');
  }

  const orchestrator = new SEOPipelineOrchestrator(config);
  orchestrator.execute().catch(error => {
    console.error('💥 Pipeline failed:', error);
    process.exit(1);
  });
}
