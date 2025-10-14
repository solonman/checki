import apiClient, { requestWithRetry } from '../utils/apiClient';
import axios from 'axios';

// Mock axios
jest.mock('axios');

const mockAxios = axios;

// 测试环境变量
process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000/api';
process.env.REACT_APP_OPENAI_API_KEY = 'test-api-key';

describe('API客户端测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('apiClient 实例测试', () => {
    test('应配置正确的基础URL', () => {
      expect(apiClient.defaults.baseURL).toBe('http://localhost:3000/api');
    });

    test('应配置正确的超时时间', () => {
      expect(apiClient.defaults.timeout).toBe(10000);
    });

    test('应配置正确的请求头', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('requestWithRetry 函数测试', () => {
    test('当请求成功时，应立即返回响应', async () => {
      const mockResponse = { data: { success: true } };
      mockAxios.create().request.mockResolvedValue(mockResponse);

      const result = await requestWithRetry({ url: '/test' });

      expect(result).toEqual(mockResponse);
      expect(mockAxios.create().request).toHaveBeenCalledTimes(1);
    });

    test('当请求失败且重试次数未用完时，应进行重试', async () => {
      const mockResponse = { data: { success: true } };
      mockAxios.create().request.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(mockResponse);

      const result = await requestWithRetry({ url: '/test' }, { retries: 3, retryDelay: 10 });

      expect(result).toEqual(mockResponse);
      expect(mockAxios.create().request).toHaveBeenCalledTimes(2);
    });

    test('当请求在最大重试次数后仍然失败时，应抛出最后一个错误', async () => {
      const error = new Error('API Error');
      mockAxios.create().request.mockRejectedValue(error);

      await expect(requestWithRetry({ url: '/test' }, { retries: 2, retryDelay: 10 })).rejects.toThrow('API Error');
      expect(mockAxios.create().request).toHaveBeenCalledTimes(3); // 1次原始请求 + 2次重试
    });

    test('应根据配置使用不同的重试次数和延迟', async () => {
      mockAxios.create().request.mockRejectedValue(new Error('Error'));

      // 存储原始的setTimeout函数
      const originalSetTimeout = global.setTimeout;
      // 使用jest.fn()来模拟setTimeout
      const mockSetTimeout = jest.fn((callback) => callback());
      global.setTimeout = mockSetTimeout;

      try {
        await requestWithRetry({ url: '/test' }, { retries: 1, retryDelay: 100 });
      } catch (error) {
        // 忽略错误，继续测试
      }

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
      global.setTimeout = originalSetTimeout; // 恢复原始函数
    });

    test('应支持OpenAI API请求配置', async () => {
      const mockResponse = { choices: [{ message: { content: 'test response' } }] };
      mockAxios.create().request.mockResolvedValue(mockResponse);

      const result = await requestWithRetry({
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        data: { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'test' }] }
      });

      expect(result).toEqual(mockResponse);
      expect(mockAxios.create().request).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        })
      }));
    });

    test('应正确处理不同的HTTP方法', async () => {
      const mockResponse = { data: { success: true } };
      mockAxios.create().request.mockResolvedValue(mockResponse);

      await requestWithRetry({ url: '/test', method: 'GET' });
      await requestWithRetry({ url: '/test', method: 'POST', data: { test: 'data' } });
      await requestWithRetry({ url: '/test', method: 'PUT', data: { test: 'data' } });
      await requestWithRetry({ url: '/test', method: 'DELETE' });

      expect(mockAxios.create().request).toHaveBeenCalledTimes(4);
      expect(mockAxios.create().request).toHaveBeenNthCalledWith(1, expect.objectContaining({ method: 'GET' }));
      expect(mockAxios.create().request).toHaveBeenNthCalledWith(2, expect.objectContaining({ method: 'POST' }));
      expect(mockAxios.create().request).toHaveBeenNthCalledWith(3, expect.objectContaining({ method: 'PUT' }));
      expect(mockAxios.create().request).toHaveBeenNthCalledWith(4, expect.objectContaining({ method: 'DELETE' }));
    });

    test('应正确处理请求参数', async () => {
      const mockResponse = { data: { success: true } };
      mockAxios.create().request.mockResolvedValue(mockResponse);

      const config = {
        url: '/test',
        method: 'GET',
        params: { page: 1, limit: 10 },
        headers: { 'X-Custom-Header': 'custom-value' }
      };

      await requestWithRetry(config);

      expect(mockAxios.create().request).toHaveBeenCalledWith(expect.objectContaining({
        url: '/test',
        method: 'GET',
        params: { page: 1, limit: 10 },
        headers: expect.objectContaining({
          'X-Custom-Header': 'custom-value'
        })
      }));
    });

    test('应正确处理请求超时', async () => {
      mockAxios.create().request.mockRejectedValue(new Error('timeout'));

      await expect(requestWithRetry({ url: '/test', timeout: 5000 })).rejects.toThrow('timeout');
    });
  });
});