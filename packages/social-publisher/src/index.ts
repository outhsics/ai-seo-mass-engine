#!/usr/bin/env node

/**
 * Social Media Publisher Module
 * 社交媒体自动发布模块
 */

interface PostContent {
  title: string;
  url: string;
  excerpt: string;
  tags: string[];
  imageUrl?: string;
}

interface PlatformConfig {
  enabled: boolean;
  apiKey?: string;
  characterLimit?: number;
  hashtags?: boolean;
}

interface PublisherConfig {
  twitter?: PlatformConfig;
  linkedin?: PlatformConfig;
  facebook?: PlatformConfig;
}

interface PublishResult {
  platform: string;
  success: boolean;
  postUrl?: string;
  error?: string;
}

export class SocialPublisher {
  private config: PublisherConfig;

  constructor(config: PublisherConfig) {
    this.config = config;
  }

  /**
   * 发布到所有平台
   */
  async publishToAll(content: PostContent): Promise<PublishResult[]> {
    console.log('📱 Publishing to social media...\n');

    const results: PublishResult[] = [];

    if (this.config.twitter?.enabled) {
      const result = await this.publishToTwitter(content);
      results.push(result);
    }

    if (this.config.linkedin?.enabled) {
      const result = await this.publishToLinkedIn(content);
      results.push(result);
    }

    if (this.config.facebook?.enabled) {
      const result = await this.publishToFacebook(content);
      results.push(result);
    }

    return results;
  }

  /**
   * 发布到 Twitter
   */
  private async publishToTwitter(content: PostContent): Promise<PublishResult> {
    console.log('🐦 Publishing to Twitter...');

    const tweet = this.formatTweet(content, this.config.twitter?.characterLimit || 280);

    // 模拟发布（实际需要 Twitter API v2）
    console.log(`   Tweet: ${tweet}\n`);

    return {
      platform: 'Twitter',
      success: true,
      postUrl: 'https://twitter.com/user/status/123456789'
    };
  }

  /**
   * 发布到 LinkedIn
   */
  private async publishToLinkedIn(content: PostContent): Promise<PublishResult> {
    console.log('💼 Publishing to LinkedIn...');

    const post = this.formatLinkedInPost(content);

    // 模拟发布（实际需要 LinkedIn API）
    console.log(`   Post: ${post.substring(0, 100)}...\n`);

    return {
      platform: 'LinkedIn',
      success: true,
      postUrl: 'https://linkedin.com/feed/update/urn:li:activity:123456789'
    };
  }

  /**
   * 发布到 Facebook
   */
  private async publishToFacebook(content: PostContent): Promise<PublishResult> {
    console.log('👤 Publishing to Facebook...');

    const post = this.formatFacebookPost(content);

    // 模拟发布（实际需要 Facebook Graph API）
    console.log(`   Post: ${post.substring(0, 100)}...\n`);

    return {
      platform: 'Facebook',
      success: true,
      postUrl: 'https://facebook.com/user/posts/123456789'
    };
  }

  /**
   * 格式化 Tweet
   */
  private formatTweet(content: PostContent, limit: number): string {
    let tweet = '';

    // 标题
    tweet += content.title;

    // 链接
    const url = content.url;
    if (!tweet.includes(url)) {
      tweet += ` ${url}`;
    }

    // 标签
    if (this.config.twitter?.hashtags && content.tags.length > 0) {
      const hashtags = content.tags.slice(0, 3).map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ');
      tweet += ` ${hashtags}`;
    }

    // 截断到限制
    if (tweet.length > limit) {
      const ellipsis = '...';
      const availableLength = limit - url.length - ellipsis.length - 1;
      tweet = content.title.substring(0, availableLength) + ellipsis + ' ' + url;
    }

    return tweet;
  }

  /**
   * 格式化 LinkedIn 帖子
   */
  private formatLinkedInPost(content: PostContent): string {
    let post = '';

    post += `${content.title}\n\n`;
    post += `${content.excerpt}\n\n`;
    post += `Read more: ${content.url}\n\n`;

    if (content.tags.length > 0) {
      post += content.tags.map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ');
    }

    return post;
  }

  /**
   * 格式化 Facebook 帖子
   */
  private formatFacebookPost(content: PostContent): string {
    let post = '';

    post += `${content.title}\n\n`;
    post += `${content.excerpt}\n\n`;
    post += content.url;

    return post;
  }

  /**
   * 批量发布
   */
  async publishBatch(contents: PostContent[]): Promise<Map<PostContent, PublishResult[]>> {
    console.log(`📦 Batch publishing ${contents.length} posts...\n`);

    const results = new Map<PostContent, PublishResult[]>();

    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      console.log(`[${i + 1}/${contents.length}] Publishing: "${content.title}"`);

      try {
        const publishResults = await this.publishToAll(content);
        results.set(content, publishResults);

        // 延迟避免速率限制
        if (i < contents.length - 1) {
          await this.sleep(2000);
        }
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}\n`);
        results.set(content, []);
      }
    }

    console.log('✅ Batch publishing completed!\n');

    return results;
  }

  /**
   * 生成发布报告
   */
  generateReport(results: Map<PostContent, PublishResult[]>): void {
    console.log('📊 Publishing Report\n');
    console.log('='.repeat(80));

    let totalPosts = 0;
    let successful = 0;
    let failed = 0;

    results.forEach((publishResults, content) => {
      totalPosts++;
      const successCount = publishResults.filter(r => r.success).length;

      if (successCount > 0) {
        successful++;
      } else {
        failed++;
      }

      console.log(`\n📝 "${content.title}"`);
      publishResults.forEach(result => {
        console.log(`   ${result.platform}: ${result.success ? '✅ Success' : '❌ Failed'}`);
        if (result.postUrl) {
          console.log(`   URL: ${result.postUrl}`);
        }
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal: ${totalPosts} posts`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`\nSuccess Rate: ${((successful / totalPosts) * 100).toFixed(1)}%\n`);
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
    console.log('📱 Social Publisher Demo\n');

    const samplePosts: PostContent[] = [
      {
        title: 'Getting Started with React Hooks',
        url: 'https://myblog.com/react-hooks',
        excerpt: 'Learn the fundamentals of React Hooks and how to use them effectively.',
        tags: ['React', 'JavaScript', 'WebDev'],
        imageUrl: 'https://myblog.com/images/react-hooks.png'
      },
      {
        title: 'TypeScript Best Practices',
        url: 'https://myblog.com/typescript-best-practices',
        excerpt: 'Discover the best practices for writing clean and maintainable TypeScript code.',
        tags: ['TypeScript', 'Programming', 'WebDev'],
        imageUrl: 'https://myblog.com/images/typescript.png'
      }
    ];

    console.log('Sample Posts to Publish:\n');
    samplePosts.forEach((post, i) => {
      console.log(`${i + 1}. ${post.title}`);
      console.log(`   URL: ${post.url}`);
      console.log(`   Tags: ${post.tags.join(', ')}\n`);
    });

    console.log('📝 Notes:');
    console.log('1. Configure API keys in environment variables:');
    console.log('   - TWITTER_API_KEY & TWITTER_API_SECRET');
    console.log('   - LINKEDIN_ACCESS_TOKEN');
    console.log('   - FACEBOOK_ACCESS_TOKEN');
    console.log('2. Each platform requires OAuth authentication');
    console.log('3. Rate limits apply (check each platform\'s documentation)');
    console.log('4. Images should be hosted publicly\n');
  }
}

// 导出工厂函数
export function createSocialPublisher(config: PublisherConfig): SocialPublisher {
  return new SocialPublisher(config);
}

// CLI 演示
if (import.meta.url === `file://${process.argv[1]}`) {
  const publisher = createSocialPublisher({
    twitter: { enabled: true, characterLimit: 280, hashtags: true },
    linkedin: { enabled: true },
    facebook: { enabled: true }
  });

  publisher.demo();

  console.log('⚠️  Demo Mode: No actual posts will be published');
  console.log('💡 To enable actual publishing, configure API keys and remove demo mode\n');
}
