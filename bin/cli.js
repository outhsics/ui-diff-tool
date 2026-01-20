#!/usr/bin/env node
/**
 * UI Diff Tool - CLI 入口
 * 
 * 功能：
 * 1. 对比蓝湖设计稿与实际界面
 * 2. 生成差异报告
 * 3. 输出 AI 可读的修复建议
 * 
 * 使用方式：
 *   ui-diff compare --design <设计稿URL或图片> --actual <实际界面URL或图片>
 *   ui-diff batch --config <配置文件>
 *   ui-diff report --output <输出目录>
 */

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');

const { UIDiffEngine } = require('../lib/diff-engine');
const { ScreenshotCapture } = require('../lib/screenshot');
const { ReportGenerator } = require('../lib/report');
const { AIPromptGenerator } = require('../lib/ai-prompt');

// 版本信息
program
  .name('ui-diff')
  .description('🎨 UI设计稿与实际界面自动对比工具')
  .version('1.0.0');

// compare 命令 - 单个对比
program
  .command('compare')
  .description('对比设计稿与实际界面')
  .option('-d, --design <path>', '设计稿图片路径或蓝湖URL')
  .option('-a, --actual <path>', '实际界面图片路径或URL')
  .option('-o, --output <dir>', '输出目录', './ui-diff-output')
  .option('-t, --threshold <number>', '差异阈值 (0-1)', '0.1')
  .option('--viewport <size>', '视口大小 (如: 375x812)', '375x812')
  .option('--device <name>', '设备预设 (iphone-12, iphone-14-pro 等)')
  .option('--wait <ms>', '页面加载等待时间', '2000')
  .option('--selector <css>', '截图指定元素选择器')
  .option('--full-page', '全页面截图', false)
  .option('--ai-prompt', '生成 AI 修复提示', true)
  .action(async (options) => {
    const spinner = ora('正在初始化...').start();
    
    try {
      // 验证参数
      if (!options.design || !options.actual) {
        spinner.fail('请提供设计稿和实际界面路径');
        console.log(chalk.yellow('\n示例:'));
        console.log(chalk.gray('  ui-diff compare -d ./design.png -a http://localhost:3000/page'));
        console.log(chalk.gray('  ui-diff compare -d "蓝湖URL" -a ./screenshot.png'));
        process.exit(1);
      }

      // 解析视口大小
      const [width, height] = options.viewport.split('x').map(Number);
      
      // 创建输出目录
      await fs.ensureDir(options.output);
      
      // 初始化引擎
      const engine = new UIDiffEngine({
        outputDir: options.output,
        threshold: parseFloat(options.threshold),
        viewport: { width, height },
        device: options.device,
        waitTime: parseInt(options.wait),
        selector: options.selector,
        fullPage: options.fullPage
      });

      spinner.text = '正在获取设计稿...';
      const designImage = await engine.getImage(options.design, 'design');
      
      spinner.text = '正在获取实际界面...';
      const actualImage = await engine.getImage(options.actual, 'actual');
      
      spinner.text = '正在对比差异...';
      const result = await engine.compare(designImage, actualImage);
      
      spinner.text = '正在生成报告...';
      const report = new ReportGenerator(options.output);
      await report.generate(result);
      
      // 生成 AI 修复提示
      if (options.aiPrompt) {
        spinner.text = '正在生成 AI 修复建议...';
        const aiPrompt = new AIPromptGenerator();
        const prompt = await aiPrompt.generate(result);
        await fs.writeFile(
          path.join(options.output, 'ai-fix-prompt.md'),
          prompt
        );
      }
      
      spinner.succeed('对比完成!');
      
      // 输出结果摘要
      console.log('\n' + chalk.bold('📊 对比结果:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`  差异像素: ${chalk.yellow(result.diffPixels.toLocaleString())} px`);
      console.log(`  差异比例: ${chalk.yellow((result.diffPercentage * 100).toFixed(2))}%`);
      console.log(`  匹配度:   ${chalk.green((result.similarity * 100).toFixed(2))}%`);
      console.log(chalk.gray('─'.repeat(50)));
      
      // 输出文件位置
      console.log('\n' + chalk.bold('📁 输出文件:'));
      console.log(`  差异图片: ${chalk.cyan(path.join(options.output, 'diff.png'))}`);
      console.log(`  对比报告: ${chalk.cyan(path.join(options.output, 'report.html'))}`);
      if (options.aiPrompt) {
        console.log(`  AI提示词: ${chalk.cyan(path.join(options.output, 'ai-fix-prompt.md'))}`);
      }
      
      // 判断是否通过
      if (result.diffPercentage <= parseFloat(options.threshold)) {
        console.log('\n' + chalk.green.bold('✅ 界面与设计稿匹配!'));
      } else {
        console.log('\n' + chalk.red.bold('❌ 发现差异，请查看报告进行修复'));
        console.log(chalk.yellow('\n💡 提示: 将 ai-fix-prompt.md 的内容发送给 Claude，让 AI 帮你自动修复'));
      }
      
    } catch (error) {
      spinner.fail('对比失败');
      console.error(chalk.red(error.message));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// batch 命令 - 批量对比
program
  .command('batch')
  .description('批量对比多个页面')
  .option('-c, --config <file>', '配置文件路径', './ui-diff.config.js')
  .option('-o, --output <dir>', '输出目录', './ui-diff-output')
  .option('--parallel <number>', '并行数量', '3')
  .action(async (options) => {
    const spinner = ora('正在加载配置...').start();
    
    try {
      // 加载配置文件
      const configPath = path.resolve(options.config);
      if (!await fs.pathExists(configPath)) {
        spinner.fail(`配置文件不存在: ${configPath}`);
        console.log(chalk.yellow('\n请创建配置文件，示例:'));
        console.log(chalk.gray(`
module.exports = {
  pages: [
    {
      name: '首页',
      design: './designs/home.png',
      actual: 'http://localhost:3000/',
      selector: '.page-content'
    },
    {
      name: '学习中心',
      design: 'https://lanhuapp.com/...',
      actual: 'http://localhost:3000/learn'
    }
  ],
  viewport: { width: 375, height: 812 },
  threshold: 0.1
};
`));
        process.exit(1);
      }
      
      const config = require(configPath);
      const engine = new UIDiffEngine({
        outputDir: options.output,
        ...config
      });
      
      spinner.text = `正在对比 ${config.pages.length} 个页面...`;
      
      const results = [];
      for (const page of config.pages) {
        spinner.text = `正在对比: ${page.name}...`;
        
        const pageOutputDir = path.join(options.output, page.name.replace(/[\/\\]/g, '-'));
        await fs.ensureDir(pageOutputDir);
        
        const designImage = await engine.getImage(page.design, 'design');
        const actualImage = await engine.getImage(page.actual, 'actual');
        const result = await engine.compare(designImage, actualImage);
        
        result.name = page.name;
        result.outputDir = pageOutputDir;
        results.push(result);
        
        // 保存单页报告
        const report = new ReportGenerator(pageOutputDir);
        await report.generate(result);
      }
      
      // 生成汇总报告
      spinner.text = '正在生成汇总报告...';
      const summaryReport = new ReportGenerator(options.output);
      await summaryReport.generateSummary(results);
      
      spinner.succeed('批量对比完成!');
      
      // 输出汇总
      console.log('\n' + chalk.bold('📊 批量对比结果:'));
      console.log(chalk.gray('─'.repeat(60)));
      
      const { table } = require('table');
      const tableData = [
        ['页面', '差异比例', '匹配度', '状态']
      ];
      
      for (const r of results) {
        const status = r.diffPercentage <= config.threshold 
          ? chalk.green('✅ 通过') 
          : chalk.red('❌ 差异');
        tableData.push([
          r.name,
          `${(r.diffPercentage * 100).toFixed(2)}%`,
          `${(r.similarity * 100).toFixed(2)}%`,
          status
        ]);
      }
      
      console.log(table(tableData));
      console.log(`\n汇总报告: ${chalk.cyan(path.join(options.output, 'summary.html'))}`);
      
    } catch (error) {
      spinner.fail('批量对比失败');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// capture 命令 - 截图
program
  .command('capture')
  .description('截取页面截图')
  .option('-u, --url <url>', '页面URL')
  .option('-o, --output <file>', '输出文件路径', './screenshot.png')
  .option('--viewport <size>', '视口大小', '375x812')
  .option('--device <name>', '设备预设')
  .option('--wait <ms>', '等待时间', '2000')
  .option('--selector <css>', '截图指定元素')
  .option('--full-page', '全页面截图', false)
  .action(async (options) => {
    const spinner = ora('正在截图...').start();
    
    try {
      const [width, height] = options.viewport.split('x').map(Number);
      
      const capture = new ScreenshotCapture({
        viewport: { width, height },
        device: options.device,
        waitTime: parseInt(options.wait)
      });
      
      await capture.init();
      const screenshot = await capture.capture(options.url, {
        selector: options.selector,
        fullPage: options.fullPage
      });
      
      await fs.writeFile(options.output, screenshot);
      await capture.close();
      
      spinner.succeed(`截图已保存: ${options.output}`);
      
    } catch (error) {
      spinner.fail('截图失败');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// init 命令 - 初始化配置
program
  .command('init')
  .description('初始化配置文件')
  .action(async () => {
    const inquirer = require('inquirer');
    
    console.log(chalk.bold('\n🎨 UI Diff Tool 配置向导\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'outputDir',
        message: '输出目录:',
        default: './ui-diff-output'
      },
      {
        type: 'list',
        name: 'device',
        message: '目标设备:',
        choices: [
          { name: 'iPhone 12 (375x812)', value: 'iphone-12' },
          { name: 'iPhone 14 Pro (393x852)', value: 'iphone-14-pro' },
          { name: 'iPhone 14 Pro Max (430x932)', value: 'iphone-14-pro-max' },
          { name: '自定义', value: 'custom' }
        ]
      },
      {
        type: 'input',
        name: 'customViewport',
        message: '自定义视口大小 (宽x高):',
        when: (ans) => ans.device === 'custom',
        default: '375x812'
      },
      {
        type: 'input',
        name: 'threshold',
        message: '差异阈值 (0-1, 越小越严格):',
        default: '0.1'
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: '本地开发服务器地址:',
        default: 'http://localhost:3000'
      }
    ]);
    
    // 生成配置文件
    const config = `/**
 * UI Diff Tool 配置文件
 * 
 * 使用方式:
 *   npx ui-diff batch -c ./ui-diff.config.js
 */

module.exports = {
  // 输出目录
  outputDir: '${answers.outputDir}',
  
  // 视口配置
  viewport: ${answers.device === 'custom' 
    ? `{ width: ${answers.customViewport.split('x')[0]}, height: ${answers.customViewport.split('x')[1]} }`
    : `'${answers.device}'`
  },
  
  // 差异阈值 (0-1)
  threshold: ${answers.threshold},
  
  // 等待时间 (毫秒)
  waitTime: 2000,
  
  // 本地开发服务器
  baseUrl: '${answers.baseUrl}',
  
  // 页面配置
  pages: [
    {
      name: '首页',
      // 设计稿路径 (支持本地文件、蓝湖URL、HTTP URL)
      design: './designs/home.png',
      // 实际页面路径 (相对于 baseUrl)
      actual: '/',
      // 可选: 指定截图区域
      // selector: '.page-content'
    },
    {
      name: '学习中心',
      design: './designs/learn.png',
      actual: '/pages/index/learn'
    },
    // 添加更多页面...
  ],
  
  // 高级配置
  advanced: {
    // 忽略区域 (动态内容如时间、头像等)
    ignoreRegions: [
      // { x: 0, y: 0, width: 375, height: 44 }  // 状态栏
    ],
    
    // 截图前执行的脚本
    beforeCapture: async (page) => {
      // 例如: 等待特定元素加载
      // await page.waitForSelector('.content-loaded');
    },
    
    // 截图后处理
    afterCapture: async (screenshot) => {
      // 例如: 裁剪、调整大小等
      return screenshot;
    }
  }
};
`;
    
    await fs.writeFile('./ui-diff.config.js', config);
    console.log(chalk.green('\n✅ 配置文件已创建: ./ui-diff.config.js'));
    console.log(chalk.yellow('\n下一步:'));
    console.log(chalk.gray('  1. 编辑配置文件，添加需要对比的页面'));
    console.log(chalk.gray('  2. 准备设计稿图片'));
    console.log(chalk.gray('  3. 运行: npx ui-diff batch'));
  });

// 解析命令行参数
program.parse();

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  console.log(chalk.bold('\n🎨 UI Diff Tool - UI设计稿与实际界面自动对比工具\n'));
  program.outputHelp();
  console.log(chalk.yellow('\n快速开始:'));
  console.log(chalk.gray('  1. 初始化配置: ui-diff init'));
  console.log(chalk.gray('  2. 单个对比:   ui-diff compare -d design.png -a http://localhost:3000'));
  console.log(chalk.gray('  3. 批量对比:   ui-diff batch -c ui-diff.config.js'));
  console.log(chalk.gray('  4. 截取页面:   ui-diff capture -u http://localhost:3000 -o screenshot.png'));
}
