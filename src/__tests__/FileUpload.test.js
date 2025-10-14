import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import FileUpload from '../components/FileUpload';

// Mock dependencies
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn()
}));

jest.mock('../utils/fileProcessingQueue', () => ({
  addFile: jest.fn(),
  processQueue: jest.fn(),
  getQueueStatus: jest.fn()
}));

jest.mock('../utils/fileUtils', () => ({
  validateFile: jest.fn(),
  getFileExtension: jest.fn(),
  formatFileSize: jest.fn()
}));

describe('FileUpload 组件测试', () => {
  const mockProps = {
    onFileProcessed: jest.fn(),
    onError: jest.fn(),
    maxFileSize: 10 * 1024 * 1024, // 10MB
    acceptedFormats: ['.docx', '.pdf', '.jpg', '.png']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock useDropzone
    const { useDropzone } = require('react-dropzone');
    useDropzone.mockReturnValue({
      getRootProps: () => ({ onClick: jest.fn() }),
      getInputProps: () => ({ onChange: jest.fn() }),
      isDragActive: false,
      isDragAccept: true,
      isDragReject: false
    });
  });

  test('组件应该正确渲染', () => {
    render(<FileUpload {...mockProps} />);
    
    expect(screen.getByText('拖拽文件到此处')).toBeInTheDocument();
    expect(screen.getByText('或者')).toBeInTheDocument();
    expect(screen.getByText('点击选择文件')).toBeInTheDocument();
  });

  test('应该显示支持的文件格式', () => {
    render(<FileUpload {...mockProps} />);
    
    expect(screen.getByText('支持格式: .docx, .pdf, .jpg, .png')).toBeInTheDocument();
  });

  test('应该显示文件大小限制', () => {
    render(<FileUpload {...mockProps} />);
    
    expect(screen.getByText('最大文件大小: 10MB')).toBeInTheDocument();
  });

  test('拖拽区域应该正确响应', () => {
    const { useDropzone } = require('react-dropzone');
    const mockGetRootProps = jest.fn(() => ({ 'data-testid': 'dropzone' }));
    
    useDropzone.mockReturnValue({
      getRootProps: mockGetRootProps,
      getInputProps: () => ({}),
      isDragActive: false,
      isDragAccept: true,
      isDragReject: false
    });
    
    render(<FileUpload {...mockProps} />);
    
    const dropzone = screen.getByTestId('dropzone');
    expect(dropzone).toBeInTheDocument();
    expect(mockGetRootProps).toHaveBeenCalled();
  });

  test('当拖拽活跃时应该显示不同的样式', () => {
    const { useDropzone } = require('react-dropzone');
    
    useDropzone.mockReturnValue({
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: true,
      isDragAccept: true,
      isDragReject: false
    });
    
    render(<FileUpload {...mockProps} />);
    
    expect(screen.getByText('释放文件以上传')).toBeInTheDocument();
  });

  test('文件验证失败时应该显示错误', async () => {
    const { validateFile } = require('../utils/fileUtils');
    const { useDropzone } = require('react-dropzone');
    
    validateFile.mockReturnValue({ isValid: false, error: '文件格式不支持' });
    
    const mockOnDrop = jest.fn();
    useDropzone.mockReturnValue({
      getRootProps: () => ({}),
      getInputProps: () => ({ onChange: mockOnDrop }),
      isDragActive: false,
      isDragAccept: true,
      isDragReject: false
    });
    
    render(<FileUpload {...mockProps} />);
    
    // 模拟文件选择
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button', { name: /点击选择文件/ });
    
    await act(async () => {
      fireEvent.change(input, { target: { files: [mockFile] } });
    });
    
    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith('文件格式不支持');
    });
  });

  test('文件处理进度应该正确显示', async () => {
    const { getQueueStatus } = require('../utils/fileProcessingQueue');
    
    getQueueStatus.mockReturnValue({
      totalFiles: 2,
      completedFiles: 1,
      progress: 50
    });
    
    render(<FileUpload {...mockProps} />);
    
    // 进度信息应该被显示
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  test('多个文件上传应该正确处理', async () => {
    const { useDropzone } = require('react-dropzone');
    const { validateFile } = require('../utils/fileUtils');
    const { addFile } = require('../utils/fileProcessingQueue');
    
    validateFile.mockReturnValue({ isValid: true });
    
    const mockOnDrop = jest.fn();
    useDropzone.mockReturnValue({
      getRootProps: () => ({}),
      getInputProps: () => ({ onChange: mockOnDrop }),
      isDragActive: false,
      isDragAccept: true,
      isDragReject: false
    });
    
    render(<FileUpload {...mockProps} />);
    
    const mockFiles = [
      new File(['content1'], 'test1.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      new File(['content2'], 'test2.pdf', { type: 'application/pdf' })
    ];
    
    const input = screen.getByRole('button', { name: /点击选择文件/ });
    
    await act(async () => {
      fireEvent.change(input, { target: { files: mockFiles } });
    });
    
    await waitFor(() => {
      expect(addFile).toHaveBeenCalledTimes(2);
    });
  });

  test('文件处理完成时应该调用回调', async () => {
    const { processQueue } = require('../utils/fileProcessingQueue');
    
    processQueue.mockResolvedValue([
      { file: 'test.docx', result: 'processed content', status: 'completed' }
    ]);
    
    render(<FileUpload {...mockProps} />);
    
    // 模拟文件处理完成
    await act(async () => {
      await processQueue();
    });
    
    await waitFor(() => {
      expect(mockProps.onFileProcessed).toHaveBeenCalledWith([
        { file: 'test.docx', result: 'processed content', status: 'completed' }
      ]);
    });
  });

  test('文件处理错误时应该显示错误信息', async () => {
    const { processQueue } = require('../utils/fileProcessingQueue');
    
    processQueue.mockRejectedValue(new Error('处理队列失败'));
    
    render(<FileUpload {...mockProps} />);
    
    await act(async () => {
      try {
        await processQueue();
      } catch (error) {
        // 预期错误
      }
    });
    
    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith('处理队列失败');
    });
  });
});

describe('FileUpload 集成测试', () => {
  const mockProps = {
    onFileProcessed: jest.fn(),
    onError: jest.fn(),
    maxFileSize: 5 * 1024 * 1024,
    acceptedFormats: ['.docx', '.pdf']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('完整的文件上传流程应该正常工作', async () => {
    const { useDropzone } = require('react-dropzone');
    const { validateFile } = require('../utils/fileUtils');
    const { addFile, processQueue } = require('../utils/fileProcessingQueue');
    
    validateFile.mockReturnValue({ isValid: true });
    
    const mockOnDrop = jest.fn();
    useDropzone.mockReturnValue({
      getRootProps: () => ({}),
      getInputProps: () => ({ onChange: mockOnDrop }),
      isDragActive: false,
      isDragAccept: true,
      isDragReject: false
    });
    
    render(<FileUpload {...mockProps} />);
    
    // 模拟选择文件
    const mockFile = new File(['test content'], 'document.docx', { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    const input = screen.getByRole('button', { name: /点击选择文件/ });
    
    await userEvent.upload(input, mockFile);
    
    await waitFor(() => {
      expect(validateFile).toHaveBeenCalledWith(mockFile, mockProps.maxFileSize, mockProps.acceptedFormats);
      expect(addFile).toHaveBeenCalledWith(mockFile, expect.any(Function));
    });
  });

  test('拖拽上传应该正常工作', async () => {
    const { useDropzone } = require('react-dropzone');
    const { validateFile } = require('../utils/fileUtils');
    const { addFile } = require('../utils/fileProcessingQueue');
    
    validateFile.mockReturnValue({ isValid: true });
    
    let onDropCallback;
    useDropzone.mockImplementation(({ onDrop }) => {
      onDropCallback = onDrop;
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({}),
        isDragActive: false,
        isDragAccept: true,
        isDragReject: false
      };
    });
    
    render(<FileUpload {...mockProps} />);
    
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    
    // 模拟拖拽上传
    await act(async () => {
      onDropCallback([mockFile]);
    });
    
    await waitFor(() => {
      expect(validateFile).toHaveBeenCalledWith(mockFile, mockProps.maxFileSize, mockProps.acceptedFormats);
      expect(addFile).toHaveBeenCalledWith(mockFile, expect.any(Function));
    });
  });
});