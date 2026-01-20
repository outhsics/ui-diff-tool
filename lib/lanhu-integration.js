/**
 * Lanhu Integration - 蓝湖设计稿集成
 * 
 * 与 lanhu-mcp 服务集成，自动获取设计稿
 * 支持批量下载、缓存管理
 */

const fs = require('fs-extra');
const path = require('path');

class LanhuIntegration {
  constructor(options = {}) {
    this.mcpUrl = options.mcpUrl || 'http://localhost:8000/mcp';
    this.cacheDir = options.cacheDir || './ui-diff-cache/lanhu';
    this.role = options.role || '前端';
    this.name = options.name || 'UI-Diff-Tool';
  }

  /**
   * 初始化缓存目录
   */
  async init() {
    await fs.ensureDir(this.cacheDir);
  }

  /**
   * 解析蓝湖 URL
   */
  parseUrl(url) {
    const urlObj = new URL(url);
    const hash = urlObj.hash;
    
    // 提取参数
    const params = new URLSearchParams(hash.split('?')[1] || '');
    
    return {
      tid: params.get('tid'),
      pid: params.get('pid'),
      docId: params.get('docId'),
      isDesign: !params.get('docId'), // 没有 docId 说明是设计稿
      originalUrl: url
    };
  }

  /**
   * 通过 MCP 获取设计图列表
   */
  async getDesigns(url) {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`${this.mcpUrl}?role=${this.role}&name=${this.name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: 'lanhu_get_designs',
          arguments: { url }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`MCP 请求失败: ${response.status}`);
    }

    const result = await response.json();
    return result;
  }

  /**
   * 下载设计稿图片
   */
  async downloadDesign(designUrl, outputPath) {
    const fetch = (await import('node-fetch')).default;
    
    // 检查缓存
    const cacheKey = this.getCacheKey(designUrl);
    const cachePath = path.join(this.cacheDir, cacheKey);
    
    if (await fs.pathExists(cachePath)) {
      console.log(`  📦 使用缓存: ${cacheKey}`);
      if (outputPath) {
        await fs.copy(cachePath, outputPath);
      }
      return fs.readFile(cachePath);
    }

    // 下载图片
    console.log(`  ⬇️ 下载设计稿: ${designUrl.substring(0, 50)}...`);
    
    const response = await fetch(designUrl);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    // 保存到缓存
    await fs.writeFile(cachePath, buffer);
    
    // 保存到输出路径
    if (outputPath) {
      await fs.writeFile(outputPath, buffer);
    }

    return buffer;
  }

  /**
   * 生成缓存键
   */
  getCacheKey(url) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return `${hash}.png`;
  }

  /**
   * 根据名称查找设计稿
   */
  async findDesignByName(url, name) {
    const designs = await this.getDesigns(url);
    
    if (!designs || !designs.designs) {
      throw new Error('获取设计稿列表失败');
    }

    // 精确匹配
    let design = designs.designs.find(d => d.name === name);
    
    // 模糊匹配
    if (!design) {
      design = designs.designs.find(d => 
        d.name.includes(name) || name.includes(d.name)
      );
    }

    if (!design) {
      console.log('可用的设计稿:');
      designs.designs.forEach(d => console.log(`  - ${d.name}`));
      throw new Error(`未找到设计稿: ${name}`);
    }

    return design;
  }

  /**
   * 批量下载设计稿
   */
  async downloadMultiple(url, names, outputDir) {
    await fs.ensureDir(outputDir);
    
    const results = [];
    
    for (const name of names) {
      try {
        const design = await this.findDesignByName(url, name);
        const outputPath = path.join(outputDir, `${name.replace(/[\/\\]/g, '-')}.png`);
        
        await this.downloadDesign(design.url, outputPath);
        
        results.push({
          name,
          success: true,
          path: outputPath,
          design
        });
      } catch (error) {
        results.push({
          name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 清理缓存
   */
  async clearCache() {
    await fs.emptyDir(this.cacheDir);
    console.log('缓存已清理');
  }
}

/**
 * 创建蓝湖设计稿配置
 * 方便在 ui-diff.config.js 中使用
 */
function createLanhuConfig(options) {
  const { projectUrl, pages, ...rest } = options;
  
  return {
    ...rest,
    pages: pages.map(page => ({
      ...page,
      design: page.designName 
        ? `lanhu://${projectUrl}#${page.designName}`
        : page.design
    }))
  };
}

module.exports = { LanhuIntegration, createLanhuConfig };
