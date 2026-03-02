# 🎨 UI Diff Tool

**UI设计稿与实际界面自动对比工具** - 让 AI 帮你自动修复界面差异

## Recruiter Snapshot

- Status: `active`
- Positioning: frontend quality-assurance tool for design-to-implementation validation
- Core Value: reduce manual UI review by automated pixel diff and AI-readable fix prompts
- Stack: Node.js CLI, Playwright, pixelmatch, HTML report generation
- Delivery Signal: single-page and batch comparison workflows for engineering teams
- Last Reviewed: `2026-03-02`

## ✨ 功能特性

- 🔍 **像素级对比** - 使用 pixelmatch 进行精确的像素对比
- 🎯 **多源支持** - 支持蓝湖设计稿、本地图片、网页截图
- 📊 **可视化报告** - 生成美观的 HTML 差异报告
- 🤖 **AI 修复建议** - 自动生成 Claude/GPT 可读的修复提示
- 📱 **移动端适配** - 内置 iPhone、Android 等设备预设
- 🚀 **批量对比** - 支持一次对比多个页面
- 💾 **智能缓存** - 设计稿自动缓存，避免重复下载

## 🚀 快速开始

### 安装

```bash
cd tools/ui-diff
npm install

# 安装 Playwright 浏览器 (用于网页截图)
npx playwright install chromium
```

### 基础使用

#### 1. 单个页面对比

```bash
# 对比本地设计稿和网页
npx ui-diff compare -d ./design.png -a http://localhost:3000/page

# 对比两张本地图片
npx ui-diff compare -d ./design.png -a ./screenshot.png

# 指定设备和输出目录
npx ui-diff compare -d ./design.png -a http://localhost:3000 \
  --device iphone-14-pro \
  --output ./my-output
```

#### 2. 批量对比

```bash
# 初始化配置文件
npx ui-diff init

# 编辑 ui-diff.config.js，添加页面配置

# 运行批量对比
npx ui-diff batch -c ./ui-diff.config.js
```

#### 3. 截取页面截图

```bash
npx ui-diff capture -u http://localhost:3000 -o ./screenshot.png
```

## 📖 详细用法

### 命令行参数

#### compare 命令

```bash
npx ui-diff compare [options]

选项:
  -d, --design <path>      设计稿图片路径或URL
  -a, --actual <path>      实际界面图片路径或URL
  -o, --output <dir>       输出目录 (默认: ./ui-diff-output)
  -t, --threshold <n>      差异阈值 0-1 (默认: 0.1)
  --viewport <size>        视口大小 (默认: 375x812)
  --device <name>          设备预设 (iphone-12, iphone-14-pro 等)
  --wait <ms>              页面加载等待时间 (默认: 2000)
  --selector <css>         截图指定元素
  --full-page              全页面截图
  --ai-prompt              生成 AI 修复提示 (默认: true)
```

#### 支持的设备预设

| 设备 | 尺寸 | 缩放比例 |
|------|------|----------|
| iphone-12 | 375×812 | 3x |
| iphone-14-pro | 393×852 | 3x |
| iphone-14-pro-max | 430×932 | 3x |
| iphone-se | 375×667 | 2x |
| pixel-5 | 393×851 | 2.75x |
| samsung-s21 | 360×800 | 3x |

### 配置文件

创建 `ui-diff.config.js`:

```javascript
module.exports = {
  outputDir: './ui-diff-output',
  threshold: 0.1,
  viewport: 'iphone-12',
  baseUrl: 'http://localhost:3000',
  
  pages: [
    {
      name: '首页',
      design: './designs/home.png',
      actual: '/'
    },
    {
      name: '学习中心',
      design: './designs/learn.png',
      actual: '/pages/index/learn'
    }
  ]
};
```

### 编程接口

```javascript
const { quickCompare, batchCompare, UIDiffEngine } = require('./tools/ui-diff');

// 快速对比
const result = await quickCompare({
  design: './design.png',
  actual: 'http://localhost:3000',
  outputDir: './output'
});

console.log(`匹配度: ${result.similarity * 100}%`);

// 批量对比
const results = await batchCompare({
  pages: [
    { name: '首页', design: './home.png', actual: 'http://localhost:3000' },
    { name: '列表', design: './list.png', actual: 'http://localhost:3000/list' }
  ]
});
```

## 🤖 AI 自动修复工作流

1. **运行对比**
   ```bash
   npx ui-diff compare -d design.png -a http://localhost:3000/page
   ```

2. **查看输出文件**
   - `diff.png` - 差异标注图 (红色区域为差异)
   - `report.html` - 可视化报告
   - `ai-fix-prompt.md` - AI 修复提示

3. **发送给 AI**
   
   将 `ai-fix-prompt.md` 的内容和 `diff.png` 图片一起发送给 Claude:
   
   ```
   请帮我修复这个页面的 UI 差异。
   
   [粘贴 ai-fix-prompt.md 内容]
   [上传 diff.png 图片]
   ```

4. **AI 自动修复**
   
   Claude 会分析差异区域，定位问题代码，并提供修复方案。

5. **验证修复**
   ```bash
   # 修复后重新对比
   npx ui-diff compare -d design.png -a http://localhost:3000/page
   ```

## 📊 输出文件说明

```
ui-diff-output/
├── design.png          # 设计稿 (已对齐尺寸)
├── actual.png          # 实际界面截图
├── diff.png            # 差异标注图
├── report.html         # 可视化报告
├── ai-fix-prompt.md    # AI 修复提示
└── summary.html        # 批量对比汇总 (批量模式)
```

## 🔧 与蓝湖 MCP 集成

如果你已经配置了 lanhu-mcp 服务，可以直接使用蓝湖设计稿 URL:

```bash
# 使用蓝湖设计稿图片 URL
npx ui-diff compare \
  -d "https://alipic.lanhuapp.com/FigmaCoverxxx.png" \
  -a http://localhost:3000/page
```

## 🎯 最佳实践

### 1. 准备设计稿

- 从蓝湖下载 1x 或 2x 设计稿
- 确保设计稿尺寸与目标设备一致
- 建议使用 PNG 格式

### 2. 配置忽略区域

对于动态内容 (时间、头像等)，可以配置忽略:

```javascript
advanced: {
  ignoreRegions: [
    { x: 0, y: 0, width: 375, height: 44 }  // 状态栏
  ]
}
```

### 3. 处理登录页面

```javascript
{
  name: '个人中心',
  design: './user.png',
  actual: '/pages/index/user',
  options: {
    cookies: [
      { name: 'token', value: 'xxx', domain: 'localhost' }
    ]
  }
}
```

### 4. 差异阈值建议

| 场景 | 阈值 | 说明 |
|------|------|------|
| 严格对比 | 0.01-0.05 | 像素级精确匹配 |
| 常规对比 | 0.05-0.10 | 允许轻微差异 |
| 宽松对比 | 0.10-0.20 | 只关注明显差异 |

## 📝 常见问题

### Q: 截图与设计稿尺寸不一致怎么办？

工具会自动对齐尺寸，但建议:
- 设计稿使用与目标设备相同的尺寸
- 使用 `--device` 参数指定正确的设备

### Q: 如何处理滚动页面？

使用 `--full-page` 参数截取完整页面:

```bash
npx ui-diff compare -d design.png -a http://localhost:3000 --full-page
```

### Q: 页面加载不完整？

增加等待时间:

```bash
npx ui-diff compare -d design.png -a http://localhost:3000 --wait 5000
```

## 📄 License

MIT

---

Made with ❤️ for better UI development
