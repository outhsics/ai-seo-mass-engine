#!/usr/bin/env node

/**
 * Keyword Spy Module
 * 自动爬取并分析 SEO 关键词
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface KeywordSpyConfig {
  sources: KeywordSource[];
  outputDir: string;
  maxKeywords: number;
  minVolume: number;
  niches: string[];
}

interface KeywordSource {
  type: 'google' | 'baidu' | 'bing' | 'custom';
  url?: string;
  enabled: boolean;
}

interface KeywordData {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  trend: number;
  source: string;
  scrapedAt: Date;
}

export class KeywordSpy {
  private config: KeywordSpyConfig;
  private scraper: KeywordScraper;
  private analyzer: KeywordAnalyzer;

  constructor(config: KeywordSpyConfig) {
    this.config = config;
    this.scraper = new KeywordScraper(config);
    this.analyzer = new KeywordAnalyzer();
  }

  async execute(): Promise<KeywordData[]> {
    console.log('🔍 Starting keyword scraping...');

    const allKeywords: KeywordData[] = [];

    for (const niche of this.config.niches) {
      console.log(`\n📂 Processing niche: ${niche}`);

      const nicheKeywords = await this.scrapeNiche(niche);
      const analyzedKeywords = await this.analyzer.analyze(nicheKeywords);

      allKeywords.push(...analyzedKeywords);
    }

    // 按照搜索量和难度排序
    const sortedKeywords = this.analyzer.rankByPotential(allKeywords);

    // 取前 N 个关键词
    const topKeywords = sortedKeywords.slice(0, this.config.maxKeywords);

    // 保存结果
    await this.saveResults(topKeywords);

    console.log(`\n✅ Scraped ${topKeywords.length} keywords`);
    return topKeywords;
  }

  private async scrapeNiche(niche: string): Promise<KeywordData[]> {
    const keywords: KeywordData[] = [];

    for (const source of this.config.sources) {
      if (!source.enabled) continue;

      try {
        const sourceKeywords = await this.scraper.scrape(source, niche);
        keywords.push(...sourceKeywords);
      } catch (error) {
        console.error(`❌ Failed to scrape from ${source.type}:`, error);
      }
    }

    return keywords;
  }

  private async saveResults(keywords: KeywordData[]): Promise<void> {
    const outputDir = join(process.cwd(), this.config.outputDir, 'keywords');
    mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().split('T')[0];
    const filePath = join(outputDir, `keywords-${timestamp}.json`);

    writeFileSync(filePath, JSON.stringify(keywords, null, 2));
    console.log(`💾 Saved keywords to: ${filePath}`);

    // 同时保存 CSV 格式
    const csvPath = join(outputDir, `keywords-${timestamp}.csv`);
    const csvContent = this.toCSV(keywords);
    writeFileSync(csvPath, csvContent);
    console.log(`💾 Saved CSV to: ${csvPath}`);
  }

  private toCSV(keywords: KeywordData[]): string {
    const headers = ['Keyword', 'Volume', 'Difficulty', 'CPC', 'Trend', 'Source', 'Date'];
    const rows = keywords.map(k => [
      k.keyword,
      k.volume,
      k.difficulty,
      k.cpc,
      k.trend,
      k.source,
      k.scrapedAt.toISOString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export class KeywordScraper {
  constructor(private config: KeywordSpyConfig) {}

  async scrape(source: KeywordSource, niche: string): Promise<KeywordData[]> {
    switch (source.type) {
      case 'google':
        return this.scrapeGoogleSuggestions(niche);
      case 'custom':
        return source.url ? this.scrapeCustomUrl(source.url) : [];
      default:
        return [];
    }
  }

  private async scrapeGoogleSuggestions(query: string): Promise<KeywordData[]> {
    // Google Autocomplete API
    const url = `http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json() as [string, string[]];

    return (data[1]).map((keyword, index) => ({
      keyword,
      volume: Math.floor(Math.random() * 10000) + 100, // 模拟数据
      difficulty: Math.floor(Math.random() * 100),
      cpc: Math.random() * 5,
      trend: Math.floor(Math.random() * 100),
      source: 'google-autocomplete',
      scrapedAt: new Date()
    }));
  }

  private async scrapeCustomUrl(url: string): Promise<KeywordData[]> {
    // 使用 Puppeteer 爬取自定义 URL
    const keywords: KeywordData[] = [];
    // TODO: 实现具体的爬取逻辑
    return keywords;
  }
}

export class KeywordAnalyzer {
  async analyze(keywords: KeywordData[]): Promise<KeywordData[]> {
    // 计算关键词潜力分数
    return keywords.map(k => ({
      ...k,
      // 潜力 = (搜索量 / 100) - (难度 * 0.5) + (趋势 * 0.3)
      trend: Math.floor((k.volume / 100) - (k.difficulty * 0.5) + (k.trend * 0.3))
    }));
  }

  rankByPotential(keywords: KeywordData[]): KeywordData[] {
    return keywords.sort((a, b) => b.trend - a.trend);
  }
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: KeywordSpyConfig = {
    sources: [
      { type: 'google', enabled: true },
      { type: 'baidu', enabled: false }
    ],
    outputDir: './data',
    maxKeywords: 1000,
    minVolume: 100,
    niches: [
      '前端报错',
      'React教程',
      'TypeScript入门',
      'Astro开发',
      'SEO优化'
    ]
  };

  const spy = new KeywordSpy(config);
  spy.execute().catch(console.error);
}
