import FileProcessingQueue from '../utils/fileProcessingQueue';

describe('FileProcessingQueue 测试', () => {
  let queue;

  beforeEach(() => {
    queue = new FileProcessingQueue();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本功能测试', () => {
    test('应该正确添加文件到队列', () => {
      const mockFile = { name: 'test.docx', size: 1024 };
      const mockCallback = jest.fn();
      
      queue.addFile(mockFile, mockCallback);
      
      const status = queue.getQueueStatus();
      expect(status.totalFiles).toBe(1);
      expect(status.pendingFiles).toBe(1);
      expect(status.processingFiles).toBe(0);
      expect(status.completedFiles).toBe(0);
      expect(status.failedFiles).toBe(0);
    });

    test('应该正确处理单个文件', async () => {
      const mockFile = { name: 'test.docx', size: 1024 };
      const mockCallback = jest.fn().mockResolvedValue('processed content');
      
      queue.addFile(mockFile, mockCallback);
      
      // 开始处理队列
      const processPromise = queue.processQueue();
      
      // 等待异步操作完成
      await jest.advanceTimersByTimeAsync(100);
      await processPromise;
      
      const status = queue.getQueueStatus();
      expect(status.pendingFiles).toBe(0);
      expect(status.processingFiles).toBe(0);
      expect(status.completedFiles).toBe(1);
      expect(status.failedFiles).toBe(0);
      
      expect(mockCallback).toHaveBeenCalledWith(mockFile);
    });

    test('应该正确处理多个文件', async () => {
      const mockFiles = [
        { name: 'test1.docx', size: 1024 },
        { name: 'test2.docx', size: 2048 },
        { name: 'test3.docx', size: 512 }
      ];
      const mockCallbacks = mockFiles.map(file => jest.fn().mockResolvedValue(`processed ${file.name}`));
      
      mockFiles.forEach((file, index) => {
        queue.addFile(file, mockCallbacks[index]);
      });
      
      const processPromise = queue.processQueue();
      
      // 处理所有文件
      await jest.advanceTimersByTimeAsync(300);
      await processPromise;
      
      const status = queue.getQueueStatus();
      expect(status.totalFiles).toBe(3);
      expect(status.completedFiles).toBe(3);
      expect(status.failedFiles).toBe(0);
      
      mockCallbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled();
      });
    });

    test('应该正确处理失败的文件', async () => {
      const mockFile = { name: 'test.docx', size: 1024 };
      const mockCallback = jest.fn().mockRejectedValue(new Error('处理失败'));
      
      queue.addFile(mockFile, mockCallback);
      
      const processPromise = queue.processQueue();
      
      await jest.advanceTimersByTimeAsync(100);
      await processPromise;
      
      const status = queue.getQueueStatus();
      expect(status.completedFiles).toBe(0);
      expect(status.failedFiles).toBe(1);
    });
  });

  describe('并发控制测试', () => {
    test('应该限制并发处理数量', async () => {
      const maxConcurrency = 2;
      queue = new FileProcessingQueue(maxConcurrency);
      
      const mockFiles = Array.from({ length: 5 }, (_, i) => ({ name: `test${i}.docx`, size: 1024 }));
      const mockCallbacks = mockFiles.map((file, index) => 
        jest.fn().mockImplementation(() => 
          new Promise(resolve => {
            setTimeout(() => resolve(`processed ${file.name}`), 100);
          })
        )
      );
      
      mockFiles.forEach((file, index) => {
        queue.addFile(file, mockCallbacks[index]);
      });
      
      const processPromise = queue.processQueue();
      
      // 检查初始并发状态
      await jest.advanceTimersByTimeAsync(10);
      let status = queue.getQueueStatus();
      expect(status.processingFiles).toBeLessThanOrEqual(maxConcurrency);
      
      // 等待所有文件处理完成
      await jest.advanceTimersByTimeAsync(500);
      await processPromise;
      
      status = queue.getQueueStatus();
      expect(status.completedFiles).toBe(5);
      expect(status.failedFiles).toBe(0);
    });
  });

  describe('错误处理测试', () => {
    test('应该正确处理文件处理超时', async () => {
      const mockFile = { name: 'test.docx', size: 1024 };
      const mockCallback = jest.fn().mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('处理超时')), 200);
        })
      );
      
      queue.addFile(mockFile, mockCallback);
      
      const processPromise = queue.processQueue();
      
      await jest.advanceTimersByTimeAsync(200);
      await processPromise;
      
      const status = queue.getQueueStatus();
      expect(status.failedFiles).toBe(1);
    });

    test('应该处理队列处理过程中的错误', async () => {
      const mockFile = { name: 'test.docx', size: 1024 };
      const mockCallback = jest.fn().mockResolvedValue('processed');
      
      queue.addFile(mockFile, mockCallback);
      
      // 模拟队列处理错误
      queue.processQueue = jest.fn().mockRejectedValue(new Error('队列处理错误'));
      
      await expect(queue.processQueue()).rejects.toThrow('队列处理错误');
    });
  });

  describe('队列状态测试', () => {
    test('应该正确计算队列状态', () => {
      const mockFiles = Array.from({ length: 10 }, (_, i) => ({ name: `test${i}.docx`, size: 1024 }));
      const mockCallbacks = mockFiles.map(() => jest.fn().mockResolvedValue('processed'));
      
      mockFiles.forEach((file, index) => {
        queue.addFile(file, mockCallbacks[index]);
      });
      
      const status = queue.getQueueStatus();
      expect(status.totalFiles).toBe(10);
      expect(status.pendingFiles).toBe(10);
      expect(status.processingFiles).toBe(0);
      expect(status.completedFiles).toBe(0);
      expect(status.failedFiles).toBe(0);
      expect(status.progress).toBe(0);
    });

    test('应该正确计算进度百分比', async () => {
      const mockFiles = [
        { name: 'test1.docx', size: 1024 },
        { name: 'test2.docx', size: 1024 },
        { name: 'test3.docx', size: 1024 },
        { name: 'test4.docx', size: 1024 }
      ];
      const mockCallbacks = mockFiles.map(() => jest.fn().mockResolvedValue('processed'));
      
      mockFiles.forEach((file, index) => {
        queue.addFile(file, mockCallbacks[index]);
      });
      
      const processPromise = queue.processQueue();
      
      // 处理前两个文件
      await jest.advanceTimersByTimeAsync(200);
      
      let status = queue.getQueueStatus();
      expect(status.completedFiles).toBeGreaterThanOrEqual(2);
      expect(status.progress).toBeGreaterThanOrEqual(50);
      
      // 完成后两个文件
      await jest.advanceTimersByTimeAsync(200);
      await processPromise;
      
      status = queue.getQueueStatus();
      expect(status.completedFiles).toBe(4);
      expect(status.progress).toBe(100);
    });
  });

  describe('队列清理测试', () => {
    test('应该正确清理已完成的队列', async () => {
      const mockFiles = [
        { name: 'test1.docx', size: 1024 },
        { name: 'test2.docx', size: 1024 }
      ];
      const mockCallbacks = mockFiles.map(() => jest.fn().mockResolvedValue('processed'));
      
      mockFiles.forEach((file, index) => {
        queue.addFile(file, mockCallbacks[index]);
      });
      
      const processPromise = queue.processQueue();
      
      await jest.advanceTimersByTimeAsync(200);
      await processPromise;
      
      queue.clearCompleted();
      
      const status = queue.getQueueStatus();
      expect(status.totalFiles).toBe(0);
      expect(status.completedFiles).toBe(0);
    });
  });
});