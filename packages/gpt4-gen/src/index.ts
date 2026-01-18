#!/usr/bin/env node

/**
 * GPT-4 Content Generation Module
 * GPT-4 内容生成模块 - 提供高质量AI文章生成
 */

import OpenAI from 'openai';

interface GPT4Config {
  apiKey: string;
  model?: 'gpt-4' | 'gpt-4-turbo' | 'gpt-4-turbo-preview';
  maxTokens?: number;
  temperature?: number;
}

interface ArticleMetadata {
  title: string;
  slug: string;
  excerpt: string;
  keywords: string[];
  category: string;
  readingTime: number;
  wordCount: number;
}

interface GeneratedArticle {
  metadata: ArticleMetadata;
  content: string;
  htmlContent: string;
}

export class GPT4Generator {
  private client: OpenAI;
  private config: Required<GPT4Config>;

  constructor(config: GPT4Config) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gpt-4-turbo-preview',
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey
    });
  }

  /**
   * 生成完整文章
   */
  async generateArticle(keyword: string, locale: string = 'en-US'): Promise<GeneratedArticle> {
    console.log(`🤖 Generating article with GPT-4 for: "${keyword}"\n`);

    const systemPrompt = this.getSystemPrompt(locale);
    const userPrompt = this.getUserPrompt(keyword, locale);

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    });

    const content = response.choices[0]?.message?.content || '';

    // 解析内容和元数据
    const article = this.parseArticle(content, keyword);

    console.log(`✅ Article generated successfully!`);
    console.log(`   Title: ${article.metadata.title}`);
    console.log(`   Word Count: ${article.metadata.wordCount}`);
    console.log(`   Reading Time: ${article.metadata.readingTime} min\n`);

    return article;
  }

  /**
   * 批量生成文章
   */
  async generateBatch(keywords: string[], locale: string = 'en-US'): Promise<GeneratedArticle[]> {
    console.log(`📦 Generating ${keywords.length} articles with GPT-4...\n`);

    const articles: GeneratedArticle[] = [];
    const startTime = Date.now();

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      console.log(`[${i + 1}/${keywords.length}] Processing: "${keyword}"`);

      try {
        const article = await this.generateArticle(keyword, locale);
        articles.push(article);

        // 添加延迟避免速率限制
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
   * 优化现有文章
   */
  async optimizeArticle(content: string, focus: 'seo' | 'readability' | 'engagement'): Promise<string> {
    console.log(`🔧 Optimizing article (focus: ${focus})...\n`);

    const optimizationPrompts = {
      seo: 'Optimize this article for SEO: improve keyword density, meta descriptions, headings structure, and add schema markup suggestions.',
      readability: 'Improve readability: simplify complex sentences, break up long paragraphs, improve flow and clarity.',
      engagement: 'Enhance engagement: add compelling hooks, improve storytelling, add call-to-actions, make content more memorable.'
    };

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert content editor specializing in high-quality web content.'
        },
        {
          role: 'user',
          content: `${optimizationPrompts[focus]}\n\nArticle:\n\n${content}`
        }
      ],
      max_tokens: this.config.maxTokens,
      temperature: 0.5
    });

    const optimized = response.choices[0]?.message?.content || content;

    console.log('✅ Article optimized successfully!\n');

    return optimized;
  }

  /**
   * 生成文章变体（A/B测试）
   */
  async generateVariation(originalArticle: string, variationType: 'tone' | 'structure' | 'length'): Promise<string> {
    console.log(`🔄 Generating article variation (${variationType})...\n`);

    const variationPrompts = {
      tone: 'Rewrite this article with a different tone (e.g., more conversational, more authoritative, or more casual).',
      structure: 'Restructure this article with a different organization or flow while keeping the same key information.',
      length: 'Rewrite this article to be significantly more detailed and comprehensive, adding examples and deeper analysis.'
    };

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert content writer who can create multiple effective variations of the same content.'
        },
        {
          role: 'user',
          content: `${variationPrompts[variationType]}\n\nOriginal Article:\n\n${originalArticle}`
        }
      ],
      max_tokens: this.config.maxTokens,
      temperature: 0.8
    });

    const variation = response.choices[0]?.message?.content || originalArticle;

    console.log('✅ Article variation generated!\n');

    return variation;
  }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(locale: string): string {
    const prompts: Record<string, string> = {
      'en-US': `You are an expert SEO content writer specializing in creating high-quality, engaging articles that rank well in search engines.

Your articles should:
- Be comprehensive, well-researched, and authoritative
- Include relevant keywords naturally
- Have clear structure with proper headings (H1, H2, H3)
- Be engaging and valuable to readers
- Include practical examples and actionable advice
- Be optimized for featured snippets
- Have proper meta descriptions and title tags

Format your response as:
---
METADATA
Title: [SEO-optimized title]
Slug: [URL-friendly slug]
Excerpt: [Compelling 150-char excerpt]
Keywords: [comma, separated, keywords]
Category: [content category]
---

[Full article content in markdown format]`,

      'zh-CN': `你是一位专业的SEO内容写作专家，擅长创作高质量、引人入胜的文章，能够在搜索引擎中获得良好排名。

你的文章应该：
- 全面、有深度、权威
- 自然地融入相关关键词
- 有清晰的结构和适当的标题（H1, H2, H3）
- 引人入胜，对读者有价值
- 包含实用的例子和可操作的建议
- 针对精选摘要进行优化
- 有恰当的元描述和标题标签

请按以下格式回复：
---
元数据
标题: [SEO优化的标题]
 Slug: [URL友好的slug]
摘要: [吸引人的150字摘要]
关键词: [逗号分隔的关键词]
分类: [内容分类]
---

[完整的markdown格式文章内容]`
    };

    return prompts[locale] || prompts['en-US'];
  }

  /**
   * 获取用户提示词
   */
  private getUserPrompt(keyword: string, locale: string): string {
    const prompts: Record<string, string> = {
      'en-US': `Write a comprehensive, SEO-optimized article about: "${keyword}"

Requirements:
- Minimum 1500 words
- Include an introduction, 5-7 main sections, and a conclusion
- Use bullet points, numbered lists, and tables where appropriate
- Include a FAQ section
- Add internal linking suggestions (marked as [Link: related topic])
- Suggest a meta title (60 chars max) and description (160 chars max)`,
      'zh-CN': `写一篇关于"${keyword}"的全面、SEO优化的文章

要求：
- 至少1500字
- 包括引言、5-7个主要章节和结论
- 适当使用项目符号、编号列表和表格
- 包括FAQ部分
- 添加内部链接建议（标记为 [链接: 相关主题]）
- 建议元标题（最多60个字符）和描述（最多160个字符）`
    };

    return prompts[locale] || prompts['en-US'];
  }

  /**
   * 解析文章内容
   */
  private parseArticle(content: string, keyword: string): GeneratedArticle {
    // 分离元数据和内容
    const parts = content.split('---');
    let metadata: any = {};
    let articleContent = content;

    if (parts.length >= 3) {
      // 提取元数据
      const metadataText = parts[1];
      const lines = metadataText.split('\n');

      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          metadata[key.toLowerCase()] = value.trim();
        }
      }

      // 提取文章内容
      articleContent = parts.slice(2).join('---').trim();
    }

    // 如果没有提取到元数据，使用默认值
    if (!metadata.title) {
      metadata.title = `Complete Guide to ${keyword}`;
    }
    if (!metadata.slug) {
      metadata.slug = keyword.toLowerCase().replace(/\s+/g, '-');
    }
    if (!metadata.excerpt) {
      metadata.excerpt = `Learn everything about ${keyword} in this comprehensive guide.`;
    }
    if (!metadata.keywords) {
      metadata.keywords = [keyword];
    }

    // 计算字数和阅读时间
    const wordCount = articleContent.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    return {
      metadata: {
        title: metadata.title,
        slug: metadata.slug,
        excerpt: metadata.excerpt,
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords : metadata.keywords.split(',').map((k: string) => k.trim()),
        category: metadata.category || 'General',
        readingTime,
        wordCount
      },
      content: articleContent,
      htmlContent: this.markdownToHtml(articleContent)
    };
  }

  /**
   * Markdown 转 HTML（简化版）
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(): Promise<void> {
    console.log('📊 GPT-4 Usage Statistics\n');
    console.log('To check your API usage:');
    console.log('1. Visit: https://platform.openai.com/usage');
    console.log('2. Review your current billing and usage\n');
    console.log('💡 Tips to reduce costs:');
    console.log('- Use gpt-4-turbo-preview for better performance/price ratio');
    console.log('- Implement caching for repeated requests');
    console.log('- Use lower temperature for deterministic outputs\n');
  }
}

// 导出工厂函数
export function createGPT4Generator(config: GPT4Config): GPT4Generator {
  return new GPT4Generator(config);
}

// CLI 演示
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = createGPT4Generator({
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
    model: 'gpt-4-turbo-preview',
    maxTokens: 4000,
    temperature: 0.7
  });

  console.log('🤖 GPT-4 Content Generator Demo\n');

  // 生成单篇文章
  generator.generateArticle('React Hooks', 'en-US')
    .then(article => {
      console.log('Generated Article:');
      console.log('Title:', article.metadata.title);
      console.log('Slug:', article.metadata.slug);
      console.log('Excerpt:', article.metadata.excerpt);
      console.log('Keywords:', article.metadata.keywords.join(', '));
      console.log('Category:', article.metadata.category);
      console.log('Reading Time:', article.metadata.readingTime, 'minutes');
      console.log('Word Count:', article.metadata.wordCount);
      console.log('\nPreview (first 500 chars):');
      console.log(article.content.substring(0, 500) + '...\n');
    })
    .catch(console.error);

  // 显示使用统计提示
  setTimeout(() => {
    generator.getUsageStats();
  }, 2000);
}
