import axios from 'axios';

/**
 * 创建优化的API客户端
 * 包含请求拦截、响应拦截、错误处理和重试机制
 */
const apiClient = axios.create({
  timeout: 30000, // 设置默认超时时间为30秒
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 在请求发送前可以添加token、请求时间戳等
    config.metadata = {
      startTime: new Date().getTime()
    };
    
    // 如果有需要，可以从localStorage或其他地方获取token并添加到请求头
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    // 计算请求耗时
    const endTime = new Date().getTime();
    const duration = endTime - response.config.metadata.startTime;
    
    console.log(
      `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`
    );
    
    // 统一处理响应数据格式
    return response.data;
  },
  error => {
    // 错误处理和重试机制
    const config = error.config;
    
    // 计算请求耗时
    if (config?.metadata) {
      const endTime = new Date().getTime();
      const duration = endTime - config.metadata.startTime;
      console.error(
        `[API Response Error] ${config.method?.toUpperCase()} ${config.url} - ${error?.response?.status || 'Network Error'} (${duration}ms)`
      );
    }
    
    // 如果是网络错误或5xx错误，可以尝试重试
    if (!config || !config.retry) {
      return Promise.reject(error);
    }
    
    // 设置默认重试次数和间隔
    config.retryCount = config.retryCount || 0;
    
    // 检查是否超过最大重试次数
    if (config.retryCount >= config.retry.maxCount) {
      return Promise.reject(error);
    }
    
    // 增加重试次数
    config.retryCount += 1;
    
    // 创建延迟函数
    const backoff = new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, config.retry.delay || 1000); // 默认1秒后重试
    });
    
    console.log(`[API Retry] ${config.method?.toUpperCase()} ${config.url} - Attempt ${config.retryCount}/${config.retry.maxCount}`);
    
    // 延迟后重试请求
    return backoff.then(() => {
      return apiClient(config);
    });
  }
);

/**
 * 创建带重试配置的API请求
 * @param {Object} config - axios配置
 * @param {Object} retryConfig - 重试配置
 * @returns {Promise}
 */
export const requestWithRetry = (config, retryConfig = { maxCount: 3, delay: 1000 }) => {
  return apiClient({
    ...config,
    retry: retryConfig
  });
};

export default apiClient;