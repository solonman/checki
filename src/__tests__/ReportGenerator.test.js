import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import ReportGenerator from '../components/ReportGenerator';

// Mock services
jest.mock('../services/reportGenerationService', () => ({
  generateReport: jest.fn(),
  exportReport: jest.fn()
}));

jest.mock('../services/proofreadingService', () => ({
  getAvailableTasks: jest.fn()
}));

jest.mock('file-saver', () => ({
  saveAs: jest.fn()
}));

describe('ReportGenerator 组件测试', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn(),
    selectedTasks: [],
    onTasksSelected: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('组件应该正确渲染', () => {
    render(<ReportGenerator {...mockProps} />);
    
    expect(screen.getByText('报告生成器')).toBeInTheDocument();
    expect(screen.getByText('选择报告类型')).toBeInTheDocument();
    expect(screen.getByText('选择报告格式')).toBeInTheDocument();
    expect(screen.getByText('选择任务')).toBeInTheDocument();
  });

  test('应该显示加载状态', () => {
    render(<ReportGenerator {...mockProps} />);
    
    // 初始状态应该显示加载中
    expect(screen.getByText('加载任务中...')).toBeInTheDocument();
  });

  test('当没有可用任务时应该显示空状态', async () => {
    const { getAvailableTasks } = require('../services/proofreadingService');
    getAvailableTasks.mockResolvedValue([]);
    
    await act(async () => {
      render(<ReportGenerator {...mockProps} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('暂无已完成的任务')).toBeInTheDocument();
    });
  });

  test('报告类型单选按钮应该正常工作', async () => {
    render(<ReportGenerator {...mockProps} />);
    
    const singleReportRadio = screen.getByLabelText('单个报告');
    const summaryReportRadio = screen.getByLabelText('统计摘要');
    
    expect(singleReportRadio).toBeChecked();
    expect(summaryReportRadio).not.toBeChecked();
    
    fireEvent.click(summaryReportRadio);
    
    await waitFor(() => {
      expect(summaryReportRadio).toBeChecked();
      expect(singleReportRadio).not.toBeChecked();
    });
  });

  test('报告格式选择应该正常工作', async () => {
    render(<ReportGenerator {...mockProps} />);
    
    const formatSelect = screen.getByRole('combobox');
    expect(formatSelect).toBeInTheDocument();
    
    // 默认应该选中PDF格式
    expect(formatSelect).toHaveTextContent('PDF格式');
  });

  test('报告选项复选框应该正常工作', async () => {
    render(<ReportGenerator {...mockProps} />);
    
    const detailsCheckbox = screen.getByLabelText('包含错误详细信息');
    const statisticsCheckbox = screen.getByLabelText('包含统计信息');
    
    expect(detailsCheckbox).toBeChecked();
    expect(statisticsCheckbox).toBeChecked();
    
    fireEvent.click(detailsCheckbox);
    
    await waitFor(() => {
      expect(detailsCheckbox).not.toBeChecked();
    });
  });

  test('生成报告按钮应该被禁用当没有选择任务时', async () => {
    const { getAvailableTasks } = require('../services/proofreadingService');
    getAvailableTasks.mockResolvedValue([]);
    
    await act(async () => {
      render(<ReportGenerator {...mockProps} />);
    });
    
    const generateButton = screen.getByRole('button', { name: /生成报告/ });
    expect(generateButton).toBeDisabled();
  });

  test('取消按钮应该调用onClose回调', async () => {
    render(<ReportGenerator {...mockProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /取消/ });
    fireEvent.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('当visible为false时组件不应该渲染', () => {
    const { container } = render(<ReportGenerator {...mockProps} visible={false} />);
    
    expect(container.firstChild).toBeNull();
  });
});

describe('ReportGenerator 集成测试', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn(),
    selectedTasks: [],
    onTasksSelected: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('完整的报告生成流程应该正常工作', async () => {
    const { getAvailableTasks } = require('../services/proofreadingService');
    const { generateReport, exportReport } = require('../services/reportGenerationService');
    
    const mockTasks = [
      {
        id: 1,
        file_name: 'test1.docx',
        project: '项目A',
        created_at: new Date().toISOString(),
        proofreading_result: {
          statistics: {
            totalErrors: 5,
            accuracyRate: 95
          }
        }
      }
    ];
    
    getAvailableTasks.mockResolvedValue(mockTasks);
    generateReport.mockResolvedValue({ content: 'report content', format: 'pdf' });
    exportReport.mockResolvedValue({ success: true });
    
    await act(async () => {
      render(<ReportGenerator {...mockProps} />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('加载任务中...')).not.toBeInTheDocument();
    });
    
    // 选择任务
    const taskSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(taskSelect);
    
    const taskOption = screen.getByText('test1.docx');
    fireEvent.click(taskOption);
    
    // 点击生成报告
    const generateButton = screen.getByRole('button', { name: /生成报告/ });
    expect(generateButton).not.toBeDisabled();
    
    await act(async () => {
      fireEvent.click(generateButton);
    });
    
    await waitFor(() => {
      expect(generateReport).toHaveBeenCalled();
    });
  });
});