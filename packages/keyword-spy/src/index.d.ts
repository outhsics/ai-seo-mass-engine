#!/usr/bin/env node
/**
 * Keyword Spy Module
 * 自动爬取并分析 SEO 关键词
 */
interface KeywordSpyConfig {
    sources: KeywordSource[];
    outputDir: string;
    maxKeywords: number;
    minVolume: number;
    niches: string[];
}
interface KeywordSource {
    type: 'google' | 'baidu' | 'bing' | 'custom';
    url?: string;
    enabled: boolean;
}
interface KeywordData {
    keyword: string;
    volume: number;
    difficulty: number;
    cpc: number;
    trend: number;
    source: string;
    scrapedAt: Date;
}
export declare class KeywordSpy {
    private config;
    private scraper;
    private analyzer;
    constructor(config: KeywordSpyConfig);
    execute(): Promise<KeywordData[]>;
    private scrapeNiche;
    private saveResults;
    private toCSV;
}
export declare class KeywordScraper {
    private config;
    constructor(config: KeywordSpyConfig);
    scrape(source: KeywordSource, niche: string): Promise<KeywordData[]>;
    private scrapeGoogleSuggestions;
    private scrapeCustomUrl;
}
export declare class KeywordAnalyzer {
    analyze(keywords: KeywordData[]): Promise<KeywordData[]>;
    rankByPotential(keywords: KeywordData[]): KeywordData[];
}
export {};
//# sourceMappingURL=index.d.ts.map