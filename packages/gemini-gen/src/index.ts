#!/usr/bin/env node

/**
 * Google Gemini AI Content Generation Module
 * Google Gemini AI 内容生成模块
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiConfig {
  apiKey: string;
  model?: 'gemini-pro' | 'gemini-ultra';
  temperature?: number;
  maxTokens?: number;
}

interface ArticleMetadata {
  title: string;
  slug: string;
  excerpt: string;
  keywords: string[];
  category: string;
  readingTime: number;
}

interface GeneratedArticle {
  metadata: ArticleMetadata;
  content: string;
}

export class GeminiGenerator {
  private genAI: GoogleGenerativeAI;
  private config: Required<GeminiConfig>;

  constructor(config: GeminiConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gemini-pro',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096
    };

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
  }

  /**
   * 生成文章
   */
  async generateArticle(keyword: string, locale: string = 'en-US'): Promise<GeneratedArticle> {
    console.log(`🌟 Generating article with Google Gemini for: "${keyword}"\n`);

    const prompt = this.getGeneratePrompt(keyword, locale);
    const model = this.genAI.getGenerativeModel({ model: this.config.model });

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const article = this.parseArticle(text, keyword);

      console.log(`✅ Article generated successfully!`);
      console.log(`   Title: ${article.metadata.title}`);
      console.log(`   Word Count: ${article.content.length}\n`);

      return article;
    } catch (error: any) {
      console.error(`❌ Generation failed: ${error.message}\n`);
      throw error;
    }
  }

  /**
   * 批量生成
   */
  async generateBatch(keywords: string[], locale: string = 'en-US'): Promise<GeneratedArticle[]> {
    console.log(`📦 Generating ${keywords.length} articles with Gemini...\n`);

    const articles: GeneratedArticle[] = [];
    const startTime = Date.now();

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      console.log(`[${i + 1}/${keywords.length}] Processing: "${keyword}"`);

      try {
        const article = await this.generateArticle(keyword, locale);
        articles.push(article);

        // 延迟避免速率限制
        if (i < keywords.length - 1) {
          await this.sleep(1000);
        }
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}\n`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Batch generation completed!`);
    console.log(`   Generated: ${articles.length}/${keywords.length} articles`);
    console.log(`   Duration: ${duration}s\n`);

    return articles;
  }

  /**
   * 优化内容
   */
  async optimizeContent(content: string, focus: 'seo' | 'readability' | 'engagement'): Promise<string> {
    console.log(`🔧 Optimizing content (focus: ${focus})...\n`);

    const optimizationPrompts = {
      seo: 'Optimize this content for SEO: improve keyword usage, meta descriptions, headings structure, and add LSI keywords.',
      readability: 'Improve readability: simplify complex sentences, break up long paragraphs, improve flow and clarity.',
      engagement: 'Enhance engagement: add compelling hooks, improve storytelling, add call-to-actions, make content more memorable.'
    };

    const prompt = `${optimizationPrompts[focus]}\n\nContent:\n\n${content}`;
    const model = this.genAI.getGenerativeModel({ model: this.config.model });

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const optimized = response.text();

      console.log('✅ Content optimized successfully!\n');

      return optimized;
    } catch (error: any) {
      console.error(`❌ Optimization failed: ${error.message}\n`);
      return content;
    }
  }

  /**
   * 获取生成提示词
   */
  private getGeneratePrompt(keyword: string, locale: string): string {
    if (locale === 'zh-CN') {
      return `写一篇关于"${keyword}"的全面、SEO优化的文章。

要求：
- 至少1500字
- 包括引言、5-7个主要章节和结论
- 使用项目符号、编号列表和表格
- 包括FAQ部分
- 添加SEO元数据建议

请按以下格式输出：
---
# 标题

摘要: [文章摘要]

关键词: [关键词1, 关键词2, 关键词3]

分类: [文章分类]

## 正文内容

[完整的markdown格式文章内容]
---`;
    }

    return `Write a comprehensive, SEO-optimized article about: "${keyword}"

Requirements:
- Minimum 1500 words
- Include an introduction, 5-7 main sections, and a conclusion
- Use bullet points, numbered lists, and tables where appropriate
- Include an FAQ section
- Suggest a meta title (60 chars max) and description (160 chars max)

Please format your output as:
---
# Title

Summary: [Article summary]

Keywords: [keyword1, keyword2, keyword3]

Category: [article category]

## Body Content

[Full article in markdown format]
---`;
  }

  /**
   * 解析文章
   */
  private parseArticle(text: string, keyword: string): GeneratedArticle {
    // 提取元数据
    const metadata: ArticleMetadata = {
      title: `Complete Guide to ${keyword}`,
      slug: keyword.toLowerCase().replace(/\s+/g, '-'),
      excerpt: `Learn everything about ${keyword} in this comprehensive guide.`,
      keywords: [keyword],
      category: 'General',
      readingTime: 5
    };

    // 提取标题
    const titleMatch = text.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    }

    // 提取摘要
    const summaryMatch = text.match(/Summary:\s*(.+)$/m);
    if (summaryMatch) {
      metadata.excerpt = summaryMatch[1];
    }

    // 提取关键词
    const keywordsMatch = text.match(/Keywords:\s*(.+)$/m);
    if (keywordsMatch) {
      metadata.keywords = keywordsMatch[1].split(',').map(k => k.trim());
    }

    // 提取分类
    const categoryMatch = text.match(/Category:\s*(.+)$/m);
    if (categoryMatch) {
      metadata.category = categoryMatch[1];
    }

    // 提取正文内容
    let content = text;
    const bodyMatch = text.match(/##\s+Body Content\s*\n([\s\S]+)/);
    if (bodyMatch) {
      content = bodyMatch[1];
    }

    // 计算阅读时间
    const wordCount = content.split(/\s+/).length;
    metadata.readingTime = Math.ceil(wordCount / 200);

    return {
      metadata,
      content
    };
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 演示功能
   */
  demo(): void {
    console.log('🌟 Google Gemini AI Generator Demo\n');

    console.log('Features:');
    console.log('✅ Google Gemini Pro integration');
    console.log('✅ High-quality content generation');
    console.log('✅ Multilingual support');
    console.log('✅ SEO-optimized output');
    console.log('✅ Content optimization');
    console.log('✅ Batch generation\n');

    console.log('📝 Configuration:');
    console.log('{');
    console.log('  apiKey: "your-gemini-api-key",');
    console.log('  model: "gemini-pro" // or "gemini-ultra"');
    console.log('  temperature: 0.7,');
    console.log('  maxTokens: 4096');
    console.log('}\n');

    console.log('📚 Get API Key:');
    console.log('https://makersuite.google.com/app/apikey\n');

    console.log('💡 Gemini Models:');
    console.log('- gemini-pro: Versatile model for most tasks');
    console.log('- gemini-ultra: Most capable model (beta)\n');
  }
}

// 导出工厂函数
export function createGeminiGenerator(config: GeminiConfig): GeminiGenerator {
  return new GeminiGenerator(config);
}

// CLI 演示
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = createGeminiGenerator({
    apiKey: process.env.GEMINI_API_KEY || 'your-gemini-api-key',
    model: 'gemini-pro',
    temperature: 0.7,
    maxTokens: 4096
  });

  generator.demo();

  console.log('⚠️  Demo Mode: Showing simulated generation');
  console.log('💡 To enable real generation, configure Gemini API key\n');
}
