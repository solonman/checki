import { extractTextFromDocx, extractTextFromImage } from '../utils/documentParser';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

// Mock dependencies
jest.mock('mammoth');
jest.mock('tesseract.js');

describe('documentParser 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTextFromDocx 函数测试', () => {
    test('应该正确提取docx文件中的文本', async () => {
      const mockFile = new File(['mock content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const mockText = '这是测试文档的内容';
      
      mammoth.extractRawText.mockResolvedValue({ value: mockText });
      
      const result = await extractTextFromDocx(mockFile);
      
      expect(result).toBe(mockText);
      expect(mammoth.extractRawText).toHaveBeenCalledWith(mockFile);
    });

    test('当文件格式不支持时应该抛出错误', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      await expect(extractTextFromDocx(mockFile)).rejects.toThrow('不支持的文件格式');
    });

    test('当提取文本失败时应该抛出错误', async () => {
      const mockFile = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const mockError = new Error('提取失败');
      
      mammoth.extractRawText.mockRejectedValue(mockError);
      
      await expect(extractTextFromDocx(mockFile)).rejects.toThrow('提取失败');
    });

    test('当mammoth返回空文本时应该返回空字符串', async () => {
      const mockFile = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      mammoth.extractRawText.mockResolvedValue({ value: '' });
      
      const result = await extractTextFromDocx(mockFile);
      
      expect(result).toBe('');
    });
  });

  describe('extractTextFromImage 函数测试', () => {
    test('应该正确提取图片中的文本', async () => {
      const mockFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const mockText = '图片中的文字内容';
      
      Tesseract.recognize.mockResolvedValue({
        data: { text: mockText }
      });
      
      const result = await extractTextFromImage(mockFile);
      
      expect(result).toBe(mockText);
      expect(Tesseract.recognize).toHaveBeenCalledWith(mockFile);
    });

    test('当OCR识别失败时应该抛出错误', async () => {
      const mockFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const mockError = new Error('OCR识别失败');
      
      Tesseract.recognize.mockRejectedValue(mockError);
      
      await expect(extractTextFromImage(mockFile)).rejects.toThrow('OCR识别失败');
    });

    test('当图片文件为空时应该返回空字符串', async () => {
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      
      Tesseract.recognize.mockResolvedValue({
        data: { text: '' }
      });
      
      const result = await extractTextFromImage(mockFile);
      
      expect(result).toBe('');
    });

    test('应该处理不同格式的图片文件', async () => {
      const formats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const mockText = '识别的文字';
      
      Tesseract.recognize.mockResolvedValue({
        data: { text: mockText }
      });
      
      for (const format of formats) {
        const mockFile = new File(['image content'], `test.${format.split('/')[1]}`, { type: format });
        const result = await extractTextFromImage(mockFile);
        expect(result).toBe(mockText);
      }
    });
  });

  describe('错误处理测试', () => {
    test('应该正确处理文件读取错误', async () => {
      const invalidFile = null;
      
      await expect(extractTextFromDocx(invalidFile)).rejects.toThrow();
      await expect(extractTextFromImage(invalidFile)).rejects.toThrow();
    });

    test('应该处理网络超时错误', async () => {
      const mockFile = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const timeoutError = new Error('网络超时');
      timeoutError.code = 'ETIMEDOUT';
      
      mammoth.extractRawText.mockRejectedValue(timeoutError);
      
      await expect(extractTextFromDocx(mockFile)).rejects.toThrow('网络超时');
    });
  });
});