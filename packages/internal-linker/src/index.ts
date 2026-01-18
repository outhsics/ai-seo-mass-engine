#!/usr/bin/env node

/**
 * Internal Link Automation Module
 * 自动化内链系统 - 智能分析文章内容并插入相关内链
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface LinkConfig {
  contentDir: string;
  maxLinksPerArticle: number;
  minWordDistance: number;
  sameDomainOnly: boolean;
  excludeKeywords: string[];
}

interface LinkOpportunity {
  keyword: string;
  targetUrl: string;
  position: number;
  context: string;
  relevanceScore: number;
}

interface Article {
  slug: string;
  title: string;
  content: string;
  keywords: string[];
  url: string;
}

export class InternalLinker {
  private config: LinkConfig;
  private articles: Map<string, Article> = new Map();

  constructor(config: LinkConfig) {
    this.config = config;
  }

  /**
   * 扫描并加载所有文章
   */
  async loadArticles(): Promise<void> {
    console.log('📂 Scanning articles...');

    const contentPath = join(process.cwd(), this.config.contentDir);
    const files = readdirSync(contentPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = join(contentPath, file);
      const content = readFileSync(filePath, 'utf-8');

      // 解析 frontmatter 和内容
      const { frontmatter, markdown } = this.parseMarkdown(content);

      const article: Article = {
        slug: file.replace('.md', ''),
        title: frontmatter.title || '',
        content: markdown,
        keywords: frontmatter.keywords || [],
        url: `/articles/${file.replace('.md', '')}/`
      };

      this.articles.set(article.slug, article);
    }

    console.log(`✅ Loaded ${this.articles.size} articles`);
  }

  /**
   * 为所有文章生成内链
   */
  async generateInternalLinks(): Promise<void> {
    console.log('🔗 Generating internal links...\n');

    const results: Map<string, { added: number; links: string[] }> = new Map();

    for (const [slug, article] of this.articles) {
      const linkOpportunities = this.findLinkOpportunities(article);
      const updatedContent = this.insertLinks(article.content, linkOpportunities);

      // 保存更新后的内容
      const filePath = join(process.cwd(), this.config.contentDir, `${slug}.md`);
      const originalContent = readFileSync(filePath, 'utf-8');

      if (originalContent !== updatedContent) {
        // 保留 frontmatter
        const frontmatterMatch = originalContent.match(/^---\n[\s\S]*?\n---/);
        const frontmatter = frontmatterMatch ? frontmatterMatch[0] : '';
        writeFileSync(filePath, frontmatter + '\n' + updatedContent);

        results.set(slug, {
          added: linkOpportunities.length,
          links: linkOpportunities.map(l => `${l.keyword} → ${l.targetUrl}`)
        });

        console.log(`  ✓ ${article.title}: +${linkOpportunities.length} links`);
      }
    }

    this.generateReport(results);
  }

  /**
   * 查找内链机会
   */
  private findLinkOpportunities(article: Article): LinkOpportunity[] {
    const opportunities: LinkOpportunity[] = [];

    for (const [targetSlug, targetArticle] of this.articles) {
      // 跳过自己
      if (targetSlug === article.slug) continue;

      // 检查关键词匹配
      for (const keyword of targetArticle.keywords) {
        if (this.config.excludeKeywords.includes(keyword)) continue;

        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        let match;
        let count = 0;

        while ((match = regex.exec(article.content)) !== null) {
          if (count >= this.config.maxLinksPerArticle) break;

          // 检查上下文，确保不是已经有链接的内容
          const before = article.content.substring(Math.max(0, match.index - 50), match.index);
          const after = article.content.substring(match.index, match.index + keyword.length + 50);

          // 避免在已有的链接中插入
          if (before.includes('[') || after.includes('](')) {
            continue;
          }

          opportunities.push({
            keyword,
            targetUrl: targetArticle.url,
            position: match.index,
            context: (before + keyword + after).substring(0, 100),
            relevanceScore: this.calculateRelevance(article, targetArticle)
          });

          count++;
        }
      }
    }

    // 按相关性排序并限制数量
    return opportunities
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, this.config.maxLinksPerArticle);
  }

  /**
   * 计算两篇文章的相关性
   */
  private calculateRelevance(article1: Article, article2: Article): number {
    let score = 0;

    // 关键词重叠度
    const commonKeywords = article1.keywords.filter(k => article2.keywords.includes(k));
    score += commonKeywords.length * 10;

    // 标题相似度
    const words1 = article1.title.toLowerCase().split(/\s+/);
    const words2 = article2.title.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    score += commonWords.length * 5;

    return score;
  }

  /**
   * 在内容中插入链接
   */
  private insertLinks(content: string, opportunities: LinkOpportunity[]): string {
    let updated = content;
    let offset = 0;

    // 按位置排序，从后往前插入，避免位置偏移
    const sorted = [...opportunities].sort((a, b) => b.position - a.position);

    for (const opp of sorted) {
      const position = opp.position + offset;
      const link = `[${opp.keyword}](${opp.targetUrl})`;

      updated =
        updated.substring(0, position) +
        link +
        updated.substring(position + opp.keyword.length);

      offset += link.length - opp.keyword.length;
    }

    return updated;
  }

  /**
   * 解析 Markdown 文件
   */
  private parseMarkdown(content: string): { frontmatter: any; markdown: string } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      return { frontmatter: {}, markdown: content };
    }

    const frontmatterStr = frontmatterMatch[1];
    const markdown = content.substring(frontmatterMatch[0].length);

    // 简单的 YAML 解析
    const frontmatter: any = {};
    const lines = frontmatterStr.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (key === 'tags' || key === 'keywords') {
          frontmatter[key] = value.split(',').map((v: string) => v.trim());
        } else {
          frontmatter[key] = value;
        }
      }
    }

    return { frontmatter, markdown: markdown.trim() };
  }

  /**
   * 生成报告
   */
  private generateReport(results: Map<string, { added: number; links: string[] }>): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Internal Link Generation Report');
    console.log('='.repeat(60));

    let totalLinks = 0;
    for (const [slug, { added, links }] of results) {
      console.log(`\n📝 ${slug}`);
      console.log(`   Added: ${added} links`);
      links.forEach(link => console.log(`   - ${link}`));
      totalLinks += added;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Total internal links added: ${totalLinks}`);
    console.log('='.repeat(60) + '\n');
  }
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: LinkConfig = {
    contentDir: './packages/site-template/src/content/posts',
    maxLinksPerArticle: 5,
    minWordDistance: 100,
    sameDomainOnly: true,
    excludeKeywords: ['的', '是', '在', '和', '与', '或', '了']
  };

  const linker = new InternalLinker(config);

  linker.loadArticles()
    .then(() => linker.generateInternalLinks())
    .catch(console.error);
}
