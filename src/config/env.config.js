/**
 * 环境变量配置管理
 * 集中管理所有环境变量，提供验证和默认值
 */

// 环境变量配置定义
const ENV_CONFIG = {
  // API配置
  API_BASE_URL: {
    name: 'REACT_APP_API_URL',
    default: 'http://localhost:5000/api',
    required: true,
    description: 'API服务基础地址'
  },
  
  // Supabase配置
  SUPABASE_URL: {
    name: 'REACT_APP_SUPABASE_URL',
    default: '',
    required: true,
    description: 'Supabase数据库URL'
  },
  
  SUPABASE_ANON_KEY: {
    name: 'REACT_APP_SUPABASE_ANON_KEY',
    default: '',
    required: true,
    description: 'Supabase匿名访问密钥',
    sensitive: true
  },
  
  // OpenAI配置（服务端使用）
  OPENAI_API_KEY: {
    name: 'REACT_APP_OPENAI_API_KEY',
    default: '',
    required: false,
    description: 'OpenAI API密钥（仅服务端使用）',
    sensitive: true
  },
  
  // 应用配置
  NODE_ENV: {
    name: 'NODE_ENV',
    default: 'development',
    required: false,
    description: '应用环境'
  },
  
  // 功能开关
  FEATURE_AI_PROOFREADING: {
    name: 'REACT_APP_FEATURE_AI_PROOFREADING',
    default: 'true',
    required: false,
    description: 'AI校对功能开关'
  },
  
  FEATURE_FILE_UPLOAD: {
    name: 'REACT_APP_FEATURE_FILE_UPLOAD',
    default: 'true',
    required: false,
    description: '文件上传功能开关'
  },
  
  // 性能配置
  MAX_FILE_SIZE: {
    name: 'REACT_APP_MAX_FILE_SIZE',
    default: '10485760', // 10MB
    required: false,
    description: '最大文件大小（字节）'
  },
  
  MAX_CONCURRENT_TASKS: {
    name: 'REACT_APP_MAX_CONCURRENT_TASKS',
    default: '3',
    required: false,
    description: '最大并发任务数'
  },
  
  // 安全配置
  ENABLE_SECURITY_HEADERS: {
    name: 'REACT_APP_ENABLE_SECURITY_HEADERS',
    default: 'true',
    required: false,
    description: '启用安全头'
  },
  
  ENABLE_INPUT_VALIDATION: {
    name: 'REACT_APP_ENABLE_INPUT_VALIDATION',
    default: 'true',
    required: false,
    description: '启用输入验证'
  },
  
  // 监控配置
  ENABLE_ANALYTICS: {
    name: 'REACT_APP_ENABLE_ANALYTICS',
    default: 'false',
    required: false,
    description: '启用分析统计'
  },
  
  LOG_LEVEL: {
    name: 'REACT_APP_LOG_LEVEL',
    default: 'info',
    required: false,
    description: '日志级别'
  }
};

/**
 * 环境变量管理器
 */
class EnvironmentManager {
  constructor() {
    this.config = {};
    this.errors = [];
    this.warnings = [];
    this.isInitialized = false;
  }
  
  /**
   * 初始化环境变量
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }
    
    this.errors = [];
    this.warnings = [];
    
    // 加载所有环境变量
    Object.keys(ENV_CONFIG).forEach(key => {
      const config = ENV_CONFIG[key];
      const value = this.loadEnvironmentVariable(config);
      this.config[key] = value;
      
      // 验证必填项
      if (config.required && !value) {
        this.errors.push(`缺少必填环境变量: ${config.name} (${config.description})`);
      }
      
      // 敏感信息警告
      if (config.sensitive && value && value.length < 10) {
        this.warnings.push(`环境变量 ${config.name} 可能使用了弱密钥`);
      }
    });
    
    this.isInitialized = true;
    
    // 输出配置信息
    this.logConfiguration();
  }
  
  /**
   * 加载单个环境变量
   */
  loadEnvironmentVariable(config) {
    const envValue = process.env[config.name];
    
    if (envValue !== undefined && envValue !== null) {
      return this.parseValue(envValue, config);
    }
    
    return this.parseValue(config.default, config);
  }
  
  /**
   * 解析值类型
   */
  parseValue(value, config) {
    if (value === '' || value === null || value === undefined) {
      return value;
    }
    
    // 布尔值转换
    if (config.default === 'true' || config.default === 'false') {
      return value === 'true';
    }
    
    // 数字转换
    if (!isNaN(config.default) && !isNaN(value)) {
      return Number(value);
    }
    
    return value;
  }
  
  /**
   * 获取环境变量
   */
  get(key, defaultValue = null) {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }
  
  /**
   * 获取所有配置
   */
  getAll() {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    return { ...this.config };
  }
  
  /**
   * 获取敏感信息（脱敏显示）
   */
  getSensitive(key) {
    const value = this.get(key);
    if (!value) return value;
    
    const config = ENV_CONFIG[key];
    if (config && config.sensitive) {
      // 脱敏显示：显示前4位和后4位，中间用*代替
      if (value.length > 8) {
        return `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}`;
      }
      return '*'.repeat(value.length);
    }
    
    return value;
  }
  
  /**
   * 验证配置
   */
  validate() {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }
  
  /**
   * 记录配置信息
   */
  logConfiguration() {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== 环境变量配置 ===');
      
      Object.keys(ENV_CONFIG).forEach(key => {
        const config = ENV_CONFIG[key];
        const value = config.sensitive ? this.getSensitive(key) : this.get(key);
        console.log(`${config.name}: ${value} (${config.description})`);
      });
      
      if (this.warnings.length > 0) {
        console.warn('配置警告:', this.warnings);
      }
      
      if (this.errors.length > 0) {
        console.error('配置错误:', this.errors);
      }
      
      console.log('====================');
    }
  }
  
  /**
   * 检查功能开关
   */
  isFeatureEnabled(featureKey) {
    return this.get(featureKey, false);
  }
  
  /**
   * 获取API配置
   */
  getApiConfig() {
    return {
      baseUrl: this.get('API_BASE_URL'),
      timeout: this.get('API_TIMEOUT', 30000),
      retries: this.get('API_RETRIES', 3)
    };
  }
  
  /**
   * 获取文件上传配置
   */
  getUploadConfig() {
    return {
      maxFileSize: this.get('MAX_FILE_SIZE'),
      allowedTypes: this.get('ALLOWED_FILE_TYPES', 'pdf,doc,docx,txt'),
      concurrentLimit: this.get('MAX_CONCURRENT_TASKS')
    };
  }
  
  /**
   * 获取安全配置
   */
  getSecurityConfig() {
    return {
      enableSecurityHeaders: this.get('ENABLE_SECURITY_HEADERS'),
      enableInputValidation: this.get('ENABLE_INPUT_VALIDATION'),
      enableAnalytics: this.get('ENABLE_ANALYTICS')
    };
  }
}

// 创建单例实例
const envManager = new EnvironmentManager();

// 导出便捷函数
export const getEnv = (key, defaultValue) => envManager.get(key, defaultValue);
export const getAllEnv = () => envManager.getAll();
export const validateEnv = () => envManager.validate();
export const getSensitiveEnv = (key) => envManager.getSensitive(key);
export const isFeatureEnabled = (featureKey) => envManager.isFeatureEnabled(featureKey);
export const getApiConfig = () => envManager.getApiConfig();
export const getUploadConfig = () => envManager.getUploadConfig();
export const getSecurityConfig = () => envManager.getSecurityConfig();

// 导出管理器实例
export default envManager;