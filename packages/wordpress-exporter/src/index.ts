#!/usr/bin/env node

/**
 * WordPress Export Module
 * WordPress XML 导出模块 - 生成 WordPress WXR 格式文件
 */

interface WordPressPost {
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  author: string;
  date: Date;
  categories: string[];
  tags: string[];
  featuredImage?: string;
  meta: Record<string, string>;
}

interface ExportConfig {
  siteUrl: string;
  siteName: string;
  siteDescription: string;
  author: string;
  language: string;
}

export class WordPressExporter {
  private config: ExportConfig;

  constructor(config: ExportConfig) {
    this.config = config;
  }

  /**
   * 导出文章为 WordPress WXR XML 格式
   */
  exportToWXR(posts: WordPressPost[]): string {
    console.log('📦 Generating WordPress WXR export...\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
  <channel>
    <title>${this.escapeXml(this.config.siteName)}</title>
    <link>${this.escapeXml(this.config.siteUrl)}</link>
    <description>${this.escapeXml(this.config.siteDescription)}</description>
    <language>${this.config.language}</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    <wp:base_site_url>${this.escapeXml(this.config.siteUrl)}</wp:base_site_url>
    <wp:base_blog_url>${this.escapeXml(this.config.siteUrl)}</wp:base_blog_url>

${this.generateAuthorsXml()}

${this.generateCategoriesXml(posts)}

${this.generateTagsXml(posts)}

${this.generatePostsXml(posts)}

  </channel>
</rss>`;

    console.log(`✅ Generated WXR export for ${posts.length} posts\n`);

    return xml;
  }

  /**
   * 生成作者 XML
   */
  private generateAuthorsXml(): string {
    return `    <wp:author>
      <wp:author_id>1</wp:author_id>
      <wp:author_login>${this.escapeXml(this.config.author)}</wp:author_login>
      <wp:author_email>admin@example.com</wp:author_email>
      <wp:author_display_name><![CDATA[${this.config.author}]]></wp:author_display_name>
      <wp:author_first_name>Admin</wp:author_first_name>
      <wp:author_last_name>User</wp:author_last_name>
    </wp:author>

`;
  }

  /**
   * 生成分类 XML
   */
  private generateCategoriesXml(posts: WordPressPost[]): string {
    const categories = new Set<string>();
    posts.forEach(post => post.categories.forEach(cat => categories.add(cat)));

    let xml = '';
    categories.forEach(category => {
      xml += `    <wp:category>
      <wp:term_id>${this.hashCode(category)}</wp:term_id>
      <wp:category_nicename>${this.escapeXml(category.toLowerCase().replace(/\s+/g, '-'))}</wp:category_nicename>
      <wp:category_parent></wp:category_parent>
      <cat_name><![CDATA[${category}]]></cat_name>
    </wp:category>

`;
    });

    return xml;
  }

  /**
   * 生成标签 XML
   */
  private generateTagsXml(posts: WordPressPost[]): string {
    const tags = new Set<string>();
    posts.forEach(post => post.tags.forEach(tag => tags.add(tag)));

    let xml = '';
    tags.forEach(tag => {
      xml += `    <wp:tag>
      <wp:term_id>${this.hashCode(tag)}</wp:term_id>
      <wp:tag_slug>${this.escapeXml(tag.toLowerCase().replace(/\s+/g, '-'))}</wp:tag_slug>
      <tag_name><![CDATA[${tag}]]></tag_name>
    </wp:tag>

`;
    });

    return xml;
  }

  /**
   * 生成文章 XML
   */
  private generatePostsXml(posts: WordPressPost[]): string {
    let xml = '';

    posts.forEach((post, index) => {
      const postId = index + 1;
      const dateStr = post.date.toISOString();
      const date = dateStr.split('T')[0];
      const time = dateStr.split('T')[1].substring(0, 8);

      xml += `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${this.config.siteUrl}/${post.slug}/</link>
      <pubDate>${post.date.toUTCString()}</pubDate>
      <dc:creator><![CDATA[${post.author}]]></dc:creator>
      <description><![CDATA[${post.excerpt}]]></description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <excerpt:encoded><![CDATA[${post.excerpt}]]></excerpt:encoded>
      <wp:post_id>${postId}</wp:post_id>
      <wp:post_date><![CDATA[${date} ${time}]]></wp:post_date>
      <wp:post_date_gmt><![CDATA[${date} ${time}]]></wp:post_date_gmt>
      <wp:post_modified><![CDATA[${date} ${time}]]></wp:post_modified>
      <wp:post_modified_gmt><![CDATA[${date} ${time}]]></wp:post_modified_gmt>
      <wp:comment_status><![CDATA[open]]></wp:comment_status>
      <wp:ping_status><![CDATA[open]]></wp:ping_status>
      <wp:post_name><![CDATA[${post.slug}]]></wp:post_name>
      <wp:status><![CDATA[publish]]></wp:status>
      <wp:post_parent>0</wp:post_parent>
      <wp:menu_order>0</wp:menu_order>
      <wp:post_type><![CDATA[post]]></wp:post_type>
      <wp:post_password><![CDATA[]]></wp:post_password>
      <wp:is_sticky>0</wp:is_sticky>

${this.generatePostCategoriesXml(post.categories)}

${this.generatePostTagsXml(post.tags)}

${this.generatePostMetaXml(post.meta)}

    </item>

`;
    });

    return xml;
  }

  /**
   * 生成文章分类 XML
   */
  private generatePostCategoriesXml(categories: string[]): string {
    let xml = '';
    categories.forEach(category => {
      xml += `      <category domain="category" nicename="${this.escapeXml(category.toLowerCase().replace(/\s+/g, '-'))}"><![CDATA[${category}]]></category>
`;
    });
    return xml;
  }

  /**
   * 生成文章标签 XML
   */
  private generatePostTagsXml(tags: string[]): string {
    let xml = '';
    tags.forEach(tag => {
      xml += `      <category domain="post_tag" nicename="${this.escapeXml(tag.toLowerCase().replace(/\s+/g, '-'))}"><![CDATA[${tag}]]></category>
`;
    });
    return xml;
  }

  /**
   * 生成文章元数据 XML
   */
  private generatePostMetaXml(meta: Record<string, string>): string {
    let xml = '';
    Object.entries(meta).forEach(([key, value]) => {
      xml += `      <wp:postmeta>
      <wp:meta_key><![CDATA[${key}]]></wp:meta_key>
      <wp:meta_value><![CDATA[${value}]]></wp:meta_value>
    </wp:postmeta>
`;
    });
    return xml;
  }

  /**
   * XML 转义
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 简单的哈希函数
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * 保存 WXR 文件
   */
  async saveToFile(posts: WordPressPost[], filepath: string): Promise<void> {
    const wxr = this.exportToWXR(posts);

    const { writeFileSync } = await import('fs');
    writeFileSync(filepath, wxr, 'utf-8');

    console.log(`✅ WXR file saved to: ${filepath}\n`);
  }

  /**
   * 从 JSON 文件导入文章数据
   */
  importFromJSON(jsonData: any): WordPressPost[] {
    console.log('📥 Importing articles from JSON...\n');

    const posts: WordPressPost[] = [];

    if (Array.isArray(jsonData)) {
      jsonData.forEach((item: any) => {
        posts.push(this.convertToWordPressPost(item));
      });
    } else if (jsonData.articles && Array.isArray(jsonData.articles)) {
      jsonData.articles.forEach((item: any) => {
        posts.push(this.convertToWordPressPost(item));
      });
    }

    console.log(`✅ Imported ${posts.length} posts\n`);

    return posts;
  }

  /**
   * 转换为 WordPress 文章格式
   */
  private convertToWordPressPost(item: any): WordPressPost {
    return {
      title: item.title || item.metadata?.title || 'Untitled',
      content: item.content || item.body || '',
      excerpt: item.excerpt || item.metadata?.excerpt || item.description || '',
      slug: item.slug || item.metadata?.slug || this.generateSlug(item.title),
      author: item.author || this.config.author,
      date: item.date ? new Date(item.date) : new Date(),
      categories: item.categories || item.metadata?.category ? [item.metadata.category] : ['Uncategorized'],
      tags: item.tags || item.metadata?.keywords || [],
      featuredImage: item.featuredImage || item.image,
      meta: item.meta || {}
    };
  }

  /**
   * 生成 URL slug
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * 导出示例
   */
  demoExport(): void {
    console.log('📋 WordPress Exporter Demo\n');

    const samplePosts: WordPressPost[] = [
      {
        title: 'Getting Started with React Hooks',
        content: '# Introduction\n\nReact Hooks are a powerful feature...',
        excerpt: 'Learn how to use React Hooks in your applications',
        slug: 'getting-started-with-react-hooks',
        author: 'SEO-Hacker',
        date: new Date(),
        categories: ['React', 'JavaScript'],
        tags: ['React', 'Hooks', 'Tutorial'],
        meta: {
          _yoast_wpseo_metadesc: 'Complete guide to React Hooks',
          _yoast_wpseo_focuskw: 'React Hooks'
        }
      },
      {
        title: 'TypeScript Best Practices',
        content: '# Why TypeScript\n\nTypeScript offers many benefits...',
        excerpt: 'Discover the best practices for TypeScript development',
        slug: 'typescript-best-practices',
        author: 'SEO-Hacker',
        date: new Date(),
        categories: ['TypeScript', 'Programming'],
        tags: ['TypeScript', 'Best Practices', 'JavaScript'],
        meta: {
          _yoast_wpseo_metadesc: 'TypeScript best practices guide',
          _yoast_wpseo_focuskw: 'TypeScript best practices'
        }
      }
    ];

    const wxr = this.exportToWXR(samplePosts);

    console.log('Generated WXR XML Preview (first 1000 chars):');
    console.log('='.repeat(80));
    console.log(wxr.substring(0, 1000) + '...\n');
    console.log('='.repeat(80) + '\n');

    console.log('📝 Notes:');
    console.log('1. The generated XML is compatible with WordPress Import Plugin');
    console.log('2. Import in WordPress: Tools → Import → WordPress');
    console.log('3. All posts, categories, tags, and meta data are preserved');
    console.log('4. Authors are mapped to WordPress user system\n');
  }
}

// 导出工厂函数
export function createWordPressExporter(config: ExportConfig): WordPressExporter {
  return new WordPressExporter(config);
}

// CLI 演示
if (import.meta.url === `file://${process.argv[1]}`) {
  const exporter = createWordPressExporter({
    siteUrl: 'https://my-site.com',
    siteName: 'My Tech Blog',
    siteDescription: 'A blog about technology and programming',
    author: 'SEO-Hacker',
    language: 'en-US'
  });

  exporter.demoExport();
}
