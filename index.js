/**
 * UI Diff Tool - 主入口
 * 
 * UI设计稿与实际界面自动对比工具
 * 
 * 功能:
 * - 像素级对比设计稿与实际界面
 * - 支持蓝湖设计稿、本地图片、网页截图
 * - 生成可视化差异报告
 * - 生成 AI 可读的修复建议
 * 
 * @example
 * const { UIDiffEngine, ScreenshotCapture, ReportGenerator } = require('ui-diff-tool');
 * 
 * const engine = new UIDiffEngine({ outputDir: './output' });
 * const result = await engine.compare(designImage, actualImage);
 */

const { UIDiffEngine, DEVICE_PRESETS } = require('./lib/diff-engine');
const { ScreenshotCapture, DEVICE_MAP } = require('./lib/screenshot');
const { ReportGenerator } = require('./lib/report');
const { AIPromptGenerator } = require('./lib/ai-prompt');
const { LanhuIntegration, createLanhuConfig } = require('./lib/lanhu-integration');

/**
 * 快速对比函数
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 对比结果
 */
async function quickCompare(options) {
  const {
    design,
    actual,
    outputDir = './ui-diff-output',
    threshold = 0.1,
    viewport = { width: 375, height: 812 },
    device,
    generateReport = true,
    generateAIPrompt = true
  } = options;

  const engine = new UIDiffEngine({
    outputDir,
    threshold,
    viewport,
    device
  });

  try {
    // 获取图片
    const designImage = await engine.getImage(design, 'design');
    const actualImage = await engine.getImage(actual, 'actual');

    // 对比
    const result = await engine.compare(designImage, actualImage);

    // 生成报告
    if (generateReport) {
      const report = new ReportGenerator(outputDir);
      await report.generate(result);
    }

    // 生成 AI 提示
    if (generateAIPrompt) {
      const aiPrompt = new AIPromptGenerator();
      const prompt = await aiPrompt.generate(result);
      const fs = require('fs-extra');
      const path = require('path');
      await fs.writeFile(path.join(outputDir, 'ai-fix-prompt.md'), prompt);
    }

    return result;

  } finally {
    await engine.cleanup();
  }
}

/**
 * 批量对比函数
 * @param {Object} config - 配置对象
 * @returns {Promise<Array>} 对比结果数组
 */
async function batchCompare(config) {
  const {
    pages,
    outputDir = './ui-diff-output',
    threshold = 0.1,
    viewport,
    device
  } = config;

  const engine = new UIDiffEngine({
    outputDir,
    threshold,
    viewport,
    device
  });

  const results = [];
  const fs = require('fs-extra');
  const path = require('path');

  try {
    for (const page of pages) {
      const pageOutputDir = path.join(outputDir, page.name.replace(/[\/\\]/g, '-'));
      await fs.ensureDir(pageOutputDir);

      const pageEngine = new UIDiffEngine({
        ...engine,
        outputDir: pageOutputDir
      });

      const designImage = await pageEngine.getImage(page.design, 'design');
      const actualImage = await pageEngine.getImage(page.actual, 'actual');
      const result = await pageEngine.compare(designImage, actualImage);

      result.name = page.name;
      result.outputDir = pageOutputDir;
      results.push(result);

      // 生成单页报告
      const report = new ReportGenerator(pageOutputDir);
      await report.generate(result);
    }

    // 生成汇总报告
    const summaryReport = new ReportGenerator(outputDir);
    await summaryReport.generateSummary(results);

    // 生成批量 AI 提示
    const aiPrompt = new AIPromptGenerator();
    const batchPrompt = await aiPrompt.generateBatch(results);
    await fs.writeFile(path.join(outputDir, 'ai-batch-fix-prompt.md'), batchPrompt);

    return results;

  } finally {
    await engine.cleanup();
  }
}

module.exports = {
  // 核心类
  UIDiffEngine,
  ScreenshotCapture,
  ReportGenerator,
  AIPromptGenerator,
  LanhuIntegration,

  // 便捷函数
  quickCompare,
  batchCompare,
  createLanhuConfig,

  // 预设
  DEVICE_PRESETS,
  DEVICE_MAP
};
