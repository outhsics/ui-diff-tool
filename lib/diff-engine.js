/**
 * UI Diff Engine - 核心对比引擎
 * 
 * 使用 pixelmatch 进行像素级对比
 * 支持多种图片来源：本地文件、URL、蓝湖设计稿
 */

const fs = require('fs-extra');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const sharp = require('sharp');
const { ScreenshotCapture } = require('./screenshot');

// 设备预设
const DEVICE_PRESETS = {
  'iphone-12': { width: 375, height: 812, deviceScaleFactor: 3 },
  'iphone-12-pro': { width: 390, height: 844, deviceScaleFactor: 3 },
  'iphone-12-pro-max': { width: 428, height: 926, deviceScaleFactor: 3 },
  'iphone-13': { width: 390, height: 844, deviceScaleFactor: 3 },
  'iphone-13-pro': { width: 390, height: 844, deviceScaleFactor: 3 },
  'iphone-13-pro-max': { width: 428, height: 926, deviceScaleFactor: 3 },
  'iphone-14': { width: 390, height: 844, deviceScaleFactor: 3 },
  'iphone-14-pro': { width: 393, height: 852, deviceScaleFactor: 3 },
  'iphone-14-pro-max': { width: 430, height: 932, deviceScaleFactor: 3 },
  'iphone-se': { width: 375, height: 667, deviceScaleFactor: 2 },
  'pixel-5': { width: 393, height: 851, deviceScaleFactor: 2.75 },
  'samsung-s21': { width: 360, height: 800, deviceScaleFactor: 3 },
};

class UIDiffEngine {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './ui-diff-output';
    this.threshold = options.threshold || 0.1;
    this.viewport = this.resolveViewport(options.viewport, options.device);
    this.device = options.device;
    this.waitTime = options.waitTime || 2000;
    this.selector = options.selector;
    this.fullPage = options.fullPage || false;
    this.ignoreRegions = options.ignoreRegions || [];
    this.screenshotCapture = null;
  }

  /**
   * 解析视口配置
   */
  resolveViewport(viewport, device) {
    if (device && DEVICE_PRESETS[device]) {
      return DEVICE_PRESETS[device];
    }
    if (typeof viewport === 'string') {
      const [width, height] = viewport.split('x').map(Number);
      return { width, height, deviceScaleFactor: 2 };
    }
    return viewport || { width: 375, height: 812, deviceScaleFactor: 2 };
  }

  /**
   * 获取图片 - 支持多种来源
   * @param {string} source - 图片来源 (本地路径、URL、蓝湖URL)
   * @param {string} type - 类型标识 (design/actual)
   * @returns {Promise<Buffer>} PNG 图片 Buffer
   */
  async getImage(source, type = 'image') {
    // 本地文件
    if (await fs.pathExists(source)) {
      console.log(`  📁 读取本地文件: ${source}`);
      const buffer = await fs.readFile(source);
      return this.normalizeImage(buffer);
    }

    // URL (包括蓝湖)
    if (source.startsWith('http://') || source.startsWith('https://')) {
      // 蓝湖设计稿 URL
      if (source.includes('lanhuapp.com') || source.includes('alipic.lanhuapp.com')) {
        console.log(`  🎨 下载蓝湖设计稿: ${source.substring(0, 50)}...`);
        return this.downloadImage(source);
      }
      
      // 普通网页 - 需要截图
      console.log(`  🌐 截取网页: ${source}`);
      return this.captureWebpage(source);
    }

    throw new Error(`无法识别的图片来源: ${source}`);
  }

  /**
   * 下载图片
   */
  async downloadImage(url) {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return this.normalizeImage(buffer);
  }

  /**
   * 截取网页
   */
  async captureWebpage(url) {
    if (!this.screenshotCapture) {
      this.screenshotCapture = new ScreenshotCapture({
        viewport: this.viewport,
        device: this.device,
        waitTime: this.waitTime
      });
      await this.screenshotCapture.init();
    }

    const screenshot = await this.screenshotCapture.capture(url, {
      selector: this.selector,
      fullPage: this.fullPage
    });

    return this.normalizeImage(screenshot);
  }

  /**
   * 标准化图片 - 确保格式和尺寸一致
   */
  async normalizeImage(buffer) {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // 转换为 PNG 格式
    let normalized = image.png();

    // 如果需要调整尺寸
    if (this.viewport) {
      const targetWidth = this.viewport.width * (this.viewport.deviceScaleFactor || 2);
      
      // 只有当图片宽度与目标不一致时才调整
      if (metadata.width !== targetWidth) {
        normalized = normalized.resize(targetWidth, null, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        });
      }
    }

    return normalized.toBuffer();
  }

  /**
   * 对比两张图片
   * @param {Buffer} designBuffer - 设计稿图片
   * @param {Buffer} actualBuffer - 实际界面图片
   * @returns {Promise<Object>} 对比结果
   */
  async compare(designBuffer, actualBuffer) {
    // 确保两张图片尺寸一致
    const { alignedDesign, alignedActual, width, height } = await this.alignImages(
      designBuffer,
      actualBuffer
    );

    // 解析 PNG
    const designPng = PNG.sync.read(alignedDesign);
    const actualPng = PNG.sync.read(alignedActual);

    // 创建差异图
    const diffPng = new PNG({ width, height });

    // 执行像素对比
    const diffPixels = pixelmatch(
      designPng.data,
      actualPng.data,
      diffPng.data,
      width,
      height,
      {
        threshold: 0.1, // 颜色差异阈值
        alpha: 0.3,
        diffColor: [255, 0, 0],      // 差异区域颜色 (红色)
        diffColorAlt: [0, 255, 0],   // 反差区域颜色 (绿色)
        aaColor: [255, 255, 0]       // 抗锯齿区域颜色 (黄色)
      }
    );

    const totalPixels = width * height;
    const diffPercentage = diffPixels / totalPixels;
    const similarity = 1 - diffPercentage;

    // 保存图片
    const designPath = path.join(this.outputDir, 'design.png');
    const actualPath = path.join(this.outputDir, 'actual.png');
    const diffPath = path.join(this.outputDir, 'diff.png');

    await fs.writeFile(designPath, alignedDesign);
    await fs.writeFile(actualPath, alignedActual);
    await fs.writeFile(diffPath, PNG.sync.write(diffPng));

    // 分析差异区域
    const diffRegions = await this.analyzeDiffRegions(diffPng, width, height);

    return {
      width,
      height,
      diffPixels,
      totalPixels,
      diffPercentage,
      similarity,
      diffRegions,
      paths: {
        design: designPath,
        actual: actualPath,
        diff: diffPath
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 对齐两张图片尺寸
   */
  async alignImages(buffer1, buffer2) {
    const img1 = sharp(buffer1);
    const img2 = sharp(buffer2);

    const meta1 = await img1.metadata();
    const meta2 = await img2.metadata();

    // 使用较大的尺寸
    const width = Math.max(meta1.width, meta2.width);
    const height = Math.max(meta1.height, meta2.height);

    // 调整两张图片到相同尺寸
    const aligned1 = await sharp(buffer1)
      .resize(width, height, {
        fit: 'contain',
        position: 'top',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    const aligned2 = await sharp(buffer2)
      .resize(width, height, {
        fit: 'contain',
        position: 'top',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    return {
      alignedDesign: aligned1,
      alignedActual: aligned2,
      width,
      height
    };
  }

  /**
   * 分析差异区域 - 找出主要差异位置
   */
  async analyzeDiffRegions(diffPng, width, height) {
    const regions = [];
    const gridSize = 50; // 将图片分成 50x50 的网格
    const gridCols = Math.ceil(width / gridSize);
    const gridRows = Math.ceil(height / gridSize);

    // 统计每个网格的差异像素
    const gridDiffs = new Array(gridRows).fill(null).map(() => 
      new Array(gridCols).fill(0)
    );

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // 检查是否为差异像素 (红色)
        if (diffPng.data[idx] > 200 && diffPng.data[idx + 1] < 100) {
          const gridX = Math.floor(x / gridSize);
          const gridY = Math.floor(y / gridSize);
          if (gridY < gridRows && gridX < gridCols) {
            gridDiffs[gridY][gridX]++;
          }
        }
      }
    }

    // 找出差异显著的区域
    const threshold = gridSize * gridSize * 0.1; // 10% 以上差异
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (gridDiffs[row][col] > threshold) {
          regions.push({
            x: col * gridSize,
            y: row * gridSize,
            width: gridSize,
            height: gridSize,
            diffPixels: gridDiffs[row][col],
            severity: gridDiffs[row][col] / (gridSize * gridSize)
          });
        }
      }
    }

    // 合并相邻区域
    const mergedRegions = this.mergeAdjacentRegions(regions, gridSize);

    // 按严重程度排序
    return mergedRegions.sort((a, b) => b.severity - a.severity);
  }

  /**
   * 合并相邻的差异区域
   */
  mergeAdjacentRegions(regions, gridSize) {
    if (regions.length === 0) return [];

    const merged = [];
    const used = new Set();

    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;

      let current = { ...regions[i] };
      used.add(i);

      // 查找相邻区域
      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < regions.length; j++) {
          if (used.has(j)) continue;

          const r = regions[j];
          // 检查是否相邻
          if (this.isAdjacent(current, r, gridSize)) {
            // 合并区域
            const newX = Math.min(current.x, r.x);
            const newY = Math.min(current.y, r.y);
            const newRight = Math.max(current.x + current.width, r.x + r.width);
            const newBottom = Math.max(current.y + current.height, r.y + r.height);

            current = {
              x: newX,
              y: newY,
              width: newRight - newX,
              height: newBottom - newY,
              diffPixels: current.diffPixels + r.diffPixels,
              severity: (current.severity + r.severity) / 2
            };

            used.add(j);
            changed = true;
          }
        }
      }

      merged.push(current);
    }

    return merged;
  }

  /**
   * 检查两个区域是否相邻
   */
  isAdjacent(r1, r2, tolerance) {
    const gap = tolerance * 1.5;
    return !(
      r1.x + r1.width + gap < r2.x ||
      r2.x + r2.width + gap < r1.x ||
      r1.y + r1.height + gap < r2.y ||
      r2.y + r2.height + gap < r1.y
    );
  }

  /**
   * 清理资源
   */
  async cleanup() {
    if (this.screenshotCapture) {
      await this.screenshotCapture.close();
    }
  }
}

module.exports = { UIDiffEngine, DEVICE_PRESETS };
