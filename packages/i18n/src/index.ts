#!/usr/bin/env node

/**
 * Internationalization (i18n) Module
 * 多语言支持系统 - 为站群提供多语言内容生成和管理
 */

interface LocaleConfig {
  defaultLocale: string;
  supportedLocales: string[];
  contentDir: string;
}

interface TranslationData {
  [key: string]: string | TranslationData;
}

export class I18nManager {
  private config: LocaleConfig;
  private translations: Map<string, TranslationData> = new Map();

  constructor(config: LocaleConfig) {
    this.config = config;
    this.loadTranslations();
  }

  /**
   * 翻译文本
   */
  translate(text: string, locale: string = this.config.defaultLocale): string {
    const localeTranslations = this.translations.get(locale);
    if (!localeTranslations) {
      console.warn(`⚠️  No translations found for locale: ${locale}`);
      return text;
    }

    const keys = text.split('.');
    let result: any = localeTranslations;

    for (const key of keys) {
      if (result && typeof result === 'object') {
        result = result[key];
      } else {
        return text; // 未找到翻译，返回原文
      }
    }

    return typeof result === 'string' ? result : text;
  }

  /**
   * 生成本地化内容
   */
  generateLocalizedContent(content: string, targetLocale: string): string {
    // 检测内容语言
    const detectedLocale = this.detectLanguage(content);

    if (detectedLocale === targetLocale) {
      return content; // 无需翻译
    }

    // 模拟翻译（实际应使用翻译 API）
    console.log(`🌐 Translating content from ${detectedLocale} to ${targetLocale}`);

    const translations: Record<string, Record<string, string>> = {
      'zh-CN': {
        'hello': '你好',
        'welcome': '欢迎',
        'article': '文章',
        'read more': '阅读更多'
      },
      'ja-JP': {
        'hello': 'こんにちは',
        'welcome': 'ようこそ',
        'article': '記事',
        'read more': 'もっと読む'
      },
      'ko-KR': {
        'hello': '안녕하세요',
        'welcome': '환영합니다',
        'article': '기사',
        'read more': '더 읽기'
      },
      'es-ES': {
        'hello': 'Hola',
        'welcome': 'Bienvenido',
        'article': 'Artículo',
        'read more': 'Leer más'
      },
      'fr-FR': {
        'hello': 'Bonjour',
        'welcome': 'Bienvenue',
        'article': 'Article',
        'read more': 'Lire plus'
      }
    };

    let translated = content;

    // 简单替换演示
    if (detectedLocale === 'zh-CN' && targetLocale === 'en-US') {
      translated = content
        .replace(/你好/g, 'Hello')
        .replace(/欢迎/g, 'Welcome')
        .replace(/文章/g, 'Article');
    }

    return translated;
  }

  /**
   * 生成本地化 URL
   */
  getLocalizedUrl(path: string, locale: string): string {
    if (locale === this.config.defaultLocale) {
      return path;
    }

    return `/${locale}${path}`;
  }

  /**
   * 获取所有支持的语言
   */
  getSupportedLocales(): string[] {
    return this.config.supportedLocales;
  }

  /**
   * 添加翻译
   */
  addTranslation(locale: string, key: string, value: string): void {
    let translations = this.translations.get(locale);

    if (!translations) {
      translations = {};
      this.translations.set(locale, translations);
    }

    const keys = key.split('.');
    let target: any = translations;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = value;
  }

  /**
   * 加载翻译文件
   */
  private loadTranslations(): void {
    // 加载默认翻译
    const defaultTranslations: TranslationData = {
      'site.title': 'SEO Site',
      'site.description': 'High-quality technical articles',
      'nav.home': 'Home',
      'nav.articles': 'Articles',
      'nav.about': 'About',
      'article.readMore': 'Read More',
      'article.publishedAt': 'Published at',
      'article.author': 'Author'
    };

    this.translations.set('en-US', defaultTranslations);

    // 加载中文翻译
    const zhTranslations: TranslationData = {
      'site.title': 'SEO 站点',
      'site.description': '高质量技术文章',
      'nav.home': '首页',
      'nav.articles': '文章',
      'nav.about': '关于',
      'article.readMore': '阅读更多',
      'article.publishedAt': '发布于',
      'article.author': '作者'
    };

    this.translations.set('zh-CN', zhTranslations);
  }

  /**
   * 检测语言
   */
  private detectLanguage(text: string): string {
    // 简单的语言检测（实际应使用专业库）
    const chineseRegex = /[\u4e00-\u9fa5]/;
    const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
    const koreanRegex = /[\uac00-\ud7af]/;

    if (chineseRegex.test(text)) return 'zh-CN';
    if (japaneseRegex.test(text)) return 'ja-JP';
    if (koreanRegex.test(text)) return 'ko-KR';

    return 'en-US'; // 默认英语
  }

  /**
   * 生成多语言站点地图
   */
  generateMultilingualSitemap(urls: string[]): Map<string, string[]> {
    const sitemap = new Map<string, string[]>();

    for (const url of urls) {
      for (const locale of this.config.supportedLocales) {
        const localizedUrl = this.getLocalizedUrl(url, locale);

        if (!sitemap.has(locale)) {
          sitemap.set(locale, []);
        }

        sitemap.get(locale)!.push(localizedUrl);
      }
    }

    return sitemap;
  }
}

// 导出实例工厂
export function createI18nManager(config?: Partial<LocaleConfig>): I18nManager {
  const defaultConfig: LocaleConfig = {
    defaultLocale: 'en-US',
    supportedLocales: ['en-US', 'zh-CN', 'ja-JP', 'ko-KR', 'es-ES', 'fr-FR'],
    contentDir: './data/content'
  };

  return new I18nManager({ ...defaultConfig, ...config });
}

// CLI 演示
if (import.meta.url === `file://${process.argv[1]}`) {
  const i18n = createI18nManager();

  console.log('🌐 i18n Demo\n');
  console.log('Supported Locales:', i18n.getSupportedLocales());
  console.log('');

  // 翻译测试
  const enText = 'site.title';
  console.log(`Original (en): ${i18n.translate(enText)}`);
  console.log(`Chinese (zh): ${i18n.translate(enText, 'zh-CN')}`);
  console.log('');

  // 本地化 URL
  const path = '/articles/react-hooks';
  console.log(`Default URL: ${i18n.getLocalizedUrl(path, 'en-US')}`);
  console.log(`Chinese URL: ${i18n.getLocalizedUrl(path, 'zh-CN')}`);
  console.log(`Japanese URL: ${i18n.getLocalizedUrl(path, 'ja-JP')}`);
  console.log('');

  // 内容翻译
  const content = '欢迎来到我们的站点';
  const translated = i18n.generateLocalizedContent(content, 'en-US');
  console.log(`Original: ${content}`);
  console.log(`Translated: ${translated}`);
}
