import { processFile, processFileWithProgress, createTaskProgressWrapper } from '../utils/fileProcessingQueue';
import { parseDocument } from '../utils/documentParser';
import { proofreadTextWithOpenAI } from '../utils/proofreadingService';

// Mock 依赖的模块
jest.mock('../utils/documentParser');
jest.mock('../utils/proofreadingService');

const mockParseDocument = parseDocument;
const mockProofreadTextWithOpenAI = proofreadTextWithOpenAI;

describe('文件处理集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processFile 函数测试', () => {
    test('应正确处理文件并返回校对结果', async () => {
      const mockFile = new File(['测试内容'], 'test.txt', { type: 'text/plain' });
      const mockParsedContent = '解析后的测试内容';
      const mockProofreadingResult = {
        errors: [],
        statistics: { totalErrors: 0, accuracyRate: 100 },
        summary: '文档完美'
      };

      mockParseDocument.mockResolvedValue(mockParsedContent);
      mockProofreadTextWithOpenAI.mockResolvedValue(mockProofreadingResult);

      const result = await processFile(mockFile, '测试项目');

      expect(result).toEqual({
        fileName: 'test.txt',
        fileType: 'text/plain',
        content: mockParsedContent,
        proofreadingResult: mockProofreadingResult
      });
      expect(mockParseDocument).toHaveBeenCalledWith(mockFile);
      expect(mockProofreadTextWithOpenAI).toHaveBeenCalledWith(mockParsedContent, '测试项目');
    });

    test('当解析文档失败时，应抛出错误', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const parseError = new Error('解析失败');

      mockParseDocument.mockRejectedValue(parseError);

      await expect(processFile(mockFile)).rejects.toThrow('解析失败');
      expect(mockProofreadTextWithOpenAI).not.toHaveBeenCalled();
    });

    test('当校对文本失败时，应抛出错误', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockParsedContent = '解析后的内容';
      const proofreadError = new Error('校对失败');

      mockParseDocument.mockResolvedValue(mockParsedContent);
      mockProofreadTextWithOpenAI.mockRejectedValue(proofreadError);

      await expect(processFile(mockFile)).rejects.toThrow('校对失败');
    });

    test('应支持不同类型的文件', async () => {
      const mockTextFile = new File(['text content'], 'test.txt', { type: 'text/plain' });
      const mockDocxFile = new File(['docx content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const mockParsedContent = '解析后的内容';
      const mockProofreadingResult = {
        errors: [],
        statistics: { totalErrors: 0, accuracyRate: 100 },
        summary: '文档完美'
      };

      mockParseDocument.mockResolvedValue(mockParsedContent);
      mockProofreadTextWithOpenAI.mockResolvedValue(mockProofreadingResult);

      const textResult = await processFile(mockTextFile);
      const docxResult = await processFile(mockDocxFile);

      expect(textResult.fileName).toBe('test.txt');
      expect(textResult.fileType).toBe('text/plain');
      expect(docxResult.fileName).toBe('test.docx');
      expect(docxResult.fileType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });

  describe('processFileWithProgress 函数测试', () => {
    test('应正确处理文件并报告进度', async () => {
      const mockFile = new File(['测试内容'], 'test.txt', { type: 'text/plain' });
      const mockParsedContent = '解析后的测试内容';
      const mockProofreadingResult = {
        errors: [],
        statistics: { totalErrors: 0, accuracyRate: 100 },
        summary: '文档完美'
      };
      const mockProgressCallback = jest.fn();

      mockParseDocument.mockResolvedValue(mockParsedContent);
      mockProofreadTextWithOpenAI.mockResolvedValue(mockProofreadingResult);

      const result = await processFileWithProgress(mockFile, '测试项目', mockProgressCallback);

      expect(result).toEqual({
        fileName: 'test.txt',
        fileType: 'text/plain',
        content: mockParsedContent,
        proofreadingResult: mockProofreadingResult
      });
      expect(mockProgressCallback).toHaveBeenCalledWith({ stage: 'parsing', progress: 50 });
      expect(mockProgressCallback).toHaveBeenCalledWith({ stage: 'proofreading', progress: 80 });
      expect(mockProgressCallback).toHaveBeenCalledWith({ stage: 'complete', progress: 100 });
    });

    test('当进度回调未提供时，仍应正常工作', async () => {
      const mockFile = new File(['测试内容'], 'test.txt', { type: 'text/plain' });
      const mockParsedContent = '解析后的测试内容';
      const mockProofreadingResult = {
        errors: [],
        statistics: { totalErrors: 0, accuracyRate: 100 },
        summary: '文档完美'
      };

      mockParseDocument.mockResolvedValue(mockParsedContent);
      mockProofreadTextWithOpenAI.mockResolvedValue(mockProofreadingResult);

      const result = await processFileWithProgress(mockFile, '测试项目');

      expect(result).toEqual({
        fileName: 'test.txt',
        fileType: 'text/plain',
        content: mockParsedContent,
        proofreadingResult: mockProofreadingResult
      });
    });

    test('当处理失败时，应调用进度回调并报告错误', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const parseError = new Error('解析失败');
      const mockProgressCallback = jest.fn();

      mockParseDocument.mockRejectedValue(parseError);

      await expect(processFileWithProgress(mockFile, '测试项目', mockProgressCallback)).rejects.toThrow('解析失败');
      expect(mockProgressCallback).toHaveBeenCalledWith(expect.objectContaining({ stage: 'error' }));
    });
  });

  describe('createTaskProgressWrapper 函数测试', () => {
    test('应创建正确的进度包装函数', () => {
      const mockProgressCallback = jest.fn();
      const wrapper = createTaskProgressWrapper('test-task', mockProgressCallback);

      expect(typeof wrapper).toBe('function');

      wrapper(50);

      expect(mockProgressCallback).toHaveBeenCalledWith({
        taskId: 'test-task',
        progress: 50,
        timestamp: expect.any(Number)
      });
    });

    test('应处理不同的进度值', () => {
      const mockProgressCallback = jest.fn();
      const wrapper = createTaskProgressWrapper('test-task', mockProgressCallback);

      wrapper(0);
      wrapper(25);
      wrapper(50);
      wrapper(75);
      wrapper(100);

      expect(mockProgressCallback).toHaveBeenCalledTimes(5);
      expect(mockProgressCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({ progress: 0 }));
      expect(mockProgressCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({ progress: 25 }));
      expect(mockProgressCallback).toHaveBeenNthCalledWith(3, expect.objectContaining({ progress: 50 }));
      expect(mockProgressCallback).toHaveBeenNthCalledWith(4, expect.objectContaining({ progress: 75 }));
      expect(mockProgressCallback).toHaveBeenNthCalledWith(5, expect.objectContaining({ progress: 100 }));
    });

    test('应生成唯一的时间戳', () => {
      const mockProgressCallback = jest.fn();
      const wrapper = createTaskProgressWrapper('test-task', mockProgressCallback);
      
      // 存储原始的Date.now函数
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1000).mockImplementationOnce(() => 1000).mockImplementationOnce(() => 2000);

      wrapper(0);
      wrapper(100);

      expect(mockProgressCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({ timestamp: 1000 }));
      expect(mockProgressCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({ timestamp: 2000 }));

      // 恢复原始函数
      Date.now = originalDateNow;
    });

    test('当未提供进度回调时，仍应创建包装函数但不调用回调', () => {
      const wrapper = createTaskProgressWrapper('test-task');

      expect(typeof wrapper).toBe('function');

      // 调用包装函数不应抛出错误
      expect(() => wrapper(50)).not.toThrow();
    });
  });

  describe('文件处理和校对集成测试', () => {
    test('应完整处理文件从上传到校对的整个流程', async () => {
      const mockFile = new File(['这是一段测试文案，其中包含一些错误。'], 'test.txt', { type: 'text/plain' });
      const mockParsedContent = '这是一段测试文案，其中包含一些错误。';
      const mockProofreadingResult = {
        errors: [{
          type: 'grammar',
          original: '包含一些错误',
          corrected: '包含一些语法错误',
          position: 10,
          context: '测试文案，其中包含一些错误。',
          suggestion: '建议改为：包含一些语法错误'
        }],
        statistics: {
          totalErrors: 1,
          spellingErrors: 0,
          grammarErrors: 1,
          punctuationErrors: 0,
          accuracyRate: 98
        },
        summary: '文档质量良好，发现1处语法错误'
      };

      mockParseDocument.mockResolvedValue(mockParsedContent);
      mockProofreadTextWithOpenAI.mockResolvedValue(mockProofreadingResult);

      const result = await processFile(mockFile, '测试项目');

      // 验证整个流程的集成结果
      expect(result.fileName).toBe('test.txt');
      expect(result.content).toBe(mockParsedContent);
      expect(result.proofreadingResult).toBe(mockProofreadingResult);
      expect(result.proofreadingResult.errors).toHaveLength(1);
      expect(result.proofreadingResult.statistics.totalErrors).toBe(1);
    });

    test('应处理空文档的情况', async () => {
      const mockFile = new File([''], 'empty.txt', { type: 'text/plain' });
      const mockParsedContent = '';
      const mockProofreadingResult = {
        errors: [],
        statistics: { totalErrors: 0, accuracyRate: 100 },
        summary: '文档为空'
      };

      mockParseDocument.mockResolvedValue(mockParsedContent);
      mockProofreadTextWithOpenAI.mockResolvedValue(mockProofreadingResult);

      const result = await processFile(mockFile);

      expect(result.content).toBe('');
      expect(result.proofreadingResult.errors).toHaveLength(0);
      expect(result.proofreadingResult.statistics.accuracyRate).toBe(100);
    });
  });
});