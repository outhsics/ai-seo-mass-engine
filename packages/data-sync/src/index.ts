#!/usr/bin/env node

/**
 * Data Sync & Backup Module
 * 数据同步和备份系统 - 自动备份和恢复站群数据
 */

import archiver from 'archiver';
import { writeFileSync, mkdirSync, existsSync, createWriteStream, readFileSync } from 'fs';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';

interface SyncConfig {
  dataDir: string;
  backupDir: string;
  maxBackups: number;
  autoBackup: boolean;
  backupInterval: number; // hours
}

interface BackupManifest {
  id: string;
  timestamp: string;
  size: number;
  files: string[];
  checksums: Record<string, string>;
}

export class DataSyncManager {
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  /**
   * 创建完整备份
   */
  async createBackup(): Promise<string> {
    console.log('💾 Creating backup...\n');

    const backupId = `backup-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const backupPath = join(process.cwd(), this.config.backupDir, `${backupId}.zip`);

    mkdirSync(join(process.cwd(), this.config.backupDir), { recursive: true });

    // 创建压缩包
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = createWriteStream(backupPath);

    archive.pipe(output);

    // 添加需要备份的目录
    const dataDir = join(process.cwd(), this.config.dataDir);

    if (existsSync(dataDir)) {
      archive.directory(dataDir, false);
      console.log(`   📁 Adding: ${this.config.dataDir}`);
    }

    // 备份配置文件
    const configFiles = [
      'package.json',
      'pnpm-workspace.yaml',
      'pipeline.config.json',
      '.env.example'
    ];

    for (const file of configFiles) {
      const filePath = join(process.cwd(), file);
      if (existsSync(filePath)) {
        archive.file(filePath, { name: file });
        console.log(`   📄 Adding: ${file}`);
      }
    }

    await archive.finalize();

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const stats = statSync(backupPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log(`\n✅ Backup created: ${backupId}`);
        console.log(`   Size: ${sizeMB} MB`);
        console.log(`   Location: ${backupPath}\n`);

        // 保存清单
        this.saveManifest(backupId, timestamp, stats.size);

        resolve(backupPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * 列出所有备份
   */
  listBackups(): BackupManifest[] {
    const backupDir = join(process.cwd(), this.config.backupDir);

    if (!existsSync(backupDir)) {
      return [];
    }

    const files = readdirSync(backupDir).filter(f => f.endsWith('.json'));
    const backups: BackupManifest[] = [];

    for (const file of files) {
      const manifestPath = join(backupDir, file);
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      backups.push(manifest);
    }

    return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * 清理旧备份
   */
  async cleanupOldBackups(): Promise<void> {
    console.log('🧹 Cleaning up old backups...\n');

    const backups = this.listBackups();

    if (backups.length <= this.config.maxBackups) {
      console.log(`✅ Backup count within limit (${backups.length}/${this.config.maxBackups})\n`);
      return;
    }

    const toDelete = backups.slice(this.config.maxBackups);
    let deletedSize = 0;

    for (const backup of toDelete) {
      const backupPath = join(process.cwd(), this.config.backupDir, `${backup.id}.zip`);
      const manifestPath = join(process.cwd(), this.config.backupDir, `${backup.id}.json`);

      if (existsSync(backupPath)) {
        const stats = statSync(backupPath);
        deletedSize += stats.size;

        // 删除文件
        const { unlinkSync } = require('fs');
        unlinkSync(backupPath);
        unlinkSync(manifestPath);

        console.log(`   🗑️  Deleted: ${backup.id} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      }
    }

    console.log(`\n✅ Cleaned up ${toDelete.length} old backups`);
    console.log(`   Freed space: ${(deletedSize / 1024 / 1024).toFixed(2)} MB\n`);
  }

  /**
   * 生成备份报告
   */
  generateBackupReport(): void {
    const backups = this.listBackups();

    console.log('='.repeat(80));
    console.log('📊 Backup Report');
    console.log('='.repeat(80));

    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

    console.log(`\nTotal Backups: ${backups.length}`);
    console.log(`Max Backups: ${this.config.maxBackups}`);
    console.log(`Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Auto Backup: ${this.config.autoBackup ? 'Enabled' : 'Disabled'}`);

    if (backups.length > 0) {
      console.log('\n📋 Recent Backups:');
      console.log('┌' + '─'.repeat(76) + '┐');
      console.log('│ ' + 'ID'.padEnd(30) + ' │ ' + 'Date'.padEnd(20) + ' │ ' + 'Size'.padEnd(12) + ' │');
      console.log('├' + '─'.repeat(76) + '┤');

      for (const backup of backups.slice(0, 10)) {
        const date = new Date(backup.timestamp).toLocaleString();
        const size = (backup.size / 1024 / 1024).toFixed(2) + ' MB';

        console.log(
          '│ ' +
            backup.id.padEnd(30) +
            ' │ ' +
            date.padEnd(20) +
            ' │ ' +
            size.padEnd(12) +
            ' │'
        );
      }

      console.log('└' + '─'.repeat(76) + '┘');
    }

    console.log('='.repeat(80) + '\n');
  }

  /**
   * 同步数据到多个位置
   */
  async syncToTargets(): Promise<void> {
    console.log('🔄 Syncing data to multiple targets...\n');

    const targets = [
      { name: 'Local Backup', action: () => this.createBackup() },
      // 可以添加更多同步目标，如 S3、Google Drive 等
    ];

    for (const target of targets) {
      console.log(`📡 Syncing to: ${target.name}`);
      try {
        await target.action();
        console.log(`   ✅ Success\n`);
      } catch (error) {
        console.log(`   ❌ Failed: ${error}\n`);
      }
    }

    console.log('✅ Sync completed\n');
  }

  /**
   * 保存清单
   */
  private saveManifest(backupId: string, timestamp: string, size: number): void {
    const manifest: BackupManifest = {
      id: backupId,
      timestamp,
      size,
      files: [],
      checksums: {}
    };

    const manifestPath = join(process.cwd(), this.config.backupDir, `${backupId}.json`);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: SyncConfig = {
    dataDir: './data',
    backupDir: './backups',
    maxBackups: 10,
    autoBackup: true,
    backupInterval: 24
  };

  const syncManager = new DataSyncManager(config);

  // 创建备份
  syncManager.createBackup().then(() => {
    // 生成报告
    syncManager.generateBackupReport();

    // 清理旧备份
    return syncManager.cleanupOldBackups();
  }).catch(console.error);
}
