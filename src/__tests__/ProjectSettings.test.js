import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import ProjectSettings from '../components/ProjectSettings';

// Mock dependencies
jest.mock('../utils/apiClient', () => ({
  requestWithRetry: jest.fn()
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', email: 'test@example.com' }
  })
}));

describe('ProjectSettings 组件测试', () => {
  const mockProps = {
    project: {
      id: 'test-project-123',
      name: '测试项目',
      description: '这是一个测试项目',
      settings: {
        proofreadingRules: {
          checkGrammar: true,
          checkSpelling: true,
          checkStyle: false
        },
        notificationSettings: {
          emailOnCompletion: true,
          emailOnError: false
        },
        fileSettings: {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedFormats: ['.docx', '.pdf', '.txt']
        }
      }
    },
    onSettingsUpdate: jest.fn(),
    onClose: jest.fn(),
    visible: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('组件应该正确渲染', () => {
    render(<ProjectSettings {...mockProps} />);
    
    expect(screen.getByText('项目设置')).toBeInTheDocument();
    expect(screen.getByText('校对规则')).toBeInTheDocument();
    expect(screen.getByText('通知设置')).toBeInTheDocument();
    expect(screen.getByText('文件设置')).toBeInTheDocument();
  });

  test('应该显示当前项目名称', () => {
    render(<ProjectSettings {...mockProps} />);
    
    expect(screen.getByText(`项目: ${mockProps.project.name}`)).toBeInTheDocument();
  });

  test('校对规则复选框应该正确显示当前状态', () => {
    render(<ProjectSettings {...mockProps} />);
    
    const grammarCheckbox = screen.getByLabelText('语法检查');
    const spellingCheckbox = screen.getByLabelText('拼写检查');
    const styleCheckbox = screen.getByLabelText('风格检查');
    
    expect(grammarCheckbox).toBeChecked();
    expect(spellingCheckbox).toBeChecked();
    expect(styleCheckbox).not.toBeChecked();
  });

  test('校对规则复选框应该可以切换', async () => {
    render(<ProjectSettings {...mockProps} />);
    
    const grammarCheckbox = screen.getByLabelText('语法检查');
    
    await act(async () => {
      fireEvent.click(grammarCheckbox);
    });
    
    expect(grammarCheckbox).not.toBeChecked();
  });

  test('通知设置复选框应该正确显示当前状态', () => {
    render(<ProjectSettings {...mockProps} />);
    
    const completionCheckbox = screen.getByLabelText('完成时发送邮件通知');
    const errorCheckbox = screen.getByLabelText('出错时发送邮件通知');
    
    expect(completionCheckbox).toBeChecked();
    expect(errorCheckbox).not.toBeChecked();
  });

  test('文件大小输入框应该显示当前设置', () => {
    render(<ProjectSettings {...mockProps} />);
    
    const fileSizeInput = screen.getByLabelText('最大文件大小 (MB)');
    expect(fileSizeInput.value).toBe('10');
  });

  test('文件格式输入框应该显示当前设置', () => {
    render(<ProjectSettings {...mockProps} />);
    
    const formatInput = screen.getByLabelText('允许的文件格式');
    expect(formatInput.value).toBe('.docx, .pdf, .txt');
  });

  test('文件大小输入应该验证输入值', async () => {
    render(<ProjectSettings {...mockProps} />);
    
    const fileSizeInput = screen.getByLabelText('最大文件大小 (MB)');
    
    await act(async () => {
      fireEvent.change(fileSizeInput, { target: { value: 'invalid' } });
    });
    
    expect(fileSizeInput.value).toBe(''); // 应该清除无效输入
  });

  test('文件大小输入应该限制范围', async () => {
    render(<ProjectSettings {...mockProps} />);
    
    const fileSizeInput = screen.getByLabelText('最大文件大小 (MB)');
    
    // 测试过大值
    await act(async () => {
      fireEvent.change(fileSizeInput, { target: { value: '1000' } });
    });
    
    expect(screen.getByText('文件大小不能超过100MB')).toBeInTheDocument();
  });

  test('保存按钮应该可点击', () => {
    render(<ProjectSettings {...mockProps} />);
    
    const saveButton = screen.getByRole('button', { name: /保存设置/ });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
  });

  test('取消按钮应该调用onClose回调', async () => {
    render(<ProjectSettings {...mockProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /取消/ });
    
    await act(async () => {
      fireEvent.click(cancelButton);
    });
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('保存设置时应该显示加载状态', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    requestWithRetry.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<ProjectSettings {...mockProps} />);
    
    const saveButton = screen.getByRole('button', { name: /保存设置/ });
    
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    expect(screen.getByText('保存中...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('保存中...')).not.toBeInTheDocument();
    });
  });

  test('保存设置成功时应该调用onSettingsUpdate', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    requestWithRetry.mockResolvedValue({ success: true });
    
    render(<ProjectSettings {...mockProps} />);
    
    const saveButton = screen.getByRole('button', { name: /保存设置/ });
    
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    await waitFor(() => {
      expect(mockProps.onSettingsUpdate).toHaveBeenCalled();
    });
  });

  test('保存设置失败时应该显示错误信息', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    requestWithRetry.mockRejectedValue(new Error('保存失败'));
    
    render(<ProjectSettings {...mockProps} />);
    
    const saveButton = screen.getByRole('button', { name: /保存设置/ });
    
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('保存失败')).toBeInTheDocument();
    });
  });

  test('重置为默认设置功能应该可用', async () => {
    render(<ProjectSettings {...mockProps} />);
    
    const resetButton = screen.getByRole('button', { name: /重置为默认/ });
    
    await act(async () => {
      fireEvent.click(resetButton);
    });
    
    // 确认对话框应该出现
    expect(screen.getByText('确定要重置为默认设置吗？')).toBeInTheDocument();
    
    const confirmButton = screen.getByRole('button', { name: /确定/ });
    await act(async () => {
      fireEvent.click(confirmButton);
    });
    
    // 设置应该被重置
    const grammarCheckbox = screen.getByLabelText('语法检查');
    expect(grammarCheckbox).toBeChecked(); // 默认应该被选中
  });

  test('高级设置选项卡应该可访问', async () => {
    render(<ProjectSettings {...mockProps} />);
    
    const advancedTab = screen.getByText('高级设置');
    
    await act(async () => {
      fireEvent.click(advancedTab);
    });
    
    expect(screen.getByText('自定义词典')).toBeInTheDocument();
    expect(screen.getByText('API配置')).toBeInTheDocument();
  });

  test('当visible为false时组件不应该渲染', () => {
    const { container } = render(<ProjectSettings {...mockProps} visible={false} />);
    
    expect(container.firstChild).toBeNull();
  });

  test('没有项目数据时应该显示加载状态', () => {
    render(<ProjectSettings {...mockProps} project={null} />);
    
    expect(screen.getByText('加载项目设置...')).toBeInTheDocument();
  });
});

describe('ProjectSettings 集成测试', () => {
  const mockProps = {
    project: {
      id: 'integration-test-project',
      name: '集成测试项目',
      description: '用于集成测试的项目',
      settings: {
        proofreadingRules: {
          checkGrammar: true,
          checkSpelling: true,
          checkStyle: true,
          checkPunctuation: true
        },
        notificationSettings: {
          emailOnCompletion: true,
          emailOnError: true,
          webhookOnCompletion: false
        },
        fileSettings: {
          maxFileSize: 20 * 1024 * 1024,
          allowedFormats: ['.docx', '.pdf', '.txt', '.md'],
          autoProcess: true
        },
        advancedSettings: {
          customDictionary: ['专业术语1', '专业术语2'],
          apiTimeout: 30000,
          maxRetries: 3
        }
      }
    },
    onSettingsUpdate: jest.fn(),
    onClose: jest.fn(),
    visible: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('完整的设置更新流程应该正常工作', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    
    requestWithRetry.mockResolvedValue({ 
      success: true, 
      data: { 
        projectId: mockProps.project.id,
        settings: mockProps.project.settings 
      } 
    });
    
    render(<ProjectSettings {...mockProps} />);
    
    // 修改设置
    const grammarCheckbox = screen.getByLabelText('语法检查');
    await act(async () => {
      fireEvent.click(grammarCheckbox);
    });
    
    const fileSizeInput = screen.getByLabelText('最大文件大小 (MB)');
    await act(async () => {
      fireEvent.change(fileSizeInput, { target: { value: '15' } });
    });
    
    const formatInput = screen.getByLabelText('允许的文件格式');
    await act(async () => {
      fireEvent.change(formatInput, { target: { value: '.docx, .pdf' } });
    });
    
    // 保存设置
    const saveButton = screen.getByRole('button', { name: /保存设置/ });
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    await waitFor(() => {
      expect(requestWithRetry).toHaveBeenCalledWith({
        method: 'PUT',
        url: `/api/projects/${mockProps.project.id}/settings`,
        data: expect.objectContaining({
          proofreadingRules: expect.objectContaining({
            checkGrammar: false
          }),
          fileSettings: expect.objectContaining({
            maxFileSize: 15 * 1024 * 1024,
            allowedFormats: ['.docx', '.pdf']
          })
        })
      });
      
      expect(mockProps.onSettingsUpdate).toHaveBeenCalled();
    });
  });

  test('多个设置选项卡应该可以切换', async () => {
    render(<ProjectSettings {...mockProps} />);
    
    const tabs = ['校对规则', '通知设置', '文件设置', '高级设置'];
    
    for (const tabName of tabs) {
      const tab = screen.getByText(tabName);
      await act(async () => {
        fireEvent.click(tab);
      });
      
      // 验证当前选中的选项卡
      expect(tab).toHaveClass('ant-tabs-tab-active');
    }
  });

  test('自定义词典功能应该正常工作', async () => {
    render(<ProjectSettings {...mockProps} />);
    
    const advancedTab = screen.getByText('高级设置');
    await act(async () => {
      fireEvent.click(advancedTab);
    });
    
    const dictionaryInput = screen.getByPlaceholderText('输入自定义词汇');
    const addButton = screen.getByRole('button', { name: /添加/ });
    
    await act(async () => {
      fireEvent.change(dictionaryInput, { target: { value: '新术语' } });
    });
    
    await act(async () => {
      fireEvent.click(addButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('新术语')).toBeInTheDocument();
    });
  });

  test('错误处理和恢复应该正常工作', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    
    requestWithRetry.mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce({ success: true });
    
    render(<ProjectSettings {...mockProps} />);
    
    const saveButton = screen.getByRole('button', { name: /保存设置/ });
    
    // 第一次尝试失败
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('网络错误')).toBeInTheDocument();
    });
    
    // 重试应该成功
    const retryButton = screen.getByRole('button', { name: /重试/ });
    await act(async () => {
      fireEvent.click(retryButton);
    });
    
    await waitFor(() => {
      expect(mockProps.onSettingsUpdate).toHaveBeenCalled();
    });
  });
});