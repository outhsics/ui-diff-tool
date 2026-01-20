/**
 * AI Prompt Generator - 生成 AI 可读的修复建议
 * 
 * 分析差异结果，生成详细的修复提示
 * 可直接发送给 Claude/GPT 进行自动修复
 */

const fs = require('fs-extra');
const path = require('path');

class AIPromptGenerator {
  constructor(options = {}) {
    this.language = options.language || 'zh-CN';
    this.includeImages = options.includeImages !== false;
  }

  /**
   * 生成 AI 修复提示
   * @param {Object} result - 对比结果
   * @returns {Promise<string>} Markdown 格式的提示词
   */
  async generate(result) {
    const prompt = this.renderPrompt(result);
    return prompt;
  }

  /**
   * 渲染提示词
   */
  renderPrompt(result) {
    const statusEmoji = result.diffPercentage <= 0.1 ? '✅' : '❌';
    const severity = this.getSeverityLevel(result.diffPercentage);

    return `# 🎨 UI 界面修复任务

## 📊 对比结果概览

| 指标 | 数值 |
|------|------|
| 状态 | ${statusEmoji} ${result.diffPercentage <= 0.1 ? '基本匹配' : '存在差异'} |
| 匹配度 | ${(result.similarity * 100).toFixed(1)}% |
| 差异比例 | ${(result.diffPercentage * 100).toFixed(2)}% |
| 差异像素 | ${result.diffPixels.toLocaleString()} px |
| 图片尺寸 | ${result.width} × ${result.height} |
| 严重程度 | ${severity.text} |

## 📁 相关文件

- 设计稿: \`${result.paths?.design || 'design.png'}\`
- 实际界面: \`${result.paths?.actual || 'actual.png'}\`
- 差异标注: \`${result.paths?.diff || 'diff.png'}\`

## 📍 差异区域分析

${this.renderDiffRegions(result.diffRegions)}

## 🔧 修复建议

${this.renderFixSuggestions(result)}

## 📝 修复任务清单

请按照以下步骤进行修复：

${this.renderTaskList(result)}

## 💡 AI 修复指令

请帮我修复界面与设计稿的差异。具体要求：

1. **查看差异图片** - 红色区域表示与设计稿不一致的地方
2. **定位问题代码** - 根据差异区域的位置，找到对应的 Vue/CSS 代码
3. **逐一修复** - 按照差异区域从上到下、从大到小的顺序修复
4. **验证修复** - 修复后重新截图对比，确保匹配度达到 95% 以上

### 常见问题修复模式

#### 间距问题
\`\`\`css
/* 检查 margin/padding 是否与设计稿一致 */
.element {
  margin: 16px;  /* 对照设计稿标注 */
  padding: 12px 16px;
}
\`\`\`

#### 字体问题
\`\`\`css
/* 检查字体大小、颜色、行高 */
.text {
  font-size: 14px;
  line-height: 1.5;
  color: #333333;
  font-weight: 500;
}
\`\`\`

#### 颜色问题
\`\`\`css
/* 使用设计稿中的精确颜色值 */
.button {
  background-color: #667eea;
  color: #ffffff;
}
\`\`\`

#### 尺寸问题
\`\`\`css
/* 检查宽高是否正确 */
.card {
  width: 343px;  /* 375 - 16*2 边距 */
  height: auto;
  border-radius: 12px;
}
\`\`\`

## 🎯 验收标准

- [ ] 差异比例 < 5%
- [ ] 主要差异区域全部修复
- [ ] 视觉效果与设计稿一致
- [ ] 不同设备尺寸下表现正常

---

> 💡 **提示**: 将此文件内容和差异图片一起发送给 AI，让 AI 帮你自动定位和修复问题代码。
`;
  }

  /**
   * 获取严重程度
   */
  getSeverityLevel(diffPercentage) {
    if (diffPercentage <= 0.05) {
      return { level: 'low', text: '🟢 轻微 (可接受)', color: 'green' };
    } else if (diffPercentage <= 0.15) {
      return { level: 'medium', text: '🟡 中等 (需要修复)', color: 'yellow' };
    } else if (diffPercentage <= 0.30) {
      return { level: 'high', text: '🟠 较高 (明显差异)', color: 'orange' };
    } else {
      return { level: 'critical', text: '🔴 严重 (需要重做)', color: 'red' };
    }
  }

  /**
   * 渲染差异区域
   */
  renderDiffRegions(regions) {
    if (!regions || regions.length === 0) {
      return '未检测到明显的差异区域。';
    }

    let content = `共检测到 **${regions.length}** 处差异区域：\n\n`;

    regions.slice(0, 10).forEach((region, index) => {
      const severity = region.severity > 0.5 ? '🔴 严重' : region.severity > 0.2 ? '🟡 中等' : '🟢 轻微';
      const position = this.describePosition(region);

      content += `### 区域 ${index + 1}: ${position}\n\n`;
      content += `- **位置**: (${region.x}, ${region.y})\n`;
      content += `- **大小**: ${region.width} × ${region.height} px\n`;
      content += `- **差异像素**: ${region.diffPixels} px\n`;
      content += `- **严重程度**: ${severity}\n`;
      content += `- **可能原因**: ${this.guessCause(region)}\n\n`;
    });

    if (regions.length > 10) {
      content += `\n> 还有 ${regions.length - 10} 处差异区域未列出...\n`;
    }

    return content;
  }

  /**
   * 描述位置
   */
  describePosition(region) {
    const positions = [];

    // 垂直位置
    if (region.y < 100) {
      positions.push('顶部');
    } else if (region.y < 300) {
      positions.push('上部');
    } else if (region.y < 500) {
      positions.push('中部');
    } else if (region.y < 700) {
      positions.push('下部');
    } else {
      positions.push('底部');
    }

    // 水平位置
    if (region.x < 100) {
      positions.push('左侧');
    } else if (region.x > 275) {
      positions.push('右侧');
    } else {
      positions.push('中间');
    }

    return positions.join('');
  }

  /**
   * 猜测差异原因
   */
  guessCause(region) {
    const causes = [];

    // 根据区域大小猜测
    if (region.width > 200 && region.height < 50) {
      causes.push('可能是文字行高或间距问题');
    }
    if (region.width < 50 && region.height < 50) {
      causes.push('可能是图标或小元素差异');
    }
    if (region.width > 300) {
      causes.push('可能是整体布局或背景差异');
    }

    // 根据位置猜测
    if (region.y < 50) {
      causes.push('可能是状态栏或导航栏差异');
    }
    if (region.y > 750) {
      causes.push('可能是底部导航或按钮差异');
    }

    return causes.length > 0 ? causes.join('；') : '需要查看具体差异图片分析';
  }

  /**
   * 渲染修复建议
   */
  renderFixSuggestions(result) {
    const suggestions = [];

    if (result.diffPercentage > 0.3) {
      suggestions.push('- 🔴 **整体布局差异较大**：建议对照设计稿重新检查页面结构');
    }

    if (result.diffRegions) {
      const topRegions = result.diffRegions.filter(r => r.y < 100);
      if (topRegions.length > 0) {
        suggestions.push('- 🟡 **顶部区域有差异**：检查导航栏、状态栏的样式');
      }

      const bottomRegions = result.diffRegions.filter(r => r.y > 700);
      if (bottomRegions.length > 0) {
        suggestions.push('- 🟡 **底部区域有差异**：检查底部导航、按钮的样式');
      }

      const largeRegions = result.diffRegions.filter(r => r.width > 200 && r.height > 100);
      if (largeRegions.length > 0) {
        suggestions.push('- 🟠 **存在大面积差异**：可能是背景色、卡片样式或图片问题');
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('- 🟢 差异较小，进行微调即可');
    }

    return suggestions.join('\n');
  }

  /**
   * 渲染任务清单
   */
  renderTaskList(result) {
    const tasks = [];

    tasks.push('1. [ ] 打开差异图片 `diff.png`，查看红色标注的差异区域');
    tasks.push('2. [ ] 对照设计稿 `design.png`，确认每个差异点的正确样式');

    if (result.diffRegions && result.diffRegions.length > 0) {
      result.diffRegions.slice(0, 5).forEach((region, index) => {
        const position = this.describePosition(region);
        tasks.push(`3.${index + 1}. [ ] 修复${position}区域 (${region.x}, ${region.y}) 的差异`);
      });
    }

    tasks.push(`${tasks.length + 1}. [ ] 重新运行对比，验证修复效果`);
    tasks.push(`${tasks.length + 1}. [ ] 确保匹配度达到 95% 以上`);

    return tasks.join('\n');
  }

  /**
   * 生成批量修复提示
   */
  async generateBatch(results) {
    let content = `# 🎨 UI 批量修复任务

## 📊 总体情况

- 总页面数: ${results.length}
- 通过: ${results.filter(r => r.diffPercentage <= 0.1).length}
- 需修复: ${results.filter(r => r.diffPercentage > 0.1).length}

## 📋 需要修复的页面

`;

    const needFix = results.filter(r => r.diffPercentage > 0.1);
    needFix.forEach((result, index) => {
      content += `### ${index + 1}. ${result.name}\n\n`;
      content += `- 匹配度: ${(result.similarity * 100).toFixed(1)}%\n`;
      content += `- 差异区域: ${result.diffRegions?.length || 0} 处\n`;
      content += `- 报告路径: \`${result.outputDir}/report.html\`\n\n`;
    });

    content += `
## 🔧 修复优先级

建议按照差异程度从高到低进行修复：

${needFix
  .sort((a, b) => b.diffPercentage - a.diffPercentage)
  .map((r, i) => `${i + 1}. **${r.name}** - 差异 ${(r.diffPercentage * 100).toFixed(1)}%`)
  .join('\n')}

---

请逐个页面进行修复，每修复完一个页面后重新运行对比验证。
`;

    return content;
  }
}

module.exports = { AIPromptGenerator };
