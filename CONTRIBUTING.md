# 贡献指南 / Contributing Guide

感谢您对 AI-SEO-Mass-Engine 项目的关注！我们欢迎所有形式的贡献。

Thank you for your interest in AI-SEO-Mass-Engine! We welcome all forms of contribution.

---

## 🤝 如何贡献 / How to Contribute

### 报告 Bug / Report Bugs

如果您发现了 Bug，请：

If you found a bug, please:

1. 检查 [Issues](https://github.com/your-username/ai-seo-mass-engine/issues) 确保问题未被报告
   Check [Issues](https://github.com/your-username/ai-seo-mass-engine/issues) to ensure it hasn't been reported

2. 创建一个新 Issue，包含：
   Create a new issue with:
   - 清晰的标题 / Clear title
   - 详细的问题描述 / Detailed description
   - 复现步骤 / Steps to reproduce
   - 期望行为 vs 实际行为 / Expected vs actual behavior
   - 环境信息（Node 版本、操作系统等）/ Environment info (Node version, OS, etc.)
   - 相关日志或截图 / Relevant logs or screenshots

### 提交新功能 / Request Features

我们欢迎功能建议！请：

We welcome feature suggestions! Please:

1. 先检查 [Issues](https://github.com/your-username/ai-seo-mass-engine/issues)
   Check [Issues](https://github.com/your-username/ai-seo-mass-engine/issues) first

2. 创建 Feature Request，描述：
   Create a Feature Request describing:
   - 功能用途 / Use case
   - 实现建议 / Proposed implementation
   - 是否愿意自己实现 / Willingness to implement

### 提交代码 / Submit Code

#### 开发流程 / Development Workflow

1. **Fork 项目** / **Fork the repository**

   ```bash
   # 点击 GitHub 页面上的 "Fork" 按钮
   # Click the "Fork" button on GitHub
   ```

2. **克隆到本地** / **Clone locally**

   ```bash
   git clone https://github.com/your-username/ai-seo-mass-engine.git
   cd ai-seo-mass-engine
   ```

3. **安装依赖** / **Install dependencies**

   ```bash
   pnpm install
   ```

4. **创建特性分支** / **Create feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   # 或 / or
   git checkout -b fix/your-bug-fix
   ```

5. **进行开发** / **Make changes**

   - 遵循现有代码风格 / Follow existing code style
   - 添加必要的测试 / Add necessary tests
   - 更新相关文档 / Update relevant documentation

6. **测试您的更改** / **Test your changes**

   ```bash
   # 构建所有包 / Build all packages
   pnpm build

   # 运行测试 / Run tests
   pnpm test

   # 手动测试相关功能 / Manually test related features
   ```

7. **提交更改** / **Commit changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   # 或 / or
   git commit -m "fix: describe the bug fix"
   ```

   **提交信息规范 / Commit Message Convention:**

   - `feat:` 新功能 / New feature
   - `fix:` Bug 修复 / Bug fix
   - `docs:` 文档更新 / Documentation update
   - `style:` 代码格式（不影响功能）/ Code formatting (no functional change)
   - `refactor:` 代码重构 / Code refactoring
   - `test:` 测试相关 / Test related
   - `chore:` 构建/工具相关 / Build/tool related

8. **推送到您的 Fork** / **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

9. **创建 Pull Request** / **Create Pull Request**

   - 访问原仓库的 "Pull Requests" 页面
     Visit the original repository's "Pull Requests" page
   - 点击 "New Pull Request"
   - 选择您的分支 / Select your branch
   - 填写 PR 描述模板 / Fill in the PR description template
   - 等待 Code Review / Wait for code review

---

## 📋 Pull Request 检查清单 / Pull Request Checklist

提交 PR 前，请确保：

Before submitting a PR, please ensure:

- [ ] 代码通过 TypeScript 编译 / Code compiles with TypeScript
- [ ] 运行 `pnpm build` 成功 / `pnpm build` runs successfully
- [ ] 遵循项目代码风格 / Follows project code style
- [ ] 添加了必要的注释 / Added necessary comments
- [ ] 更新了相关文档 / Updated relevant documentation
- [ ] 提交信息清晰明确 / Commit message is clear and descriptive
- [ ] PR 描述详细说明了更改 / PR description explains changes in detail

---

## 🎨 代码规范 / Code Style

### TypeScript / JavaScript

- 使用 **TypeScript** 编写所有新代码
  Write all new code in **TypeScript**
- 使用 **ESLint** 进行代码检查
  Use **ESLint** for code linting
- 遵循现有项目的代码结构
  Follow existing project code structure
- 使用有意义的变量和函数名
  Use meaningful variable and function names

```typescript
// ✅ 好的例子 / Good example
export class ArticleGenerator {
  async generateArticle(keyword: string): Promise<Article> {
    // 实现逻辑 / Implementation
  }
}

// ❌ 不好的例子 / Bad example
export class AG {
  async gen(k: string) {
    // 实现逻辑 / Implementation
  }
}
```

### 文件组织 / File Organization

```
packages/your-package/
├── src/
│   ├── index.ts          # 主要导出 / Main exports
│   ├── types.ts          # 类型定义 / Type definitions
│   ├── utils.ts          # 工具函数 / Utility functions
│   └── config.ts         # 配置 / Configuration
├── package.json
├── tsconfig.json
└── README.md             # 包说明 / Package documentation
```

---

## 🧪 测试指南 / Testing Guide

### 运行测试 / Running Tests

```bash
# 运行所有测试 / Run all tests
pnpm test

# 运行特定包的测试 / Run specific package tests
pnpm --filter @seo-spy/package-name test

# 运行测试并查看覆盖率 / Run tests with coverage
pnpm test:coverage
```

### 编写测试 / Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { YourClass } from './index';

describe('YourClass', () => {
  it('should do something', () => {
    const instance = new YourClass();
    const result = instance.method();
    expect(result).toBe('expected value');
  });
});
```

---

## 📝 文档贡献 / Documentation Contributions

### 改进文档 / Improving Documentation

- 修复错别字和语法错误 / Fix typos and grammatical errors
- 添加更多示例 / Add more examples
- 改进现有说明的清晰度 / Improve clarity of existing descriptions
- 添加截图和图表 / Add screenshots and diagrams
- 翻译文档到其他语言 / Translate documentation to other languages

### 文档位置 / Documentation Locations

- **README.md** - 项目概览和快速开始 / Project overview and quick start
- **CONTRIBUTING.md** - 贡献指南（本文件）/ Contribution guide (this file)
- **SEO_LOG.md** - 开发日志 / Development log
- **packages/*/README.md** - 各包的详细文档 / Detailed package documentation

---

## 🌍 国际化 / Internationalization

我们支持多语言，欢迎贡献翻译：

We support multiple languages and welcome translation contributions:

- 简体中文 / Simplified Chinese (zh-CN)
- English (en-US)
- 日本語 / Japanese (ja-JP)
- 한국어 / Korean (ko-KR)
- Español (es-ES)
- Français (fr-FR)

翻译文件位置：

Translation files location:
```
packages/i18n/locales/
├── zh-CN.json
├── en-US.json
├── ja-JP.json
└── ...
```

---

## 🎯 优先贡献领域 / Priority Contribution Areas

我们特别欢迎以下贡献：

We especially welcome contributions in:

1. **新部署平台支持** / **New Deployment Platforms**
   - Netlify
   - AWS Amplify
   - GitHub Pages

2. **更多 AI 模型集成** / **More AI Model Integrations**
   - OpenAI GPT-4
   - Google Gemini
   - Cohere

3. **测试覆盖** / **Test Coverage**
   - 单元测试 / Unit tests
   - 集成测试 / Integration tests
   - E2E 测试 / E2E tests

4. **性能优化** / **Performance Optimization**
   - 构建速度 / Build speed
   - 运行时性能 / Runtime performance
   - 内存使用 / Memory usage

5. **文档改进** / **Documentation Improvements**
   - API 文档 / API documentation
   - 使用教程 / Usage tutorials
   - 视频教程 / Video tutorials

6. **新功能建议** / **New Feature Suggestions**
   - 查看 [Issues](https://github.com/your-username/ai-seo-mass-engine/issues) 中的 "enhancement" 标签
     Check "enhancement" label in [Issues](https://github.com/your-username/ai-seo-mass-engine/issues)

---

## 💬 社区 / Community

### 获取帮助 / Getting Help

- **GitHub Issues** - 报告问题和功能请求 / Report issues and feature requests
- **Discussions** - 问答和讨论 / Q&A and discussions

### 行为准则 / Code of Conduct

- 尊重所有贡献者 / Respect all contributors
- 使用友好和包容的语言 / Use friendly and inclusive language
- 接受建设性批评 / Accept constructive criticism
- 关注什么对社区最有利 / Focus on what is best for the community

---

## 📜 许可证 / License

通过贡献代码，您同意您的贡献将在与项目相同的 **MIT License** 下发布。

By contributing code, you agree that your contributions will be released under the same **MIT License** as the project.

---

## 🙏 致谢 / Acknowledgments

感谢所有贡献者的支持！

Thank you to all contributors for your support!

---

<div align="center">

**Happy Coding! / 编程愉快！**

**[⬆ Back to README](#readme)**

</div>
