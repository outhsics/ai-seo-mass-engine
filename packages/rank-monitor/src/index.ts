#!/usr/bin/env node

/**
 * Keyword Ranking Monitor
 * 关键词排名监控系统 - 追踪 SEO 关键词在搜索引擎中的排名
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface MonitorConfig {
  keywords: string[];
  targetUrl: string;
  searchEngine: 'google' | 'bing' | 'baidu';
  outputDir: string;
  interval: number; // hours
}

interface RankingData {
  keyword: string;
  url: string;
  position: number;
  change: number;
  lastChecked: string;
  searchEngine: string;
}

interface RankingHistory {
  keyword: string;
  history: {
    date: string;
    position: number;
  }[];
}

export class RankMonitor {
  private config: MonitorConfig;
  private history: Map<string, RankingHistory> = new Map();

  constructor(config: MonitorConfig) {
    this.config = config;
    this.loadHistory();
  }

  /**
   * 开始监控
   */
  async startMonitoring(): Promise<void> {
    console.log('📊 Starting keyword ranking monitoring...\n');

    const results: RankingData[] = [];

    for (const keyword of this.config.keywords) {
      console.log(`🔍 Checking: "${keyword}"`);

      try {
        const position = await this.checkRanking(keyword);
        const previousPosition = this.getPreviousPosition(keyword);
        const change = previousPosition ? previousPosition - position : 0;

        const rankingData: RankingData = {
          keyword,
          url: this.config.targetUrl,
          position,
          change,
          lastChecked: new Date().toISOString(),
          searchEngine: this.config.searchEngine
        };

        results.push(rankingData);
        this.updateHistory(keyword, position);

        const changeIcon = change > 0 ? '⬆️' : change < 0 ? '⬇️' : '➡️';
        console.log(`   ${changeIcon} Position: ${position} (${change > 0 ? '+' : ''}${change})`);
      } catch (error) {
        console.error(`   ❌ Error:`, error);
      }

      // 避免请求过快
      await this.delay(1000);
    }

    this.saveResults(results);
    this.displayDashboard(results);
  }

  /**
   * 检查关键词排名
   */
  private async checkRanking(keyword: string): Promise<number> {
    // 模拟搜索排名检查
    // 实际使用时需要集成真实的搜索 API 或使用 Puppeteer
    const mockPosition = Math.floor(Math.random() * 100) + 1;

    // 模拟 API 调用延迟
    await this.delay(500);

    return mockPosition;
  }

  /**
   * 获取上一次排名
   */
  private getPreviousPosition(keyword: string): number | null {
    const history = this.history.get(keyword);
    if (!history || history.history.length === 0) return null;

    return history.history[history.history.length - 1].position;
  }

  /**
   * 更新历史记录
   */
  private updateHistory(keyword: string, position: number): void {
    const history = this.history.get(keyword) || { keyword, history: [] };

    history.history.push({
      date: new Date().toISOString(),
      position
    });

    // 只保留最近 30 天的记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    history.history = history.history.filter(h => new Date(h.date) > thirtyDaysAgo);

    this.history.set(keyword, history);
  }

  /**
   * 加载历史记录
   */
  private loadHistory(): void {
    const historyPath = join(process.cwd(), this.config.outputDir, 'ranking-history.json');

    if (existsSync(historyPath)) {
      const data = readFileSync(historyPath, 'utf-8');
      const historyArray: RankingHistory[] = JSON.parse(data);

      for (const item of historyArray) {
        this.history.set(item.keyword, item);
      }
    }
  }

  /**
   * 保存结果
   */
  private saveResults(results: RankingData[]): void {
    const outputDir = join(process.cwd(), this.config.outputDir);
    mkdirSync(outputDir, { recursive: true });

    // 保存当前结果
    const timestamp = new Date().toISOString().split('T')[0];
    const resultsPath = join(outputDir, `ranking-${timestamp}.json`);
    writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    // 保存历史记录
    const historyPath = join(outputDir, 'ranking-history.json');
    const historyArray = Array.from(this.history.values());
    writeFileSync(historyPath, JSON.stringify(historyArray, null, 2));

    console.log(`\n💾 Results saved to: ${resultsPath}`);
  }

  /**
   * 显示仪表板
   */
  private displayDashboard(results: RankingData[]): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 SEO Ranking Dashboard');
    console.log('='.repeat(70));

    // 统计摘要
    const top10 = results.filter(r => r.position <= 10).length;
    const top20 = results.filter(r => r.position <= 20).length;
    const improved = results.filter(r => r.change > 0).length;
    const declined = results.filter(r => r.change < 0).length;
    const avgPosition = results.reduce((sum, r) => sum + r.position, 0) / results.length;

    console.log('\n📈 Summary:');
    console.log(`   Top 10: ${top10} | Top 20: ${top20}`);
    console.log(`   Improved: ${improved} | Declined: ${declined}`);
    console.log(`   Average Position: ${avgPosition.toFixed(1)}`);

    // 详细排名
    console.log('\n📋 Rankings:');
    console.log('┌' + '─'.repeat(66) + '┐');

    const sorted = results.sort((a, b) => a.position - b.position);

    for (const result of sorted) {
      const changeIcon = result.change > 0 ? '⬆️' : result.change < 0 ? '⬇️' : '➡️';
      const changeStr = result.change !== 0 ? `(${result.change > 0 ? '+' : ''}${result.change})` : '';

      console.log(
        '│ ' +
        result.keyword.padEnd(30) +
        ' │ ' +
        `#${result.position.toString().padStart(3)}` +
        ' ' +
        changeIcon +
        ' ' +
        changeStr.padEnd(8) +
        ' │'
      );
    }

    console.log('└' + '─'.repeat(66) + '┘');
    console.log('='.repeat(70) + '\n');
  }

  /**
   * 生成趋势图表数据
   */
  generateTrendData(keyword: string): any[] {
    const history = this.history.get(keyword);
    if (!history) return [];

    return history.history.map(h => ({
      date: h.date,
      position: h.position
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: MonitorConfig = {
    keywords: [
      'react hooks',
      'typescript教程',
      'astro framework',
      'frontend development',
      'web development'
    ],
    targetUrl: 'https://example.com',
    searchEngine: 'google',
    outputDir: './data/rankings',
    interval: 24
  };

  const monitor = new RankMonitor(config);
  monitor.startMonitoring().catch(console.error);
}
