#!/usr/bin/env node
/**
 * Article Generator Module
 * 使用 Claude API 生成高质量 SEO 文章
 */
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
export class ArticleGenerator {
    client;
    config;
    constructor(config) {
        this.config = config;
        this.client = new Anthropic({
            apiKey: config.apiKey,
            dangerouslyAllowBrowser: false // 服务端使用
        });
    }
    async generateAll() {
        console.log('🤖 Starting article generation...');
        const articles = [];
        for (const keywordData of this.config.keywords) {
            try {
                const article = await this.generateArticle(keywordData);
                articles.push(article);
                await this.saveArticle(article);
                console.log(`✅ Generated: ${article.title}`);
                // 避免 API 限流
                await this.delay(1000);
            }
            catch (error) {
                console.error(`❌ Failed to generate article for "${keywordData.keyword}":`, error);
            }
        }
        // 生成索引文件
        await this.generateIndex(articles);
        console.log(`\n🎉 Generated ${articles.length} articles`);
        return articles;
    }
    async generateArticle(keywordData) {
        const prompt = this.buildPrompt(keywordData);
        const message = await this.client.messages.create({
            model: this.config.model || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            temperature: 0.7,
            system: this.getSystemPrompt(),
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });
        const content = message.content[0].type === 'text' ? message.content[0].text : '';
        return this.parseArticle(content, keywordData.keyword);
    }
    getSystemPrompt() {
        return `你是一位专业的技术作家和 SEO 专家。你的任务是创建高质量、深度且搜索引擎友好的技术文章。

要求：
1. 内容必须原创、准确、有价值
2. 包含实用的代码示例和最佳实践
3. 结构清晰，使用恰当的标题层级
4. 自然融入关键词，避免堆砌
5. 目标 SEO 评分：90+

输出格式（严格遵循）：
---
title: 文章标题
description: SEO 描述（150-160字符）
keywords: 关键词1, 关键词2, 关键词3
tags: 标签1, 标签2
seo_score: 预估SEO分数
---

# 文章内容（Markdown格式）`;
    }
    buildPrompt(keywordData) {
        const template = this.config.template || {
            minWords: 1500,
            includeCodeExamples: true,
            includeImages: true,
            tone: 'technical',
            language: 'zh-CN'
        };
        return `请围绕关键词"${keywordData.keyword}"撰写一篇深度技术文章。

要求：
- 字数：${template.minWords}+
- 包含代码示例：${template.includeCodeExamples ? '是' : '否'}
- 语气：${template.tone}
- 语言：${template.language}
- 目标受众：开发者和技术人员

文章结构：
1. 引人入胜的导语
2. 问题背景和重要性
3. 核心概念解析
4. 实战代码示例${template.includeCodeExamples ? '（至少3个）' : ''}
5. 最佳实践和注意事项
6. 总结和延伸阅读

关键词"${keywordData.keyword}"应自然出现在：
- 标题中
- 第一段中
- 至少2个H2/H3标题中
- 代码注释中
- 结论中`;
    }
    parseArticle(content, keyword) {
        const { data: frontmatter, content: markdown } = matter(content);
        const slug = this.generateSlug(frontmatter.title || keyword);
        const wordCount = this.countWords(markdown);
        return {
            slug,
            title: frontmatter.title || keyword,
            content: markdown,
            frontmatter: {
                title: frontmatter.title || keyword,
                description: frontmatter.description || '',
                keywords: frontmatter.keywords?.split(',').map((k) => k.trim()) || [keyword],
                date: frontmatter.date || new Date().toISOString().split('T')[0],
                author: frontmatter.author || 'AI Author',
                tags: frontmatter.tags?.split(',').map((t) => t.trim()) || [],
                seoScore: frontmatter.seo_score || 90
            },
            metadata: {
                keyword,
                wordCount,
                generatedAt: new Date().toISOString(),
                model: this.config.model || 'claude-3-5-sonnet-20241022'
            }
        };
    }
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    countWords(content) {
        // 移除代码块后统计字数
        const cleanContent = content.replace(/```[\s\S]*?```/g, '');
        return cleanContent.split(/\s+/).length;
    }
    async saveArticle(article) {
        const outputDir = join(process.cwd(), this.config.outputDir, 'articles');
        mkdirSync(outputDir, { recursive: true });
        const filePath = join(outputDir, `${article.slug}.md`);
        const fullContent = matter.stringify(article.content, article.frontmatter);
        writeFileSync(filePath, fullContent);
        console.log(`💾 Saved: ${filePath}`);
    }
    async generateIndex(articles) {
        const indexPath = join(process.cwd(), this.config.outputDir, 'index.json');
        writeFileSync(indexPath, JSON.stringify(articles, null, 2));
        console.log(`📇 Generated index: ${indexPath}`);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
        console.error('❌ ANTHROPIC_API_KEY environment variable is required');
        process.exit(1);
    }
    // 读取关键词文件
    const keywordsPath = join(process.cwd(), 'data/keywords/keywords-latest.json');
    let keywords = [];
    try {
        const data = readFileSync(keywordsPath, 'utf-8');
        keywords = JSON.parse(data).slice(0, 10); // 取前10个关键词测试
    }
    catch (error) {
        console.warn('⚠️  No keywords file found, using defaults');
        keywords = [
            { keyword: 'React useEffect 依赖报警告', volume: 5000, difficulty: 30 },
            { keyword: 'TypeScript 类型推断失败', volume: 3500, difficulty: 45 },
            { keyword: 'Astro SSG 构建优化', volume: 2000, difficulty: 25 }
        ];
    }
    const config = {
        apiKey,
        model: 'claude-3-5-sonnet-20241022',
        outputDir: './data',
        keywords,
        template: {
            minWords: 1500,
            includeCodeExamples: true,
            includeImages: true,
            tone: 'technical',
            language: 'zh-CN'
        }
    };
    const generator = new ArticleGenerator(config);
    generator.generateAll().catch(console.error);
}
//# sourceMappingURL=index.js.map