#!/usr/bin/env node

/**
 * Analytics Dashboard Module
 * 流量分析面板 - 生成 SEO 数据可视化面板
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AnalyticsConfig {
  dataDir: string;
  outputDir: string;
  siteUrl: string;
}

interface TrafficData {
  date: string;
  pageviews: number;
  uniqueVisitors: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export class AnalyticsDashboard {
  private config: AnalyticsConfig;

  constructor(config: AnalyticsConfig) {
    this.config = config;
  }

  /**
   * 生成分析仪表板
   */
  async generateDashboard(): Promise<void> {
    console.log('📊 Generating analytics dashboard...\n');

    // 收集数据
    const trafficData = this.collectTrafficData();
    const topPages = this.getTopPages();
    const trafficSources = this.getTrafficSources();
    const keywordRankings = this.getKeywordRankings();

    // 生成 HTML 仪表板
    const dashboard = this.generateHTML({
      trafficData,
      topPages,
      trafficSources,
      keywordRankings
    });

    // 保存仪表板
    const outputPath = join(process.cwd(), this.config.outputDir, 'dashboard.html');
    mkdirSync(join(process.cwd(), this.config.outputDir), { recursive: true });
    writeFileSync(outputPath, dashboard);

    console.log(`✅ Dashboard generated: ${outputPath}`);
    console.log(`   Open in browser: file://${outputPath}\n`);
  }

  /**
   * 收集流量数据
   */
  private collectTrafficData(): TrafficData[] {
    const data: TrafficData[] = [];
    const today = new Date();

    // 生成最近 30 天的模拟数据
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      data.push({
        date: date.toISOString().split('T')[0],
        pageviews: Math.floor(Math.random() * 5000) + 1000,
        uniqueVisitors: Math.floor(Math.random() * 2000) + 500,
        sessions: Math.floor(Math.random() * 1500) + 400,
        bounceRate: Math.random() * 30 + 30,
        avgSessionDuration: Math.random() * 180 + 60
      });
    }

    return data;
  }

  /**
   * 获取热门页面
   */
  private getTopPages(): Array<{ path: string; views: number; avgTime: number }> {
    return [
      { path: '/articles/react-hooks-guide/', views: 5420, avgTime: 245 },
      { path: '/articles/typescript-best-practices/', views: 3890, avgTime: 312 },
      { path: '/articles/astro-static-site/', views: 2980, avgTime: 198 },
      { path: '/', views: 8740, avgTime: 89 },
      { path: '/articles', views: 2130, avgTime: 124 }
    ];
  }

  /**
   * 获取流量来源
   */
  private getTrafficSources(): Array<{ source: string; percentage: number }> {
    return [
      { source: 'Google Organic', percentage: 45.2 },
      { source: 'Direct', percentage: 23.8 },
      { source: 'Referral', percentage: 15.4 },
      { source: 'Social', percentage: 10.3 },
      { source: 'Other', percentage: 5.3 }
    ];
  }

  /**
   * 获取关键词排名
   */
  private getKeywordRankings(): Array<{ keyword: string; position: number; change: number }> {
    return [
      { keyword: 'react hooks', position: 8, change: 2 },
      { keyword: 'typescript tutorial', position: 12, change: -3 },
      { keyword: 'astro framework', position: 5, change: 5 },
      { keyword: 'seo optimization', position: 18, change: 1 },
      { keyword: 'frontend development', position: 23, change: -2 }
    ];
  }

  /**
   * 生成 HTML 仪表板
   */
  private generateHTML(data: any): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Analytics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }

    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 2rem;
      margin-bottom: 10px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .stat-label {
      color: #666;
      font-size: 0.875rem;
      margin-bottom: 10px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #333;
    }

    .stat-change {
      font-size: 0.875rem;
      margin-top: 5px;
    }

    .stat-change.positive { color: #10b981; }
    .stat-change.negative { color: #ef4444; }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .chart-card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .chart-title {
      font-size: 1.25rem;
      margin-bottom: 20px;
      color: #333;
    }

    .table-card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }

    .trend-up { color: #10b981; }
    .trend-down { color: #ef4444; }
  </style>
</head>
<body>
  <div class="dashboard">
    <div class="header">
      <h1>📊 SEO Analytics Dashboard</h1>
      <p>Real-time SEO performance metrics</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Pageviews (30 days)</div>
        <div class="stat-value">${this.formatNumber(data.trafficData.reduce((sum: number, d: TrafficData) => sum + d.pageviews, 0))}</div>
        <div class="stat-change positive">↑ 12.5% vs last period</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Unique Visitors</div>
        <div class="stat-value">${this.formatNumber(data.trafficData.reduce((sum: number, d: TrafficData) => sum + d.uniqueVisitors, 0))}</div>
        <div class="stat-change positive">↑ 8.3% vs last period</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg. Bounce Rate</div>
        <div class="stat-value">${(data.trafficData.reduce((sum: number, d: TrafficData) => sum + d.bounceRate, 0) / data.trafficData.length).toFixed(1)}%</div>
        <div class="stat-change negative">↓ 2.1% vs last period</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg. Session Duration</div>
        <div class="stat-value">${Math.floor(data.trafficData.reduce((sum: number, d: TrafficData) => sum + d.avgSessionDuration, 0) / data.trafficData.length)}s</div>
        <div class="stat-change positive">↑ 15.7% vs last period</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Traffic Trend (30 Days)</div>
        <canvas id="trafficChart"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">Traffic Sources</div>
        <canvas id="sourcesChart"></canvas>
      </div>
    </div>

    <div class="table-card">
      <div class="chart-title">Top Performing Pages</div>
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th>Views</th>
            <th>Avg. Time</th>
          </tr>
        </thead>
        <tbody>
          ${data.topPages.map((page: any) => `
            <tr>
              <td>${page.path}</td>
              <td>${this.formatNumber(page.views)}</td>
              <td>${Math.floor(page.avgTime / 60)}m ${page.avgTime % 60}s</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    // Traffic Chart
    new Chart(document.getElementById('trafficChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(data.trafficData.map((d: TrafficData) => d.date))},
        datasets: [{
          label: 'Pageviews',
          data: ${JSON.stringify(data.trafficData.map((d: TrafficData) => d.pageviews))},
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });

    // Sources Chart
    new Chart(document.getElementById('sourcesChart'), {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(data.trafficSources.map((s: any) => s.source))},
        datasets: [{
          data: ${JSON.stringify(data.trafficSources.map((s: any) => s.percentage))},
          backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  </script>
</body>
</html>`;
  }

  private formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: AnalyticsConfig = {
    dataDir: './data/analytics',
    outputDir: './data/dashboard',
    siteUrl: 'https://example.com'
  };

  const dashboard = new AnalyticsDashboard(config);
  dashboard.generateDashboard().catch(console.error);
}
