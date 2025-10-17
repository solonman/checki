/**
 * Supabase客户端配置
 * 使用集中式环境变量管理
 */

import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env.config';

// 获取Supabase配置
const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

// 验证必要配置
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase配置错误：缺少必要的URL或密钥');
  throw new Error('Supabase配置不完整，请检查环境变量');
}

console.log('Supabase配置:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0
});

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // 客户端配置选项
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // 使用PKCE流程，更安全
  },
  global: {
    headers: {
      'x-application-name': 'adcheck-ai-proofreading',
      'apikey': supabaseAnonKey
    }
  },
  db: {
    schema: 'public'
  }
});

export default supabase;