#!/usr/bin/env node

/**
 * AI Image Generation Module
 * 使用 DALL-E 生成 SEO 优化的文章配图
 */

import OpenAI from 'openai';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ImageGenConfig {
  apiKey: string;
  contentDir: string;
  outputDir: string;
  model: 'dall-e-2' | 'dall-e-3';
  size: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
  quality?: 'standard' | 'hd';
}

interface GeneratedImage {
  articleSlug: string;
  prompt: string;
  imagePath: string;
  url: string;
  revisedPrompt?: string;
}

export class ImageGenerator {
  private openai: OpenAI;
  private config: ImageGenConfig;

  constructor(config: ImageGenConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.apiKey
    });
  }

  /**
   * 为所有文章生成配图
   */
  async generateAllImages(): Promise<GeneratedImage[]> {
    console.log('🎨 Starting AI image generation...\n');

    const articles = this.loadArticles();
    const results: GeneratedImage[] = [];

    for (const article of articles) {
      try {
        console.log(`📝 Processing: ${article.title}`);

        const prompt = this.generatePrompt(article);
        console.log(`   Prompt: ${prompt}`);

        const imageData = await this.generateImage(prompt);

        const imagePath = await this.saveImage(article.slug, imageData);
        console.log(`   ✅ Saved: ${imagePath}`);

        results.push({
          articleSlug: article.slug,
          prompt,
          imagePath,
          url: imageData.url || '',
          revisedPrompt: imageData.revised_prompt
        });

        // 避免 API 限流
        await this.delay(2000);
      } catch (error) {
        console.error(`   ❌ Failed:`, error instanceof Error ? error.message : error);
      }
    }

    this.generateReport(results);
    return results;
  }

  /**
   * 加载文章元数据
   */
  private loadArticles(): ArticleMetadata[] {
    const { readdirSync, readFileSync } = require('fs');
    const articles: ArticleMetadata[] = [];

    const files = readdirSync(join(process.cwd(), this.config.contentDir))
      .filter((f: string) => f.endsWith('.md'));

    for (const file of files) {
      const content = readFileSync(join(process.cwd(), this.config.contentDir, file), 'utf-8');
      const metadata = this.parseFrontmatter(content);

      articles.push({
        slug: file.replace('.md', ''),
        title: metadata.title || '',
        description: metadata.description || '',
        keywords: metadata.keywords || [],
        tags: metadata.tags || []
      });
    }

    return articles;
  }

  /**
   * 生成 DALL-E 提示词
   */
  private generatePrompt(article: ArticleMetadata): string {
    const style = this.config.style || 'vivid';

    // 基于标题和关键词生成提示词
    let prompt = `Professional, modern ${style} illustration for a tech blog article about "${article.title}". `;

    // 添加技术主题元素
    if (article.keywords.some(k => k.includes('react'))) {
      prompt += 'Featuring React logo, blue color scheme, clean UI components. ';
    } else if (article.keywords.some(k => k.includes('typescript'))) {
      prompt += 'Featuring TypeScript blue logo, code snippets, modern development environment. ';
    } else if (article.keywords.some(k => k.includes('astro'))) {
      prompt += 'Featuring space theme, purple gradients, rocket ship, modern web development. ';
    } else if (article.keywords.some(k => k.includes('seo'))) {
      prompt += 'Featuring search optimization, analytics charts, growth graphs, clean design. ';
    } else {
      prompt += 'Clean, minimalist design with subtle tech elements. ';
    }

    prompt += `High quality, professional, suitable for blog header image. `;

    // 移除特殊字符
    return prompt.replace(/[^\w\s,.-]/g, ' ').trim();
  }

  /**
   * 调用 DALL-E API 生成图片
   */
  private async generateImage(prompt: string): Promise<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }> {
    const response = await this.openai.images.generate({
      model: this.config.model,
      prompt,
      n: 1,
      size: this.config.size,
      quality: this.config.quality || 'standard',
      style: this.config.style || 'vivid',
      response_format: 'b64_json'
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned from DALL-E');
    }

    const imageData = response.data[0];
    return imageData;
  }

  /**
   * 保存图片到本地
   */
  private async saveImage(slug: string, imageData: {
    b64_json?: string;
    url?: string;
  }): Promise<string> {
    const outputDir = join(process.cwd(), this.config.outputDir, 'images');
    mkdirSync(outputDir, { recursive: true });

    const filename = `${slug}.png`;
    const filePath = join(outputDir, filename);

    if (imageData.b64_json) {
      const buffer = Buffer.from(imageData.b64_json, 'base64');
      writeFileSync(filePath, buffer);
      return filePath;
    }

    throw new Error('No image data returned');
  }

  /**
   * 解析 frontmatter
   */
  private parseFrontmatter(content: string): any {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const frontmatter: any = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
      const m = line.match(/^(\w+):\s*(.+)$/);
      if (m) {
        const [, key, value] = m;
        if (key === 'tags' || key === 'keywords') {
          frontmatter[key] = value.split(',').map((v: string) => v.trim());
        } else {
          frontmatter[key] = value;
        }
      }
    }

    return frontmatter;
  }

  /**
   * 生成报告
   */
  private generateReport(results: GeneratedImage[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Image Generation Report');
    console.log('='.repeat(60));
    console.log(`\nTotal images generated: ${results.length}`);
    console.log(`Model: ${this.config.model}`);
    console.log(`Size: ${this.config.size}`);
    console.log(`Style: ${this.config.style || 'default'}`);
    console.log('\n' + '='.repeat(60) + '\n');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface ArticleMetadata {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  tags: string[];
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const apiKey = process.env.OPENAI_API_KEY || '';

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  const config: ImageGenConfig = {
    apiKey,
    contentDir: './packages/site-template/src/content/posts',
    outputDir: './packages/site-template/public',
    model: 'dall-e-3',
    size: '1024x1024',
    style: 'vivid',
    quality: 'standard'
  };

  const generator = new ImageGenerator(config);
  generator.generateAllImages().catch(console.error);
}
