// 密码重置功能测试脚本
// 用于验证Supabase密码重置流程

const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取配置
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 缺少环境变量：REACT_APP_SUPABASE_URL 或 REACT_APP_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔧 初始化Supabase客户端...');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 测试函数
async function testPasswordReset() {
  try {
    console.log('📧 测试1: 发送密码重置邮件');
    
    const testEmail = 'test@example.com';
    const redirectTo = 'http://localhost:3000/reset-password';
    
    console.log(`发送重置邮件到: ${testEmail}`);
    console.log(`重定向URL: ${redirectTo}`);
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: redirectTo,
    });
    
    if (error) {
      console.error('❌ 发送邮件失败:', error.message);
      console.error('错误代码:', error.code);
      console.error('错误详情:', error);
    } else {
      console.log('✅ 邮件发送成功');
      console.log('返回数据:', data);
    }
    
    console.log('\n🔍 测试2: 验证Supabase配置');
    console.log('Supabase URL:', SUPABASE_URL);
    console.log('匿名密钥长度:', SUPABASE_ANON_KEY.length);
    console.log('匿名密钥前缀:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    
    console.log('\n🔍 测试3: 获取认证设置');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('当前用户状态: 未登录');
      console.log('错误:', userError.message);
    } else {
      console.log('当前用户状态:', user ? '已登录' : '未登录');
      if (user) {
        console.log('用户邮箱:', user.email);
      }
    }
    
    console.log('\n🔍 测试4: 验证邮件模板配置');
    console.log('期望的重定向URL:', redirectTo);
    console.log('邮件模板应该包含的链接格式:');
    console.log(`${SUPABASE_URL}/auth/v1/verify?token=TOKEN&type=recovery&redirect_to=${encodeURIComponent(redirectTo)}`);
    
    console.log('\n✅ 测试完成！');
    console.log('\n📋 下一步操作:');
    console.log('1. 检查测试邮箱是否收到重置邮件');
    console.log('2. 如果收到邮件，点击邮件中的链接');
    console.log('3. 确认链接是否跳转到正确的重置密码页面');
    console.log('4. 在重置密码页面输入新密码并提交');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
console.log('🚀 开始密码重置功能测试...');
testPasswordReset();