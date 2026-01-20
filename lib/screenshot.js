/**
 * Screenshot Capture - 页面截图模块
 * 
 * 使用 Playwright 进行页面截图
 * 支持小程序、H5、普通网页
 */

const { chromium, devices } = require('playwright');

// 设备配置映射
const DEVICE_MAP = {
  'iphone-12': devices['iPhone 12'],
  'iphone-12-pro': devices['iPhone 12 Pro'],
  'iphone-12-pro-max': devices['iPhone 12 Pro Max'],
  'iphone-13': devices['iPhone 13'],
  'iphone-13-pro': devices['iPhone 13 Pro'],
  'iphone-13-pro-max': devices['iPhone 13 Pro Max'],
  'iphone-14': devices['iPhone 14'],
  'iphone-14-pro': devices['iPhone 14 Pro'],
  'iphone-14-pro-max': devices['iPhone 14 Pro Max'],
  'iphone-se': devices['iPhone SE'],
  'pixel-5': devices['Pixel 5'],
  'galaxy-s21': devices['Galaxy S9+'],
};

class ScreenshotCapture {
  constructor(options = {}) {
    this.viewport = options.viewport || { width: 375, height: 812 };
    this.device = options.device;
    this.waitTime = options.waitTime || 2000;
    this.userAgent = options.userAgent;
    this.browser = null;
    this.context = null;
  }

  /**
   * 初始化浏览器
   */
  async init() {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    // 创建上下文
    const contextOptions = this.getContextOptions();
    this.context = await this.browser.newContext(contextOptions);
  }

  /**
   * 获取浏览器上下文配置
   */
  getContextOptions() {
    // 如果指定了设备预设
    if (this.device && DEVICE_MAP[this.device]) {
      return {
        ...DEVICE_MAP[this.device],
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai'
      };
    }

    // 自定义配置
    return {
      viewport: this.viewport,
      deviceScaleFactor: this.viewport.deviceScaleFactor || 2,
      isMobile: true,
      hasTouch: true,
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
      userAgent: this.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    };
  }

  /**
   * 截取页面
   * @param {string} url - 页面 URL
   * @param {Object} options - 截图选项
   * @returns {Promise<Buffer>} 截图 Buffer
   */
  async capture(url, options = {}) {
    if (!this.browser) {
      await this.init();
    }

    const page = await this.context.newPage();

    try {
      // 设置额外的请求头 (用于小程序 H5 等)
      if (options.headers) {
        await page.setExtraHTTPHeaders(options.headers);
      }

      // 注入 Cookie (如果需要登录)
      if (options.cookies) {
        await this.context.addCookies(options.cookies);
      }

      // 导航到页面
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 等待页面加载
      await page.waitForTimeout(this.waitTime);

      // 等待特定选择器 (如果指定)
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }

      // 执行自定义脚本 (如果需要)
      if (options.beforeCapture) {
        await options.beforeCapture(page);
      }

      // 隐藏滚动条
      await page.addStyleTag({
        content: `
          ::-webkit-scrollbar { display: none !important; }
          * { scrollbar-width: none !important; }
        `
      });

      // 隐藏动态元素 (可选)
      if (options.hideSelectors) {
        for (const selector of options.hideSelectors) {
          await page.addStyleTag({
            content: `${selector} { visibility: hidden !important; }`
          });
        }
      }

      // 截图配置
      const screenshotOptions = {
        type: 'png',
        fullPage: options.fullPage || false
      };

      // 如果指定了选择器，只截取该元素
      if (options.selector) {
        const element = await page.$(options.selector);
        if (element) {
          return await element.screenshot(screenshotOptions);
        }
        console.warn(`选择器 "${options.selector}" 未找到，将截取整个页面`);
      }

      // 截取整个页面
      return await page.screenshot(screenshotOptions);

    } finally {
      await page.close();
    }
  }

  /**
   * 批量截取多个页面
   * @param {Array} pages - 页面配置数组
   * @returns {Promise<Array>} 截图结果数组
   */
  async captureMultiple(pages) {
    const results = [];

    for (const pageConfig of pages) {
      try {
        const screenshot = await this.capture(pageConfig.url, pageConfig.options);
        results.push({
          name: pageConfig.name,
          url: pageConfig.url,
          screenshot,
          success: true
        });
      } catch (error) {
        results.push({
          name: pageConfig.name,
          url: pageConfig.url,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * 截取小程序 H5 页面
   * 小程序 H5 通常需要特殊处理
   */
  async captureMiniprogramH5(url, options = {}) {
    // 小程序 H5 特殊配置
    const mpOptions = {
      ...options,
      headers: {
        'X-Requested-With': 'com.tencent.mm',
        ...options.headers
      },
      // 等待小程序框架加载
      waitForSelector: options.waitForSelector || '.page',
      // 隐藏小程序特有的 UI
      hideSelectors: [
        '.weui-navigation-bar',
        '.weui-tabbar',
        ...( options.hideSelectors || [])
      ]
    };

    return this.capture(url, mpOptions);
  }

  /**
   * 截取 uni-app H5 页面
   */
  async captureUniAppH5(url, options = {}) {
    const uniOptions = {
      ...options,
      // 等待 uni-app 页面加载
      waitForSelector: options.waitForSelector || '.uni-page-body',
      // 可能需要隐藏的元素
      hideSelectors: [
        '.uni-tabbar',
        '.uni-toast',
        '.uni-popup',
        ...(options.hideSelectors || [])
      ]
    };

    return this.capture(url, uniOptions);
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }
}

module.exports = { ScreenshotCapture, DEVICE_MAP };
