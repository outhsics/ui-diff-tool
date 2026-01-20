/**
 * Report Generator - 差异报告生成器
 * 
 * 生成可视化的 HTML 报告
 * 支持单页报告和批量汇总报告
 */

const fs = require('fs-extra');
const path = require('path');

class ReportGenerator {
  constructor(outputDir) {
    this.outputDir = outputDir;
  }

  /**
   * 生成单页对比报告
   */
  async generate(result) {
    const html = this.renderSingleReport(result);
    const reportPath = path.join(this.outputDir, 'report.html');
    await fs.writeFile(reportPath, html);
    return reportPath;
  }

  /**
   * 生成批量汇总报告
   */
  async generateSummary(results) {
    const html = this.renderSummaryReport(results);
    const reportPath = path.join(this.outputDir, 'summary.html');
    await fs.writeFile(reportPath, html);
    return reportPath;
  }

  /**
   * 渲染单页报告 HTML
   */
  renderSingleReport(result) {
    const statusClass = result.diffPercentage <= 0.1 ? 'pass' : 'fail';
    const statusText = result.diffPercentage <= 0.1 ? '✅ 通过' : '❌ 存在差异';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UI 对比报告 - ${result.name || '单页对比'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f7fa;
      color: #333;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header .subtitle { opacity: 0.9; font-size: 14px; }
    
    /* Stats */
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      text-align: center;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .stat-card .label {
      color: #666;
      font-size: 14px;
      margin-top: 4px;
    }
    .stat-card.pass .value { color: #10b981; }
    .stat-card.fail .value { color: #ef4444; }
    
    /* Image Compare */
    .compare-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .compare-section h2 {
      font-size: 18px;
      margin-bottom: 16px;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .compare-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .compare-item {
      text-align: center;
    }
    .compare-item .label {
      font-weight: 600;
      margin-bottom: 8px;
      color: #666;
    }
    .compare-item img {
      max-width: 100%;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    /* Slider Compare */
    .slider-compare {
      position: relative;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .slider-compare img {
      display: block;
      width: 100%;
    }
    .slider-compare .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 50%;
      height: 100%;
      overflow: hidden;
      border-right: 2px solid #667eea;
    }
    .slider-compare .overlay img {
      width: 200%;
      max-width: none;
    }
    .slider-handle {
      position: absolute;
      top: 0;
      left: 50%;
      width: 40px;
      height: 100%;
      margin-left: -20px;
      cursor: ew-resize;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .slider-handle::before {
      content: '⟷';
      background: #667eea;
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 16px;
    }
    
    /* Diff Regions */
    .regions-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .region-list {
      display: grid;
      gap: 12px;
    }
    .region-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #ef4444;
    }
    .region-item .position {
      font-family: monospace;
      background: #e5e7eb;
      padding: 4px 8px;
      border-radius: 4px;
      margin-right: 12px;
    }
    .region-item .severity {
      margin-left: auto;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .severity.high { background: #fee2e2; color: #dc2626; }
    .severity.medium { background: #fef3c7; color: #d97706; }
    .severity.low { background: #d1fae5; color: #059669; }
    
    /* Footer */
    .footer {
      text-align: center;
      color: #999;
      font-size: 12px;
      padding: 20px;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .compare-grid { grid-template-columns: 1fr; }
      .stats { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 UI 对比报告</h1>
      <div class="subtitle">生成时间: ${result.timestamp || new Date().toISOString()}</div>
    </div>
    
    <div class="stats">
      <div class="stat-card ${statusClass}">
        <div class="value">${statusText}</div>
        <div class="label">对比结果</div>
      </div>
      <div class="stat-card">
        <div class="value">${(result.similarity * 100).toFixed(1)}%</div>
        <div class="label">匹配度</div>
      </div>
      <div class="stat-card">
        <div class="value">${(result.diffPercentage * 100).toFixed(2)}%</div>
        <div class="label">差异比例</div>
      </div>
      <div class="stat-card">
        <div class="value">${result.diffPixels.toLocaleString()}</div>
        <div class="label">差异像素</div>
      </div>
    </div>
    
    <div class="compare-section">
      <h2>📸 图片对比</h2>
      <div class="compare-grid">
        <div class="compare-item">
          <div class="label">设计稿</div>
          <img src="design.png" alt="设计稿">
        </div>
        <div class="compare-item">
          <div class="label">实际界面</div>
          <img src="actual.png" alt="实际界面">
        </div>
        <div class="compare-item">
          <div class="label">差异标注</div>
          <img src="diff.png" alt="差异">
        </div>
      </div>
    </div>
    
    ${result.diffRegions && result.diffRegions.length > 0 ? `
    <div class="regions-section">
      <h2>📍 差异区域 (${result.diffRegions.length} 处)</h2>
      <div class="region-list">
        ${result.diffRegions.slice(0, 10).map((region, index) => {
          const severityClass = region.severity > 0.5 ? 'high' : region.severity > 0.2 ? 'medium' : 'low';
          const severityText = region.severity > 0.5 ? '严重' : region.severity > 0.2 ? '中等' : '轻微';
          return `
            <div class="region-item">
              <span class="position">区域 ${index + 1}: (${region.x}, ${region.y}) ${region.width}×${region.height}</span>
              <span>差异 ${region.diffPixels} 像素</span>
              <span class="severity ${severityClass}">${severityText}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>由 UI Diff Tool 生成 | 基于 pixelmatch 像素对比</p>
    </div>
  </div>
  
  <script>
    // 图片滑动对比功能
    document.querySelectorAll('.slider-compare').forEach(slider => {
      const handle = slider.querySelector('.slider-handle');
      const overlay = slider.querySelector('.overlay');
      
      let isDragging = false;
      
      handle.addEventListener('mousedown', () => isDragging = true);
      document.addEventListener('mouseup', () => isDragging = false);
      
      slider.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = slider.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = (x / rect.width) * 100;
        overlay.style.width = percent + '%';
        handle.style.left = percent + '%';
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * 渲染汇总报告 HTML
   */
  renderSummaryReport(results) {
    const passCount = results.filter(r => r.diffPercentage <= 0.1).length;
    const failCount = results.length - passCount;
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UI 对比汇总报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f7fa;
      color: #333;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 28px; }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .summary-card .value { font-size: 32px; font-weight: bold; }
    .summary-card .label { color: #666; font-size: 14px; }
    .summary-card.pass .value { color: #10b981; }
    .summary-card.fail .value { color: #ef4444; }
    
    .results-table {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    tr:hover { background: #f9fafb; }
    .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status.pass { background: #d1fae5; color: #059669; }
    .status.fail { background: #fee2e2; color: #dc2626; }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 UI 对比汇总报告</h1>
      <p>共对比 ${results.length} 个页面</p>
    </div>
    
    <div class="summary">
      <div class="summary-card">
        <div class="value">${results.length}</div>
        <div class="label">总页面数</div>
      </div>
      <div class="summary-card pass">
        <div class="value">${passCount}</div>
        <div class="label">通过</div>
      </div>
      <div class="summary-card fail">
        <div class="value">${failCount}</div>
        <div class="label">差异</div>
      </div>
      <div class="summary-card">
        <div class="value">${(avgSimilarity * 100).toFixed(1)}%</div>
        <div class="label">平均匹配度</div>
      </div>
    </div>
    
    <div class="results-table">
      <table>
        <thead>
          <tr>
            <th>页面名称</th>
            <th>匹配度</th>
            <th>差异比例</th>
            <th>差异像素</th>
            <th>状态</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => `
            <tr>
              <td><strong>${r.name}</strong></td>
              <td>${(r.similarity * 100).toFixed(1)}%</td>
              <td>${(r.diffPercentage * 100).toFixed(2)}%</td>
              <td>${r.diffPixels.toLocaleString()}</td>
              <td>
                <span class="status ${r.diffPercentage <= 0.1 ? 'pass' : 'fail'}">
                  ${r.diffPercentage <= 0.1 ? '✅ 通过' : '❌ 差异'}
                </span>
              </td>
              <td><a href="${r.name.replace(/[\/\\]/g, '-')}/report.html">查看报告</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
  }
}

module.exports = { ReportGenerator };
