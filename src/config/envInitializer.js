/**
 * 环境变量初始化器
 * 应用启动时验证和初始化环境变量配置
 */

import envManager, { validateEnv, getAllEnv } from './env.config';

/**
 * 环境变量初始化配置
 */
const ENV_INIT_CONFIG = {
  // 是否严格模式（缺少必填配置时阻止应用启动）
  strictMode: true,
  
  // 是否显示配置信息
  showConfig: process.env.NODE_ENV === 'development',
  
  // 是否验证敏感信息强度
  validateSecurity: true,
  
  // 是否检查推荐配置
  checkRecommendations: true
};

/**
 * 初始化环境变量
 * @returns {object} 初始化结果
 */
export const initializeEnvironment = () => {
  console.log('🔧 正在初始化环境变量配置...');
  
  try {
    // 初始化环境管理器
    envManager.initialize();
    
    // 验证配置
    const validation = validateEnv();
    
    // 记录初始化结果
    const result = {
      success: true,
      errors: validation.errors,
      warnings: validation.warnings,
      config: ENV_INIT_CONFIG.showConfig ? getAllEnv() : {},
      timestamp: new Date().toISOString()
    };
    
    // 处理验证结果
    if (validation.errors.length > 0) {
      console.error('❌ 环境变量配置错误:');
      validation.errors.forEach(error => {
        console.error(`   - ${error}`);
      });
      
      if (ENV_INIT_CONFIG.strictMode) {
        result.success = false;
        result.message = '环境变量配置验证失败，请修复上述错误后重试';
        return result;
      }
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️  环境变量配置警告:');
      validation.warnings.forEach(warning => {
        console.warn(`   - ${warning}`);
      });
    }
    
    // 安全验证
    if (ENV_INIT_CONFIG.validateSecurity) {
      const securityCheck = performSecurityCheck();
      if (securityCheck.hasIssues) {
        console.warn('🔒 安全配置建议:');
        securityCheck.issues.forEach(issue => {
          console.warn(`   - ${issue}`);
        });
      }
    }
    
    // 推荐配置检查
    if (ENV_INIT_CONFIG.checkRecommendations) {
      const recommendations = checkRecommendations();
      if (recommendations.length > 0) {
        console.info('💡 配置优化建议:');
        recommendations.forEach(rec => {
          console.info(`   - ${rec}`);
        });
      }
    }
    
    // 显示配置摘要
    if (ENV_INIT_CONFIG.showConfig) {
      showConfigurationSummary(result);
    }
    
    result.message = result.success ? 
      '环境变量配置初始化成功' : 
      '环境变量配置初始化失败';
    
    return result;
    
  } catch (error) {
    console.error('💥 环境变量初始化失败:', error);
    return {
      success: false,
      errors: [error.message],
      message: '环境变量初始化过程中发生错误',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * 执行安全检查
 */
const performSecurityCheck = () => {
  const issues = [];
  const config = getAllEnv();
  
  // 检查是否使用默认密钥
  if (config.SUPABASE_ANON_KEY && config.SUPABASE_ANON_KEY.length < 50) {
    issues.push('Supabase密钥长度过短，可能存在安全风险');
  }
  
  // 检查是否启用安全功能
  if (!config.ENABLE_SECURITY_HEADERS) {
    issues.push('建议启用安全头配置 (REACT_APP_ENABLE_SECURITY_HEADERS=true)');
  }
  
  if (!config.ENABLE_INPUT_VALIDATION) {
    issues.push('建议启用输入验证 (REACT_APP_ENABLE_INPUT_VALIDATION=true)');
  }
  
  // 检查生产环境配置
  if (process.env.NODE_ENV === 'production') {
    if (config.DEBUG_MODE) {
      issues.push('生产环境建议关闭调试模式');
    }
    
    if (config.USE_MOCK_DATA) {
      issues.push('生产环境不应使用模拟数据');
    }
  }
  
  return {
    hasIssues: issues.length > 0,
    issues
  };
};

/**
 * 检查推荐配置
 */
const checkRecommendations = () => {
  const recommendations = [];
  const config = getAllEnv();
  
  // 性能优化建议
  if (config.MAX_CONCURRENT_TASKS > 5) {
    recommendations.push(`当前并发任务数设置为${config.MAX_CONCURRENT_TASKS}，建议根据服务器性能调整`);
  }
  
  // 文件大小限制建议
  if (config.MAX_FILE_SIZE > 50 * 1024 * 1024) {
    recommendations.push('文件大小限制超过50MB，建议评估服务器存储容量');
  }
  
  // 日志级别建议
  if (process.env.NODE_ENV === 'production' && config.LOG_LEVEL === 'debug') {
    recommendations.push('生产环境建议使用 info 或更高级别的日志级别');
  }
  
  // API配置建议
  if (config.API_TIMEOUT < 10000) {
    recommendations.push('API超时时间设置较短，可能导致网络不稳定时请求失败');
  }
  
  return recommendations;
};

/**
 * 显示配置摘要
 */
const showConfigurationSummary = (result) => {
  console.log('\n📋 环境变量配置摘要:');
  console.log(`   应用环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   API服务: ${result.config.API_BASE_URL || '未配置'}`);
  console.log(`   Supabase: ${result.config.SUPABASE_URL ? '已配置' : '未配置'}`);
  console.log(`   AI校对功能: ${result.config.FEATURE_AI_PROOFREADING ? '启用' : '禁用'}`);
  console.log(`   文件上传: ${result.config.FEATURE_FILE_UPLOAD ? '启用' : '禁用'}`);
  console.log(`   安全头: ${result.config.ENABLE_SECURITY_HEADERS ? '启用' : '禁用'}`);
  console.log(`   输入验证: ${result.config.ENABLE_INPUT_VALIDATION ? '启用' : '禁用'}`);
  console.log(`   分析统计: ${result.config.ENABLE_ANALYTICS ? '启用' : '禁用'}`);
  console.log(`   日志级别: ${result.config.LOG_LEVEL || 'info'}`);
  console.log(`   最大文件大小: ${(result.config.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`);
  console.log(`   最大并发数: ${result.config.MAX_CONCURRENT_TASKS}`);
  console.log(`   初始化时间: ${result.timestamp}`);
  
  if (result.success) {
    console.log('✅ 配置验证通过，应用可以正常启动\n');
  } else {
    console.log('❌ 配置验证失败，请修复配置错误\n');
  }
};

/**
 * 获取环境状态
 */
export const getEnvironmentStatus = () => {
  return {
    isInitialized: envManager.isInitialized,
    config: getAllEnv(),
    validation: validateEnv(),
    timestamp: new Date().toISOString()
  };
};

/**
 * 重新加载环境配置
 */
export const reloadEnvironment = () => {
  envManager.isInitialized = false;
  return initializeEnvironment();
};

export default {
  initializeEnvironment,
  getEnvironmentStatus,
  reloadEnvironment
};