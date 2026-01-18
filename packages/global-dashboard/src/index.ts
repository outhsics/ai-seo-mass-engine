#!/usr/bin/env node

/**
 * Global Dashboard Module
 * 全局控制面板 - 统一管理所有站群的控制台
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface DashboardConfig {
  outputDir: string;
  port: number;
}

interface ClusterData {
  sites: any[];
  totalMetrics: {
    totalSites: number;
    activeSites: number;
    totalPageviews: number;
    totalVisitors: number;
    avgRanking: number;
  };
  recentActivity: Activity[];
}

interface Activity {
  id: string;
  type: 'deploy' | 'article' | 'keyword' | 'error';
  message: string;
  timestamp: string;
  site?: string;
}

export class GlobalDashboard {
  private config: DashboardConfig;

  constructor(config: DashboardConfig) {
    this.config = config;
  }

  /**
   * 生成全局控制面板
   */
  async generateDashboard(): Promise<void> {
    console.log('🎛️  Generating global control dashboard...\n');

    const data = this.collectData();
    const html = this.generateHTML(data);

    const outputPath = join(process.cwd(), this.config.outputDir, 'index.html');
    mkdirSync(join(process.cwd(), this.config.outputDir), { recursive: true });
    writeFileSync(outputPath, html);

    console.log(`✅ Dashboard generated: ${outputPath}`);
    console.log(`   Open in browser: file://${outputPath}\n`);
  }

  /**
   * 收集数据
   */
  private collectData(): ClusterData {
    // 从站群配置加载数据
    const clusterConfigPath = join(process.cwd(), 'data/cluster-config.json');
    let sites = [];

    if (existsSync(clusterConfigPath)) {
      const config = JSON.parse(readFileSync(clusterConfigPath, 'utf-8'));
      sites = config.sites || [];
    }

    // 计算总指标
    const activeSites = sites.filter((s: any) => s.status === 'active');
    const totalPageviews = sites.reduce((sum: number, s: any) => sum + (s.metrics?.pageviews || 0), 0);
    const totalVisitors = sites.reduce((sum: number, s: any) => sum + (s.metrics?.uniqueVisitors || 0), 0);
    const avgRanking = activeSites.length > 0
      ? activeSites.reduce((sum: number, s: any) => sum + (s.metrics?.avgRanking || 100), 0) / activeSites.length
      : 0;

    // 生成模拟活动
    const recentActivity = this.generateRecentActivity(sites);

    return {
      sites,
      totalMetrics: {
        totalSites: sites.length,
        activeSites: activeSites.length,
        totalPageviews,
        totalVisitors,
        avgRanking
      },
      recentActivity
    };
  }

  /**
   * 生成最近活动
   */
  private generateRecentActivity(sites: any[]): Activity[] {
    const activities: Activity[] = [];
    const actions = ['deployed', 'published article', 'updated keywords', 'ranked #1'];
    const types: Activity['type'][] = ['deploy', 'article', 'keyword', 'article'];

    for (let i = 0; i < 10; i++) {
      const site = sites[Math.floor(Math.random() * sites.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];

      activities.push({
        id: `activity-${Date.now()}-${i}`,
        type,
        message: site ? `${site.name} ${action}` : `System ${action}`,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        site: site?.name
      });
    }

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * 生成 HTML
   */
  private generateHTML(data: ClusterData): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Cluster Control Panel</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
    }

    .dashboard {
      display: grid;
      grid-template-columns: 250px 1fr;
      min-height: 100vh;
    }

    .sidebar {
      background: #1e293b;
      padding: 20px;
      border-right: 1px solid #334155;
    }

    .sidebar h1 {
      font-size: 1.25rem;
      margin-bottom: 30px;
      color: #60a5fa;
    }

    .nav-item {
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .nav-item:hover, .nav-item.active {
      background: #334155;
      color: #60a5fa;
    }

    .main {
      padding: 30px;
      overflow-y: auto;
    }

    .header {
      margin-bottom: 30px;
    }

    .header h2 {
      font-size: 2rem;
      margin-bottom: 10px;
    }

    .header p {
      color: #94a3b8;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: #1e293b;
      padding: 25px;
      border-radius: 12px;
      border: 1px solid #334155;
      transition: transform 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      border-color: #60a5fa;
    }

    .metric-label {
      color: #94a3b8;
      font-size: 0.875rem;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: #60a5fa;
    }

    .metric-change {
      font-size: 0.875rem;
      margin-top: 5px;
    }

    .metric-change.positive { color: #10b981; }
    .metric-change.negative { color: #ef4444; }

    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
    }

    .panel {
      background: #1e293b;
      padding: 25px;
      border-radius: 12px;
      border: 1px solid #334155;
    }

    .panel-title {
      font-size: 1.25rem;
      margin-bottom: 20px;
      color: #e2e8f0;
    }

    .activity-item {
      padding: 15px 0;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .activity-icon.deploy { background: rgba(96, 165, 250, 0.2); }
    .activity-icon.article { background: rgba(16, 185, 129, 0.2); }
    .activity-icon.keyword { background: rgba(245, 158, 11, 0.2); }
    .activity-icon.error { background: rgba(239, 68, 68, 0.2); }

    .activity-content {
      flex: 1;
    }

    .activity-message {
      margin-bottom: 5px;
    }

    .activity-time {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #334155;
    }

    th {
      color: #94a3b8;
      font-weight: 600;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
    }

    .status-active {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .status-inactive {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }

    .status-error {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    @media (max-width: 1024px) {
      .dashboard {
        grid-template-columns: 1fr;
      }

      .sidebar {
        display: none;
      }

      .content-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <div class="sidebar">
      <h1>🚀 SEO Cluster</h1>
      <div class="nav-item active">📊 Dashboard</div>
      <div class="nav-item">🌐 Sites</div>
      <div class="nav-item">📝 Articles</div>
      <div class="nav-item">🔍 Keywords</div>
      <div class="nav-item">📈 Analytics</div>
      <div class="nav-item">⚙️ Settings</div>
    </div>

    <div class="main">
      <div class="header">
        <h2>Control Panel</h2>
        <p>Manage your entire SEO site cluster from one place</p>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Sites</div>
          <div class="metric-value">${data.totalMetrics.totalSites}</div>
          <div class="metric-change positive">${data.totalMetrics.activeSites} active</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Pageviews</div>
          <div class="metric-value">${this.formatNumber(data.totalMetrics.totalPageviews)}</div>
          <div class="metric-change positive">↑ 12.5%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Unique Visitors</div>
          <div class="metric-value">${this.formatNumber(data.totalMetrics.totalVisitors)}</div>
          <div class="metric-change positive">↑ 8.3%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Avg. Ranking</div>
          <div class="metric-value">#${data.totalMetrics.avgRanking.toFixed(1)}</div>
          <div class="metric-change positive">↓ 2.3 positions</div>
        </div>
      </div>

      <div class="content-grid">
        <div class="panel">
          <div class="panel-title">📊 Sites Overview</div>
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Status</th>
                <th>Pageviews</th>
                <th>Ranking</th>
              </tr>
            </thead>
            <tbody>
              ${data.sites.slice(0, 5).map((site: any) => `
                <tr>
                  <td>${site.name}</td>
                  <td><span class="status-badge status-${site.status}">${site.status}</span></td>
                  <td>${this.formatNumber(site.metrics?.pageviews || 0)}</td>
                  <td>#${site.metrics?.avgRanking || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="panel">
          <div class="panel-title">⚡ Recent Activity</div>
          ${data.recentActivity.slice(0, 6).map((activity: Activity) => `
            <div class="activity-item">
              <div class="activity-icon ${activity.type}">
                ${this.getActivityIcon(activity.type)}
              </div>
              <div class="activity-content">
                <div class="activity-message">${activity.message}</div>
                <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private getActivityIcon(type: string): string {
    switch (type) {
      case 'deploy':
        return '🚀';
      case 'article':
        return '📝';
      case 'keyword':
        return '🔍';
      case 'error':
        return '❌';
      default:
        return '📌';
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  }
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: DashboardConfig = {
    outputDir: './data/dashboard',
    port: 3000
  };

  const dashboard = new GlobalDashboard(config);
  dashboard.generateDashboard().catch(console.error);
}
