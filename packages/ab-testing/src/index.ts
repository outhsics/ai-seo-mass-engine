#!/usr/bin/env node

/**
 * A/B Testing Framework Module
 * A/B 测试框架 - 用于测试不同 SEO 策略的效果
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ABTestConfig {
  outputDir: string;
  siteUrl: string;
}

interface TestVariant {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
}

interface TestResult {
  variantId: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  winner?: boolean;
}

export class ABTestingFramework {
  private config: ABTestConfig;
  private tests: Map<string, ABTest> = new Map();

  constructor(config: ABTestConfig) {
    this.config = config;
  }

  /**
   * 创建新的 A/B 测试
   */
  createTest(
    name: string,
    description: string,
    variants: TestVariant[]
  ): string {
    const testId = `test-${Date.now()}`;

    const test: ABTest = {
      id: testId,
      name,
      description,
      status: 'active',
      variants,
      createdAt: new Date().toISOString(),
      results: variants.map(v => ({
        variantId: v.id,
        visitors: 0,
        conversions: 0,
        conversionRate: 0,
        confidence: 0
      }))
    };

    this.tests.set(testId, test);
    this.saveTest(test);

    console.log(`✅ A/B Test created: ${name} (${testId})`);
    console.log(`   Variants: ${variants.length}`);
    console.log(`   Status: ${test.status}\n`);

    return testId;
  }

  /**
   * 记录转化
   */
  recordConversion(testId: string, variantId: string): void {
    const test = this.tests.get(testId);
    if (!test) {
      console.error(`❌ Test not found: ${testId}`);
      return;
    }

    const result = test.results.find(r => r.variantId === variantId);
    if (!result) {
      console.error(`❌ Variant not found: ${variantId}`);
      return;
    }

    result.conversions++;
    result.conversionRate = (result.conversions / result.visitors) * 100;

    this.calculateConfidence(test);
    this.saveTest(test);

    console.log(`📈 Conversion recorded for ${variantId}`);
  }

  /**
   * 记录访问
   */
  recordVisitor(testId: string, variantId: string): void {
    const test = this.tests.get(testId);
    if (!test) return;

    const result = test.results.find(r => r.variantId === variantId);
    if (!result) return;

    result.visitors++;

    if (result.conversions > 0) {
      result.conversionRate = (result.conversions / result.visitors) * 100;
    }

    this.saveTest(test);
  }

  /**
   * 计算统计显著性
   */
  private calculateConfidence(test: ABTest): void {
    const control = test.results[0];
    if (!control) return;

    for (const result of test.results) {
      if (result.variantId === control.variantId) continue;

      // Z-test 计算置信度
      const p1 = control.conversions / control.visitors;
      const p2 = result.conversions / result.visitors;
      const n1 = control.visitors;
      const n2 = result.visitors;

      const pooledP = (control.conversions + result.conversions) / (n1 + n2);
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

      if (se > 0) {
        const z = (p2 - p1) / se;
        // 简化的置信度计算
        result.confidence = Math.min(99, Math.max(0, (Math.abs(z) / 2) * 100));
      }
    }

    // 标记胜者
    const sorted = [...test.results].sort((a, b) => b.conversionRate - a.conversionRate);
    if (sorted.length > 1 && sorted[0].confidence > 95) {
      sorted[0].winner = true;
    }
  }

  /**
   * 生成测试报告
   */
  generateReport(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) {
      console.error(`❌ Test not found: ${testId}`);
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log(`🧪 A/B Test Report: ${test.name}`);
    console.log('='.repeat(70));
    console.log(`\nDescription: ${test.description}`);
    console.log(`Status: ${test.status}`);
    console.log(`Created: ${test.createdAt}`);
    console.log(`\n📊 Results:`);

    console.log('\n┌' + '─'.repeat(66) + '┐');
    console.log('│ ' + 'Variant'.padEnd(20) + ' │ ' + 'Visitors'.padStart(10) + ' │ ' + 'Conversions'.padStart(12) + ' │ ' + 'Rate'.padStart(8) + ' │');
    console.log('├' + '─'.repeat(66) + '┤');

    for (const result of test.results) {
      const variant = test.variants.find(v => v.id === result.variantId);
      const winner = result.winner ? '🏆 ' : '';

      console.log(
        '│ ' +
        (winner + (variant?.name || result.variantId)).padEnd(20) +
        ' │ ' +
        result.visitors.toString().padStart(10) +
        ' │ ' +
        result.conversions.toString().padStart(12) +
        ' │ ' +
        result.conversionRate.toFixed(2) + '%'.padStart(7) +
        ' │'
      );
    }

    console.log('└' + '─'.repeat(66) + '┘');
    console.log('='.repeat(70) + '\n');
  }

  /**
   * 生成测试代码片段
   */
  generateCodeSnippet(testId: string): string {
    const test = this.tests.get(testId);
    if (!test) return '';

    const variantIds = test.variants.map(v => v.id);

    return `
<!-- A/B Test: ${test.name} -->
<script>
(function() {
  // 随机分配变体
  const variants = ${JSON.stringify(variantIds)};
  const variant = variants[Math.floor(Math.random() * variants.length)];

  // 记录访问
  fetch('${this.config.siteUrl}/api/ab-test/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testId: '${testId}',
      variant: variant,
      type: 'visit'
    })
  });

  // 存储变体信息
  localStorage.setItem('ab_test_${testId}', variant);

  // 根据变体应用不同的配置
  window.abTestVariant = variant;
})();
</script>
    `.trim();
  }

  /**
   * 保存测试
   */
  private saveTest(test: ABTest): void {
    const outputDir = join(process.cwd(), this.config.outputDir);
    mkdirSync(outputDir, { recursive: true });

    const filePath = join(outputDir, `${test.id}.json`);
    writeFileSync(filePath, JSON.stringify(test, null, 2));
  }

  /**
   * 加载测试
   */
  loadTest(testId: string): ABTest | null {
    const filePath = join(process.cwd(), this.config.outputDir, `${testId}.json`);

    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf-8');
      const test = JSON.parse(data);
      this.tests.set(testId, test);
      return test;
    }

    return null;
  }

  /**
   * 列出所有测试
   */
  listTests(): void {
    console.log('\n🧪 Active A/B Tests:');
    console.log('─'.repeat(70));

    for (const [id, test] of this.tests) {
      const totalVisitors = test.results.reduce((sum, r) => sum + r.visitors, 0);
      const totalConversions = test.results.reduce((sum, r) => sum + r.conversions, 0);

      console.log(`\nID: ${id}`);
      console.log(`Name: ${test.name}`);
      console.log(`Status: ${test.status}`);
      console.log(`Visitors: ${totalVisitors}`);
      console.log(`Conversions: ${totalConversions}`);
    }

    console.log('\n' + '─'.repeat(70) + '\n');
  }
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  variants: TestVariant[];
  createdAt: string;
  results: TestResult[];
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: ABTestConfig = {
    outputDir: './data/ab-tests',
    siteUrl: 'https://example.com'
  };

  const framework = new ABTestingFramework(config);

  // 示例：创建标题测试
  const titleTest = framework.createTest(
    'Homepage Title Test',
    '测试不同标题对点击率的影响',
    [
      {
        id: 'control',
        name: 'Control',
        description: 'Original title',
        config: { title: 'Welcome to SEO Site' }
      },
      {
        id: 'variant-a',
        name: 'Variant A',
        description: 'Benefit-focused title',
        config: { title: 'Boost Your SEO Ranking Today' }
      },
      {
        id: 'variant-b',
        name: 'Variant B',
        description: 'Question title',
        config: { title: 'Want Better SEO Results?' }
      }
    ]
  );

  // 模拟数据
  setTimeout(() => {
    framework.recordVisitor(titleTest, 'control');
    framework.recordVisitor(titleTest, 'variant-a');
    framework.recordVisitor(titleTest, 'variant-b');
    framework.recordConversion(titleTest, 'control');
    framework.recordConversion(titleTest, 'variant-a');

    framework.generateReport(titleTest);

    // 生成代码片段
    const snippet = framework.generateCodeSnippet(titleTest);
    console.log('📝 Code Snippet:');
    console.log(snippet);
  }, 100);
}
