/**
 * 数据库健康检查工具
 * 提供快速、轻量级的数据库连接和状态检查
 */

import supabase from './supabaseClient';

/**
 * 快速健康检查 - 使用轻量级查询
 */
export const quickHealthCheck = async () => {
  try {
    const startTime = Date.now();
    
    // 使用最简单的查询测试连接
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      // 检查是否是表不存在错误
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return {
          success: true,
          status: 'needs_initialization',
          message: '数据库需要初始化',
          responseTime,
          needsInitialization: true
        };
      }
      
      // 其他错误
      return {
        success: false,
        status: 'error',
        message: error.message,
        responseTime,
        needsInitialization: false
      };
    }
    
    return {
      success: true,
      status: 'healthy',
      message: '数据库连接正常',
      responseTime,
      needsInitialization: false
    };
    
  } catch (error) {
    return {
      success: false,
      status: 'exception',
      message: error.message,
      responseTime: null,
      needsInitialization: false
    };
  }
};

/**
 * 深度健康检查 - 检查多个组件
 */
export const deepHealthCheck = async () => {
  const results = {
    overall: false,
    components: {},
    responseTime: null,
    timestamp: new Date().toISOString()
  };
  
  const startTime = Date.now();
  
  try {
    // 1. 检查基本连接
    const connectionCheck = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    results.components.connection = {
      success: !connectionCheck.error,
      message: connectionCheck.error ? connectionCheck.error.message : '连接正常'
    };
    
    // 2. 检查关键表是否存在
    const criticalTables = ['users', 'projects', 'tasks'];
    for (const table of criticalTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        results.components[`table_${table}`] = {
          success: !error,
          message: error ? error.message : '表存在'
        };
      } catch (error) {
        results.components[`table_${table}`] = {
          success: false,
          message: error.message
        };
      }
    }
    
    // 3. 检查存储桶
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      results.components.storage = {
        success: true,
        message: `存储桶数量: ${buckets?.length || 0}`
      };
    } catch (error) {
      results.components.storage = {
        success: false,
        message: error.message
      };
    }
    
    results.responseTime = Date.now() - startTime;
    results.overall = Object.values(results.components).every(comp => comp.success);
    
  } catch (error) {
    results.components.overall = {
      success: false,
      message: error.message
    };
  }
  
  return results;
};

/**
 * 获取数据库状态摘要
 */
export const getDatabaseStatus = async () => {
  try {
    const quickCheck = await quickHealthCheck();
    
    if (!quickCheck.success) {
      return {
        status: 'error',
        message: quickCheck.message,
        canContinue: true, // 即使错误也允许继续
        needsInitialization: false
      };
    }
    
    if (quickCheck.needsInitialization) {
      return {
        status: 'needs_initialization',
        message: '数据库需要初始化',
        canContinue: true,
        needsInitialization: true
      };
    }
    
    return {
      status: 'healthy',
      message: `数据库连接正常 (${quickCheck.responseTime}ms)`,
      canContinue: true,
      needsInitialization: false,
      responseTime: quickCheck.responseTime
    };
    
  } catch (error) {
    return {
      status: 'unknown',
      message: error.message,
      canContinue: true,
      needsInitialization: false
    };
  }
};