// 手动初始化数据库脚本
// 运行方法: node init-database.js

const { createRequire } = require('module');
const require = createRequire(__filename);
const path = require('path');

// 设置环境变量
try {
  // 尝试加载.env文件
  const dotenv = require('dotenv');
  dotenv.config();
  console.log('已加载.env文件');
} catch (e) {
  console.log('未找到.env文件或无法加载，使用环境变量');
}

// 模拟浏览器环境
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {};
  globalThis.document = {}
  globalThis.navigator = { userAgent: 'Node.js' };
}

// 导入必要的模块
const supabaseClient = require('./src/utils/supabaseClient');
const { initializeDatabase } = require('./src/utils/initializeDatabase');

console.log('开始手动初始化数据库...');
console.log(`Supabase URL: ${process.env.REACT_APP_SUPABASE_URL ? '已设置' : '未设置'}`);
console.log(`Supabase Key: ${process.env.REACT_APP_SUPABASE_ANON_KEY ? '已设置' : '未设置'}`);

// 执行初始化
async function runInitialization() {
  try {
    // 测试Supabase连接
    console.log('测试Supabase连接...');
    const { data, error } = await supabaseClient.rpc('pg_version');
    if (error) {
      console.error('Supabase连接失败:', error.message);
      console.error('请检查.env文件中的SUPABASE_URL和SUPABASE_ANON_KEY配置');
      process.exit(1);
    }
    console.log('Supabase连接成功，PostgreSQL版本:', data);
    
    // 执行数据库初始化
    console.log('开始初始化数据库表结构和存储桶...');
    const result = await initializeDatabase();
    
    if (result.success) {
      console.log('✅ 数据库初始化成功！');
      console.log(result.message);
    } else {
      console.error('❌ 数据库初始化失败:', result.error);
      console.error(result.message);
    }
  } catch (error) {
    console.error('❌ 初始化过程发生错误:', error);
  } finally {
    // 确保进程退出
    setTimeout(() => process.exit(0), 1000);
  }
}

// 启动初始化
runInitialization();