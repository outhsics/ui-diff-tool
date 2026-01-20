/**
 * UI Diff Tool 配置文件示例
 * 
 * 复制此文件为 ui-diff.config.js 并根据项目修改
 * 
 * 使用方式:
 *   cd tools/ui-diff
 *   npm install
 *   npx ui-diff batch -c ../../ui-diff.config.js
 */

module.exports = {
  // ==================== 基础配置 ====================
  
  // 输出目录
  outputDir: './ui-diff-output',
  
  // 差异阈值 (0-1, 越小越严格)
  // 0.05 = 5% 差异以内算通过
  // 0.1  = 10% 差异以内算通过
  threshold: 0.1,
  
  // 视口配置 (移动端常用尺寸)
  // 可以使用预设: 'iphone-12', 'iphone-14-pro', 'pixel-5' 等
  // 或自定义: { width: 375, height: 812, deviceScaleFactor: 2 }
  viewport: 'iphone-12',
  
  // 页面加载等待时间 (毫秒)
  waitTime: 3000,
  
  // 本地开发服务器地址
  baseUrl: 'http://localhost:3000',

  // ==================== 蓝湖配置 ====================
  
  // 蓝湖项目 URL (用于批量获取设计稿)
  lanhuProjectUrl: 'https://lanhuapp.com/web/#/item/project/stage?pid=xxx&tid=xxx',
  
  // ==================== 页面配置 ====================
  
  pages: [
    // ---------- 首页模块 ----------
    {
      name: '首页',
      // 设计稿来源 (支持多种格式)
      // 1. 本地文件: './designs/home.png'
      // 2. 蓝湖图片URL: 'https://alipic.lanhuapp.com/xxx.png'
      // 3. HTTP URL: 'https://example.com/design.png'
      design: './designs/home.png',
      // 实际页面 (相对于 baseUrl，或完整 URL)
      actual: '/pages/index/index',
      // 可选配置
      options: {
        // 只截取特定元素
        // selector: '.page-content',
        // 全页面截图
        // fullPage: true,
        // 隐藏动态元素
        // hideSelectors: ['.time', '.avatar']
      }
    },
    
    // ---------- 学习中心模块 ----------
    {
      name: '学习中心-线上课程',
      design: './designs/learn-online.png',
      actual: '/pages/index/learn'
    },
    {
      name: '学习中心-线下课程',
      design: './designs/learn-offline.png',
      actual: '/pages/learn/intro'
    },
    {
      name: '学习中心-音频播放',
      design: './designs/learn-audio.png',
      actual: '/pages/learn/audio'
    },
    
    // ---------- 个人中心模块 ----------
    {
      name: '个人中心',
      design: './designs/user.png',
      actual: '/pages/index/user'
    },
    {
      name: '会员中心',
      design: './designs/member.png',
      actual: '/pages/user/member_center/index'
    },
    
    // ---------- 订单模块 ----------
    {
      name: '订单列表',
      design: './designs/order-list.png',
      actual: '/pages/order/list'
    },
    {
      name: '订单详情',
      design: './designs/order-detail.png',
      actual: '/pages/order/detail?id=test'
    },
    
    // ---------- 支付模块 ----------
    {
      name: '确认订单',
      design: './designs/pay-confirm.png',
      actual: '/pages/order/confirm'
    },
    {
      name: '支付结果',
      design: './designs/pay-result.png',
      actual: '/pages/pay/result'
    },

    // 添加更多页面...
  ],

  // ==================== 高级配置 ====================
  
  advanced: {
    // 忽略区域 (动态内容如时间、头像等)
    ignoreRegions: [
      // 状态栏区域
      // { x: 0, y: 0, width: 375, height: 44 },
      // 底部安全区域
      // { x: 0, y: 778, width: 375, height: 34 }
    ],
    
    // 截图前执行的脚本
    beforeCapture: async (page) => {
      // 等待页面完全加载
      // await page.waitForSelector('.content-loaded');
      
      // 滚动到顶部
      // await page.evaluate(() => window.scrollTo(0, 0));
      
      // 隐藏加载动画
      // await page.addStyleTag({ content: '.loading { display: none !important; }' });
    },
    
    // 截图后处理
    afterCapture: async (screenshot) => {
      // 可以进行裁剪、调整大小等处理
      return screenshot;
    },

    // 自定义请求头 (用于需要登录的页面)
    headers: {
      // 'Authorization': 'Bearer xxx',
      // 'Cookie': 'session=xxx'
    },

    // 并行对比数量
    parallel: 3
  }
};
