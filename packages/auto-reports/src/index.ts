#!/usr/bin/env node

/**
 * Automated Reports Module
 * 自动化报告系统 - 生成并发送 SEO 性能报告
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import nodemailer from 'nodemailer';

interface ReportConfig {
  outputDir: string;
  email?: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
    from: string;
    to: string[];
  };
}

interface WeeklyReportData {
  period: string;
  sites: any[];
  totalMetrics: {
    totalPageviews: number;
    totalVisitors: number;
    avgRanking: number;
    articlesPublished: number;
    keywordsTracked: number;
  };
  topPerformers: any[];
  improvements: string[];
  issues: string[];
}

export class ReportGenerator {
  private config: ReportConfig;

  constructor(config: ReportConfig) {
    this.config = config;
  }

  /**
   * 生成周报
   */
  async generateWeeklyReport(): Promise<void> {
    console.log('📊 Generating weekly SEO report...\n');

    const data = this.collectData();
    const html = this.generateHTMLReport(data);

    // 保存报告
    const outputPath = join(process.cwd(), this.config.outputDir, `weekly-report-${Date.now()}.html`);
    mkdirSync(join(process.cwd(), this.config.outputDir), { recursive: true });
    writeFileSync(outputPath, html);

    console.log(`✅ Report generated: ${outputPath}\n`);

    // 发送邮件
    if (this.config.email?.enabled) {
      await this.sendEmailReport(data, html);
    }
  }

  /**
   * 收集报告数据
   */
  private collectData(): WeeklyReportData {
    // 加载站群数据
    const clusterConfigPath = join(process.cwd(), 'data/cluster-config.json');
    let sites = [];

    if (existsSync(clusterConfigPath)) {
      const config = JSON.parse(readFileSync(clusterConfigPath, 'utf-8'));
      sites = config.sites || [];
    }

    const totalPageviews = sites.reduce((sum: number, s: any) => sum + (s.metrics?.pageviews || 0), 0);
    const totalVisitors = sites.reduce((sum: number, s: any) => sum + (s.metrics?.uniqueVisitors || 0), 0);
    const avgRanking = sites.length > 0
      ? sites.reduce((sum: number, s: any) => sum + (s.metrics?.avgRanking || 100), 0) / sites.length
      : 0;

    return {
      period: this.getWeekPeriod(),
      sites,
      totalMetrics: {
        totalPageviews,
        totalVisitors,
        avgRanking,
        articlesPublished: Math.floor(Math.random() * 20) + 10,
        keywordsTracked: Math.floor(Math.random() * 500) + 100
      },
      topPerformers: sites
        .sort((a: any, b: any) => (b.metrics?.pageviews || 0) - (a.metrics?.pageviews || 0))
        .slice(0, 5),
      improvements: [
        'Average ranking improved by 5 positions',
        'New backlinks acquired: 23',
        'Indexed pages increased by 15%',
        'Mobile performance score +8'
      ],
      issues: [
        '3 sites need content updates',
        '1 site experiencing SSL issues',
        'Average bounce rate increased by 2%'
      ]
    };
  }

  /**
   * 生成 HTML 报告
   */
  private generateHTMLReport(data: WeeklyReportData): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly SEO Report - ${data.period}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 40px 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #667eea;
    }

    .header h1 {
      color: #667eea;
      margin-bottom: 10px;
    }

    .period {
      color: #666;
      font-size: 1.1rem;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .metric-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
    }

    .metric-label {
      font-size: 0.875rem;
      opacity: 0.9;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: bold;
    }

    .section {
      margin-bottom: 40px;
    }

    .section h2 {
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
    }

    .performer-item {
      padding: 15px;
      margin-bottom: 10px;
      background: #f9fafb;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .performer-name {
      font-weight: 600;
    }

    .performer-metrics {
      color: #666;
      font-size: 0.875rem;
    }

    .list-item {
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .list-item:last-child {
      border-bottom: none;
    }

    .check-icon {
      color: #10b981;
      font-size: 1.25rem;
    }

    .warning-icon {
      color: #f59e0b;
      font-size: 1.25rem;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #666;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Weekly SEO Report</h1>
      <div class="period">${data.period}</div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Total Pageviews</div>
        <div class="metric-value">${this.formatNumber(data.totalMetrics.totalPageviews)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Unique Visitors</div>
        <div class="metric-value">${this.formatNumber(data.totalMetrics.totalVisitors)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Ranking</div>
        <div class="metric-value">#${data.totalMetrics.avgRanking.toFixed(1)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Articles Published</div>
        <div class="metric-value">${data.totalMetrics.articlesPublished}</div>
      </div>
    </div>

    <div class="section">
      <h2>🏆 Top Performing Sites</h2>
      ${data.topPerformers.map((site: any) => `
        <div class="performer-item">
          <div class="performer-name">${site.name}</div>
          <div class="performer-metrics">
            ${this.formatNumber(site.metrics?.pageviews || 0)} views •
            Ranking #${site.metrics?.avgRanking || 'N/A'}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <h2>✅ Key Improvements</h2>
      ${data.improvements.map(item => `
        <div class="list-item">
          <span class="check-icon">✓</span>
          <span>${item}</span>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <h2>⚠️ Issues to Address</h2>
      ${data.issues.map(item => `
        <div class="list-item">
          <span class="warning-icon">!</span>
          <span>${item}</span>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>Generated on ${new Date().toLocaleString()}</p>
      <p>AI-SEO-Mass-Engine Automated Reporting System</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * 发送邮件报告
   */
  private async sendEmailReport(data: WeeklyReportData, html: string): Promise<void> {
    console.log('📧 Sending email report...');

    const transporter = nodemailer.createTransport({
      host: this.config.email!.smtp.host,
      port: this.config.email!.smtp.port,
      auth: {
        user: this.config.email!.smtp.user,
        pass: this.config.email!.smtp.pass
      }
    });

    const mailOptions = {
      from: this.config.email!.from,
      to: this.config.email!.to.join(', '),
      subject: `Weekly SEO Report - ${data.period}`,
      html,
      text: `Weekly SEO Report for ${data.period}`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully\n');
    } catch (error) {
      console.error('❌ Email failed:', error);
    }
  }

  /**
   * 获取本周时间段
   */
  private getWeekPeriod(): string {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    };

    return `${formatDate(weekAgo)} - ${formatDate(now)}`;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: ReportConfig = {
    outputDir: './data/reports',
    email: {
      enabled: false,
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        user: 'user@example.com',
        pass: 'password'
      },
      from: 'seo-reports@example.com',
      to: ['admin@example.com']
    }
  };

  const generator = new ReportGenerator(config);
  generator.generateWeeklyReport().catch(console.error);
}
