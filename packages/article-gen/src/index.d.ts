#!/usr/bin/env node
/**
 * Article Generator Module
 * 使用 Claude API 生成高质量 SEO 文章
 */
interface ArticleGenConfig {
    apiKey: string;
    model?: string;
    outputDir: string;
    keywords: KeywordInput[];
    template?: ArticleTemplate;
}
interface KeywordInput {
    keyword: string;
    volume: number;
    difficulty: number;
}
interface ArticleTemplate {
    minWords: number;
    includeCodeExamples: boolean;
    includeImages: boolean;
    tone: 'professional' | 'casual' | 'technical';
    language: 'zh-CN' | 'en-US';
}
interface GeneratedArticle {
    slug: string;
    title: string;
    content: string;
    frontmatter: {
        title: string;
        description: string;
        keywords: string[];
        date: string;
        author: string;
        tags: string[];
        seoScore: number;
    };
    metadata: {
        keyword: string;
        wordCount: number;
        generatedAt: string;
        model: string;
    };
}
export declare class ArticleGenerator {
    private client;
    private config;
    constructor(config: ArticleGenConfig);
    generateAll(): Promise<GeneratedArticle[]>;
    generateArticle(keywordData: KeywordInput): Promise<GeneratedArticle>;
    private getSystemPrompt;
    private buildPrompt;
    private parseArticle;
    private generateSlug;
    private countWords;
    private saveArticle;
    private generateIndex;
    private delay;
}
export {};
//# sourceMappingURL=index.d.ts.map