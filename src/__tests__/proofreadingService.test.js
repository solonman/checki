import { proofreadTextWithOpenAI, generateMockProofreadingResult, checkBrandKeywords } from '../utils/proofreadingService';
import { requestWithRetry } from '../utils/apiClient';

// Mock the apiClient
jest.mock('../utils/apiClient');

// 测试环境变量
process.env.REACT_APP_OPENAI_API_KEY = 'test-api-key';

describe('校对服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('proofreadTextWithOpenAI 函数测试', () => {
    test('当API调用成功时，应返回解析的结果', async () => {
      // Mock API 响应
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                errors: [{ type: 'spelling', original: '测试', corrected: '测试文本', position: 0, context: '测试内容', suggestion: '建议' }],
                statistics: { totalErrors: 1, spellingErrors: 1, grammarErrors: 0, punctuationErrors: 0, accuracyRate: 99 },
                summary: '校对完成'
              })
            }
          }
        ]
      };

      requestWithRetry.mockResolvedValue(mockApiResponse);

      const result = await proofreadTextWithOpenAI('测试内容', '测试项目');

      expect(result).toEqual({
        errors: [{ type: 'spelling', original: '测试', corrected: '测试文本', position: 0, context: '测试内容', suggestion: '建议' }],
        statistics: { totalErrors: 1, spellingErrors: 1, grammarErrors: 0, punctuationErrors: 0, accuracyRate: 99 },
        summary: '校对完成'
      });
    });

    test('当API返回的JSON格式无效时，应使用模拟结果', async () => {
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: '无效的JSON格式'
            }
          }
        ]
      };

      requestWithRetry.mockResolvedValue(mockApiResponse);

      const result = await proofreadTextWithOpenAI('测试内容', '测试项目');

      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('summary');
    });

    test('当API调用失败时，应使用模拟结果', async () => {
      requestWithRetry.mockRejectedValue(new Error('API调用失败'));

      const result = await proofreadTextWithOpenAI('测试内容', '测试项目');

      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('summary');
    });

    test('当未提供项目名称时，应使用默认项目名称', async () => {
      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                errors: [],
                statistics: { totalErrors: 0, spellingErrors: 0, grammarErrors: 0, punctuationErrors: 0, accuracyRate: 100 },
                summary: '文档完美'
              })
            }
          }
        ]
      };

      requestWithRetry.mockResolvedValue(mockApiResponse);

      await proofreadTextWithOpenAI('测试内容');

      expect(requestWithRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                content: expect.stringContaining('通用项目')
              })
            ])
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('generateMockProofreadingResult 函数测试', () => {
    test('应返回有效的模拟校对结果对象', () => {
      const result = generateMockProofreadingResult('测试文本内容');

      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.statistics).toBe('object');
      expect(typeof result.summary).toBe('string');
    });

    test('返回的错误数量应基于文本长度', () => {
      const shortTextResult = generateMockProofreadingResult('短文本');
      const longTextResult = generateMockProofreadingResult('这是一段更长的文本内容，用于测试模拟校对结果的错误数量是否与文本长度相关。这应该会生成更多的模拟错误。');

      expect(shortTextResult.errors.length).toBeLessThanOrEqual(5);
      expect(longTextResult.errors.length).toBeGreaterThan(shortTextResult.errors.length);
    });

    test('当没有错误时，应返回适当的总结', () => {
      // Mock Math.random to always return 0 (no errors)
      const originalRandom = Math.random;
      Math.random = () => 0;

      const result = generateMockProofreadingResult('');

      expect(result.summary).toContain('文档质量优秀');

      // 恢复原始的Math.random
      Math.random = originalRandom;
    });
  });

  describe('checkBrandKeywords 函数测试', () => {
    test('应返回文本中包含的所有关键词及其位置', () => {
      const text = '这是瑞府项目的宣传文案，瑞府位于城市中心地带。';
      const keywords = ['瑞府', '城市中心'];

      const results = checkBrandKeywords(text, keywords);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        keyword: '瑞府',
        position: 2,
        context: expect.stringContaining('瑞府')
      });
      expect(results[1]).toEqual({
        keyword: '城市中心',
        position: 15,
        context: expect.stringContaining('城市中心')
      });
    });

    test('当没有关键词时，应返回空数组', () => {
      const results = checkBrandKeywords('测试文本', []);
      expect(results).toEqual([]);
    });

    test('当关键词为空时，应返回空数组', () => {
      const results = checkBrandKeywords('测试文本');
      expect(results).toEqual([]);
    });

    test('应忽略关键词的大小写', () => {
      const text = '这是瑞府项目，也可以称为瑞府花园。';
      const keywords = ['瑞府'];

      const results = checkBrandKeywords(text, keywords);

      expect(results).toHaveLength(2);
      expect(results[0].keyword).toBe('瑞府');
      expect(results[1].keyword).toBe('瑞府');
    });
  });
});