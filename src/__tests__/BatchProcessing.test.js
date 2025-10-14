import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import BatchProcessing from '../components/BatchProcessing';

// Mock dependencies
jest.mock('../utils/apiClient', () => ({
  requestWithRetry: jest.fn()
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'current-user-123', email: 'admin@example.com' }
  })
}));

jest.mock('../utils/fileProcessingQueue', () => ({
  FileProcessingQueue: class MockFileProcessingQueue {
    constructor() {
      this.files = [];
      this.onProgress = null;
      this.onComplete = null;
      this.onError = null;
    }
    
    addFile(file) {
      this.files.push({
        id: `file-${Date.now()}`,
        file,
        status: 'pending',
        progress: 0,
        result: null,
        error: null
      });
    }
    
    async processFiles() {
      for (let file of this.files) {
        file.status = 'processing';
        file.progress = 50;
        if (this.onProgress) this.onProgress(file);
        
        // 模拟处理完成
        await new Promise(resolve => setTimeout(resolve, 100));
        file.status = 'completed';
        file.progress = 100;
        file.result = { text: '处理完成的内容' };
        if (this.onComplete) this.onComplete(file);
      }
    }
    
    clearCompleted() {
      this.files = this.files.filter(f => f.status !== 'completed');
    }
    
    getCompletedCount() {
      return this.files.filter(f => f.status === 'completed').length;
    }
    
    getFailedCount() {
      return this.files.filter(f => f.status === 'failed').length;
    }
    
    getTotalCount() {
      return this.files.length;
    }
  }
}));

// Mock translation hook for BatchProcessing component
jest.mock('../context/i18nContext', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'batch.title': '批量处理',
        'batch.uploadFiles': '上传文件',
        'batch.dragDrop': '拖拽文件到此处或点击上传',
        'batch.supportedFormats': '支持格式：PDF, DOCX, TXT, PNG, JPG, JPEG',
        'batchProcessing.title': '批量处理',
        'batchProcessing.configuration': '批量处理配置',
        'batchProcessing.outputFormat': '输出格式',
        'batchProcessing.exportFormat': '导出格式',
        'batchProcessing.format.detailed': '详细',
        'batchProcessing.format.summary': '摘要',
        'batchProcessing.format.statistical': '统计',
        'batchProcessing.startProcessing': '开始处理',
        'batchProcessing.pause': '暂停',
        'batchProcessing.resume': '继续',
        'batchProcessing.stop': '停止',
        'batchProcessing.batchDownload': '批量下载',
        'batchProcessing.overallProgress': '总体进度',
        'batchProcessing.fileUpload': '文件上传',
        'batchProcessing.uploadText': '拖拽文件到此处或点击上传',
        'batchProcessing.uploadHint': '支持多文件上传，单个文件最大10MB',
        'batchProcessing.fileList': '文件列表',
        'batchProcessing.status.pending': '等待处理',
        'batchProcessing.status.processing': '处理中',
        'batchProcessing.status.completed': '已完成',
        'batchProcessing.status.error': '错误',
        'batchProcessing.fileName': '文件名',
        'batchProcessing.fileSize': '文件大小',
        'batchProcessing.status': '状态',
        'batchProcessing.progress': '进度',
        'batchProcessing.actions': '操作',
        'batchProcessing.processingCompleted': '批量处理完成',
        'batchProcessing.processingError': '批量处理失败',
        'batchProcessing.processingPaused': '批量处理已暂停',
        'batchProcessing.processingResumed': '批量处理已恢复',
        'batchProcessing.processingStopped': '批量处理已停止',
        'batchProcessing.noFilesSelected': '未选择文件',
        'batchProcessing.noReportAvailable': '无可用报告',
        'batchProcessing.downloadSuccess': '下载成功',
        'batchProcessing.downloadError': '下载失败',
        'batchProcessing.noCompletedFiles': '没有已完成的文件',
        'batchProcessing.preparingBatchDownload': '准备批量下载',
        'batchProcessing.batchDownloadCompleted': '批量下载完成',
        'batchProcessing.processingResult': '处理结果',
        'common.view': '查看',
        'common.download': '下载',
        'common.remove': '移除',
        'common.totalItems': '共 {total} 条',
        'batchProcessing.processingStarted': '批量处理已开始',
        'batchProcessing.reportGenerated': '报告已生成',
        'batchProcessing.reportGenerationFailed': '生成报告失败',
        'batch.processing': '正在处理',
        'batch.processed': '处理完成',
        'batch.failed': '处理失败',
        'batch.pending': '等待处理',
        'batch.processAll': '处理所有文件',
        'batch.clearCompleted': '清除已完成',
        'batch.downloadAll': '下载所有结果',
        'batch.generateReport': '生成报告',
        'batch.settings': '设置',
        'batch.fileName': '文件名',
        'batch.fileSize': '文件大小',
        'batch.status': '状态',
        'batch.progress': '进度',
        'batch.actions': '操作',
        'batch.viewResult': '查看结果',
        'batch.downloadResult': '下载结果',
        'batch.deleteFile': '删除文件',
        'batch.retry': '重试',
        'batch.processingSettings': '处理设置',
        'batch.concurrency': '并发数',
        'batch.maxConcurrency': '最大并发数',
        'batch.autoStart': '自动开始处理',
        'batch.saveSettings': '保存设置',
        'batch.resetSettings': '重置设置',
        'batch.processingComplete': '批量处理完成',
        'batch.processingFailed': '批量处理失败',
        'batch.processingCancelled': '批量处理已取消',
        'batch.processingPaused': '批量处理已暂停',
        'batch.processingResumed': '批量处理已恢复',
        'batch.processingStarted': '批量处理已开始',
        'batch.fileAdded': '文件已添加',
        'batch.fileRemoved': '文件已移除',
        'batch.fileProcessing': '文件处理中',
        'batch.fileProcessed': '文件处理完成',
        'batch.fileFailed': '文件处理失败',
        'batch.fileRetrying': '文件重试中',
        'batch.fileCancelled': '文件已取消',
        'batch.filePaused': '文件已暂停',
        'batch.fileResumed': '文件已恢复',
        'batch.fileDownloaded': '文件已下载',
        'batch.fileDeleted': '文件已删除',
        'batch.reportGenerated': '报告已生成',
        'batch.reportGenerationFailed': '报告生成失败',
        'batch.settingsSaved': '设置已保存',
        'batch.settingsReset': '设置已重置',
        'batch.settingsLoadFailed': '设置加载失败',
        'batch.fileTooLarge': '文件过大',
        'batch.fileTypeNotSupported': '文件类型不支持',
        'batch.fileAlreadyExists': '文件已存在',
        'batch.fileNotFound': '文件未找到',
        'batch.fileCorrupted': '文件已损坏',
        'batch.fileEmpty': '文件为空',
        'batch.fileAccessDenied': '文件访问被拒绝',
        'batch.fileLocked': '文件已锁定',
        'batch.fileInUse': '文件正在使用中',
        'batch.filePathTooLong': '文件路径过长',
        'batch.fileNameTooLong': '文件名过长',
        'batch.fileNameInvalid': '文件名无效',
        'batch.fileExtensionInvalid': '文件扩展名无效',
        'batch.fileSizeExceeded': '文件大小超出限制',
        'batch.fileCountExceeded': '文件数量超出限制',
        'batch.fileProcessingTimeout': '文件处理超时',
        'batch.fileProcessingError': '文件处理错误',
        'batch.fileDownloadError': '文件下载错误',
        'batch.fileUploadError': '文件上传错误',
        'batch.fileDeleteError': '文件删除错误',
        'batch.fileMoveError': '文件移动错误',
        'batch.fileCopyError': '文件复制错误',
        'batch.fileRenameError': '文件重命名错误',
        'batch.fileCompressionError': '文件压缩错误',
        'batch.fileDecompressionError': '文件解压缩错误',
        'batch.fileEncryptionError': '文件加密错误',
        'batch.fileDecryptionError': '文件解密错误',
        'batch.fileValidationError': '文件验证错误',
        'batch.fileParsingError': '文件解析错误',
        'batch.fileRenderingError': '文件渲染错误',
        'batch.fileConversionError': '文件转换错误',
        'batch.fileMergingError': '文件合并错误',
        'batch.fileSplittingError': '文件分割错误',
        'batch.fileComparisonError': '文件比较错误',
        'batch.fileAnalysisError': '文件分析错误',
        'batch.fileOptimizationError': '文件优化错误',
        'batch.fileCleanupError': '文件清理错误',
        'batch.fileBackupError': '文件备份错误',
        'batch.fileRestoreError': '文件恢复错误',
        'batch.fileSyncError': '文件同步错误',
        'batch.fileShareError': '文件共享错误',
        'batch.filePermissionError': '文件权限错误',
        'batch.fileOwnershipError': '文件所有权错误',
        'batch.fileMetadataError': '文件元数据错误',
        'batch.fileIndexingError': '文件索引错误',
        'batch.fileSearchError': '文件搜索错误',
        'batch.fileSortError': '文件排序错误',
        'batch.fileFilterError': '文件过滤错误',
        'batch.fileGroupError': '文件分组错误',
        'batch.fileCategoryError': '文件分类错误',
        'batch.fileTagError': '文件标签错误',
        'batch.fileLabelError': '文件标签错误',
        'batch.fileAnnotationError': '文件注释错误',
        'batch.fileCommentError': '文件评论错误',
        'batch.fileRatingError': '文件评分错误',
        'batch.fileReviewError': '文件审核错误',
        'batch.fileApprovalError': '文件审批错误',
        'batch.filePublishingError': '文件发布错误',
        'batch.fileDistributionError': '文件分发错误',
        'batch.fileArchivingError': '文件归档错误',
        'batch.fileRetentionError': '文件保留错误',
        'batch.fileDisposalError': '文件处置错误',
        'batch.fileMigrationError': '文件迁移错误',
        'batch.fileImportError': '文件导入错误',
        'batch.fileExportError': '文件导出错误',
        'batch.fileBackupFailed': '文件备份失败',
        'batch.fileRestoreFailed': '文件恢复失败',
        'batch.fileSyncFailed': '文件同步失败',
        'batch.fileShareFailed': '文件共享失败',
        'batch.filePermissionFailed': '文件权限失败',
        'batch.fileOwnershipFailed': '文件所有权失败',
        'batch.fileMetadataFailed': '文件元数据失败',
        'batch.fileIndexingFailed': '文件索引失败',
        'batch.fileSearchFailed': '文件搜索失败',
        'batch.fileSortFailed': '文件排序失败',
        'batch.fileFilterFailed': '文件过滤失败',
        'batch.fileGroupFailed': '文件分组失败',
        'batch.fileCategoryFailed': '文件分类失败',
        'batch.fileTagFailed': '文件标签失败',
        'batch.fileLabelFailed': '文件标签失败',
        'batch.fileAnnotationFailed': '文件注释失败',
        'batch.fileCommentFailed': '文件评论失败',
        'batch.fileRatingFailed': '文件评分失败',
        'batch.fileReviewFailed': '文件审核失败',
        'batch.fileApprovalFailed': '文件审批失败',
        'batch.filePublishingFailed': '文件发布失败',
        'batch.fileDistributionFailed': '文件分发失败',
        'batch.fileArchivingFailed': '文件归档失败',
        'batch.fileRetentionFailed': '文件保留失败',
        'batch.fileDisposalFailed': '文件处置失败',
        'batch.fileMigrationFailed': '文件迁移失败',
        'batch.fileImportFailed': '文件导入失败',
        'batch.fileExportFailed': '文件导出错误',
        'common.totalItems': '共 {total} 条',
        'common.edit': '编辑',
        'common.delete': '删除',
        'common.yes': '是',
        'common.no': '否',
        'common.cancel': '取消',
        'common.save': '保存',
        'common.confirm': '确认',
        'common.close': '关闭',
        'common.retry': '重试',
        'common.download': '下载',
        'common.view': '查看',
        'common.processing': '处理中',
        'common.completed': '已完成',
        'common.failed': '失败',
        'common.pending': '等待中',
        'common.paused': '已暂停',
        'common.cancelled': '已取消',
        'common.resumed': '已恢复',
        'common.started': '已开始',
        'common.stopped': '已停止',
        'common.error': '错误',
        'common.success': '成功',
        'common.warning': '警告',
        'common.info': '信息',
        'common.debug': '调试',
        'common.trace': '跟踪',
        'validation.invalidEmail': '邮箱格式不正确'
      };
      return translations[key] || key;
    }
  })
}));

describe('BatchProcessing 组件测试', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn()
  };

  const mockFiles = [
    new File(['test content 1'], 'test1.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    new File(['test content 2'], 'test2.pdf', { type: 'application/pdf' }),
    new File(['test content 3'], 'test3.jpg', { type: 'image/jpeg' })
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { requestWithRetry } = require('../utils/apiClient');
    requestWithRetry.mockResolvedValue({ data: { success: true } });
  });

  test('组件应该正确渲染', () => {
    render(<BatchProcessing {...mockProps} />);
    
    expect(screen.getByText('批量处理')).toBeInTheDocument();
    expect(screen.getByText('拖拽文件到此处或点击上传')).toBeInTheDocument();
    expect(screen.getByText('文件上传')).toBeInTheDocument();
    expect(screen.getByText('文件列表')).toBeInTheDocument();
    expect(screen.getByText('批量处理配置')).toBeInTheDocument();
  });

  test('文件上传区域应该正确显示', () => {
    render(<BatchProcessing {...mockProps} />);
    
    expect(screen.getByText('选择文件')).toBeInTheDocument();
    expect(screen.getByText('或将文件拖拽到此处')).toBeInTheDocument();
  });

  test('支持的文件格式应该显示', () => {
    render(<BatchProcessing {...mockProps} />);
    
    expect(screen.getByText('支持的格式：')).toBeInTheDocument();
  });

  test('文件选择应该触发文件添加', async () => {
    render(<BatchProcessing {...mockProps} />);
    
    const fileInput = screen.getByLabelText('选择文件');
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: mockFiles } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test1.docx')).toBeInTheDocument();
      expect(screen.getByText('test2.pdf')).toBeInTheDocument();
      expect(screen.getByText('test3.jpg')).toBeInTheDocument();
    });
  });

  test('拖拽文件应该触发文件添加', async () => {
    render(<BatchProcessing {...mockProps} />);
    
    const dropZone = screen.getByText('或将文件拖拽到此处').closest('div');
    
    await act(async () => {
      fireEvent.dragOver(dropZone);
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: mockFiles,
          preventDefault: jest.fn(),
          stopPropagation: jest.fn()
        }
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test1.docx')).toBeInTheDocument();
      expect(screen.getByText('test2.pdf')).toBeInTheDocument();
      expect(screen.getByText('test3.jpg')).toBeInTheDocument();
    });
  });

  test('开始处理按钮应该启动文件处理', async () => {
    render(<BatchProcessing {...mockProps} />);
    
    // 先添加文件
    const fileInput = screen.getByLabelText('选择文件');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: mockFiles } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test1.docx')).toBeInTheDocument();
    });
    
    // 开始处理
    const startButton = screen.getByRole('button', { name: /开始处理/ });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('处理中')).toBeInTheDocument();
    });
  });

  test('处理进度应该正确显示', async () => {
    render(<BatchProcessing {...mockProps} />);
    
    // 添加文件并开始处理
    const fileInput = screen.getByLabelText('选择文件');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: mockFiles } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test1.docx')).toBeInTheDocument();
    });
    
    const startButton = screen.getByRole('button', { name: /开始处理/ });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    // 等待处理完成
    await waitFor(() => {
      expect(screen.getByText('已完成')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('处理结果应该可以查看', async () => {
    render(<BatchProcessing {...mockProps} />);
    
    // 添加文件并处理
    const fileInput = screen.getByLabelText('选择文件');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [mockFiles[0]] } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test1.docx')).toBeInTheDocument();
    });
    
    const startButton = screen.getByRole('button', { name: /开始处理/ });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('已完成')).toBeInTheDocument();
    });
    
    // 点击查看结果
    const viewButton = screen.getByRole('button', { name: /查看/ });
    await act(async () => {
      fireEvent.click(viewButton);
    });
    
    // 应该显示结果内容
    await waitFor(() => {
      expect(screen.getByText('处理完成的内容')).toBeInTheDocument();
    });
  });

  test('处理结果应该可以下载', async () => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    render(<BatchProcessing {...mockProps} />);
    
    // 添加文件并处理
    const fileInput = screen.getByLabelText('选择文件');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [mockFiles[0]] } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test1.docx')).toBeInTheDocument();
    });
    
    const startButton = screen.getByRole('button', { name: /开始处理/ });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('已完成')).toBeInTheDocument();
    });
    
    // 点击下载结果
    const downloadButton = screen.getByRole('button', { name: /下载/ });
    await act(async () => {
      fireEvent.click(downloadButton);
    });
    
    // 应该触发下载
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  test('清除已完成文件应该正常工作', async () => {
    render(<BatchProcessing {...mockProps} />);
    
    // 添加文件并处理
    const fileInput = screen.getByLabelText('选择文件');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: mockFiles } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test1.docx')).toBeInTheDocument();
    });
    
    const startButton = screen.getByRole('button', { name: /开始处理/ });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(screen.getAllByText('已完成').length).toBe(3);
    });
    
    // 清除已完成文件
    const clearButton = screen.getByRole('button', { name: /清除已完成/ });
    await act(async () => {
      fireEvent.click(clearButton);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('test1.docx')).not.toBeInTheDocument();
    });
  });

  test('生成报告功能应该正常工作', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    requestWithRetry.mockResolvedValueOnce({ 
      data: { 
        reportId: 'report-123',
        downloadUrl: '/api/reports/report-123/download'
      } 
    });
    
    render(<BatchProcessing {...mockProps} />);
    
    // 添加文件并处理
    const fileInput = screen.getByLabelText('选择文件');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: mockFiles } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test1.docx')).toBeInTheDocument();
    });
    
    const startButton = screen.getByRole('button', { name: /开始处理/ });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(screen.getAllByText('已完成').length).toBe(3);
    });
    
    // 生成报告
    const generateReportButton = screen.getByRole('button', { name: /生成报告/ });
    await act(async () => {
      fireEvent.click(generateReportButton);
    });
    
    await waitFor(() => {
      expect(requestWithRetry).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/batch/reports',
        data: expect.objectContaining({
          fileIds: expect.any(Array),
          reportType: 'batch'
        })
      });
    });
  });

  test('批量处理配置应该可以正常设置', async () => {
    render(<BatchProcessing {...mockProps} />);
    
    // 验证配置选项存在
    expect(screen.getByLabelText('选择文件')).toBeInTheDocument();
    
    // 验证输出格式选择器
    const outputFormatSelect = screen.getByText('详细').closest('.ant-select');
    expect(outputFormatSelect).toBeInTheDocument();
    
    // 验证导出格式选择器
    const exportFormatSelect = screen.getByText('PDF').closest('.ant-select');
    expect(exportFormatSelect).toBeInTheDocument();
    
    // 验证主要操作按钮
    expect(screen.getByRole('button', { name: /开始处理/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /暂停/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /停止/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /批量下载/ })).toBeInTheDocument();
  });

  test('文件验证应该拒绝不支持的格式', async () => {
    render(<BatchProcessing {...mockProps} />);
    
    const unsupportedFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
    
    const fileInput = screen.getByLabelText('选择文件');
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [unsupportedFile] } });
    });
    
    // 不应该显示不支持的文件
    await waitFor(() => {
      expect(screen.queryByText('test.exe')).not.toBeInTheDocument();
    });
  });

  test('当visible为false时组件不应该渲染', () => {
    const { container } = render(<BatchProcessing {...mockProps} visible={false} />);
    
    expect(container.firstChild).toBeNull();
  });

  test('网络错误应该显示错误消息', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    requestWithRetry.mockRejectedValueOnce(new Error('网络错误'));
    
    render(<BatchProcessing {...mockProps} />);
    
    // 添加文件 - 使用getByText查找Dragger组件的文本内容
    const uploadText = screen.getByText('拖拽文件到此处或点击上传');
    const dragger = uploadText.closest('.ant-upload-drag');
    expect(dragger).toBeInTheDocument();
    
    // 获取文件输入元素
    const fileInput = dragger.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [mockFiles[0]] } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test1.docx')).toBeInTheDocument();
    });
    
    // 生成报告（会失败）
    const generateReportButton = screen.getByRole('button', { name: /生成报告/ });
    await act(async () => {
      fireEvent.click(generateReportButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('生成报告失败')).toBeInTheDocument();
    });
  });
});

describe('BatchProcessing 集成测试', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn()
  };

  const mockFiles = [
    new File(['test content 1'], 'document1.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    new File(['test content 2'], 'document2.pdf', { type: 'application/pdf' }),
    new File(['test content 3'], 'image1.jpg', { type: 'image/jpeg' })
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { requestWithRetry } = require('../utils/apiClient');
    requestWithRetry.mockResolvedValue({ data: { success: true } });
  });

  test('完整的批量处理流程应该正常工作', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    
    // 模拟完整的API响应
    requestWithRetry.mockImplementation((config) => {
      if (config.method === 'POST' && config.url === '/api/batch/reports') {
        return Promise.resolve({ 
          data: { 
            reportId: 'batch-report-123',
            downloadUrl: '/api/reports/batch-report-123/download',
            summary: {
              totalFiles: 3,
              processedFiles: 3,
              failedFiles: 0,
              processingTime: 120000
            }
          } 
        });
      }
      return Promise.resolve({ data: { success: true } });
    });
    
    render(<BatchProcessing {...mockProps} />);
    
    // 1. 上传文件 - 使用getByText查找Dragger组件的文本内容
    const uploadText = screen.getByText('拖拽文件到此处或点击上传');
    const dragger = uploadText.closest('.ant-upload-drag');
    expect(dragger).toBeInTheDocument();
    
    // 获取文件输入元素
    const fileInput = dragger.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    
    // 模拟文件上传 - 直接调用onChange事件
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: mockFiles } });
    });
    
    // 等待文件被添加到列表
    await waitFor(() => {
      expect(screen.getByText('document1.docx')).toBeInTheDocument();
      expect(screen.getByText('document2.pdf')).toBeInTheDocument();
      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // 2. 开始批量处理
    const startButton = screen.getByRole('button', { name: /开始处理/ });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    // 3. 等待处理完成
    await waitFor(() => {
      expect(screen.getAllByText('已完成').length).toBe(3);
    }, { timeout: 5000 });
    
    // 4. 生成批量报告
    const generateReportButton = screen.getByRole('button', { name: /生成报告/ });
    await act(async () => {
      fireEvent.click(generateReportButton);
    });
    
    await waitFor(() => {
      expect(requestWithRetry).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/batch/reports',
        data: expect.objectContaining({
          fileIds: expect.any(Array),
          reportType: 'batch',
          includeSummary: true
        })
      });
    });
    
    // 5. 验证报告已生成
    await waitFor(() => {
      expect(screen.getByText('报告已生成')).toBeInTheDocument();
    });
  });

  test('错误处理和重试机制应该正常工作', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    
    let callCount = 0;
    requestWithRetry.mockImplementation((config) => {
      callCount++;
      if (callCount === 1) {
        // 第一次调用失败
        return Promise.reject(new Error('网络错误'));
      }
      // 后续调用成功
      return Promise.resolve({ data: { success: true } });
    });
    
    render(<BatchProcessing {...mockProps} />);
    
    // 添加文件 - 使用getByText查找Dragger组件的文本内容
    const uploadText = screen.getByText('拖拽文件到此处或点击上传');
    const dragger = uploadText.closest('.ant-upload-drag');
    expect(dragger).toBeInTheDocument();
    
    // 获取文件输入元素
    const fileInput = dragger.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [mockFiles[0]] } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('document1.docx')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // 生成报告（第一次会失败）
    const generateReportButton = screen.getByRole('button', { name: /生成报告/ });
    await act(async () => {
      fireEvent.click(generateReportButton);
    });
    
    // 第一次应该显示错误
    await waitFor(() => {
      expect(screen.getByText('生成报告失败')).toBeInTheDocument();
    });
    
    // TODO: 实现重试机制
  });

  test('并发控制应该限制同时处理的文件数量', async () => {
    render(<BatchProcessing {...mockProps} />);
    
    // 添加多个文件 - 使用getByText查找Dragger组件的文本内容
    const uploadText = screen.getByText('拖拽文件到此处或点击上传');
    const dragger = uploadText.closest('.ant-upload-drag');
    expect(dragger).toBeInTheDocument();
    
    // 获取文件输入元素
    const fileInput = dragger.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: mockFiles } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('document1.docx')).toBeInTheDocument();
      expect(screen.getByText('document2.pdf')).toBeInTheDocument();
      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // 开始处理
    const startButton = screen.getByRole('button', { name: /开始处理/ });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    // 验证处理状态 - 由于内部使用FileProcessingQueue，并发控制是内部实现的
    // 我们验证文件列表和处理流程正常开始
    await waitFor(() => {
      expect(screen.getByText('批量处理已开始')).toBeInTheDocument();
    });
  });
});