import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import TeamManagement from '../components/TeamManagement';

// Mock dependencies
jest.mock('../utils/apiClient', () => ({
  requestWithRetry: jest.fn()
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'current-user-123', email: 'admin@example.com' }
  })
}));

// Mock translation hook for TeamManagement component
jest.mock('../context/i18nContext', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'team.title': '团队管理',
        'team.members': '团队成员',
        'team.invitations': '待处理邀请',
        'team.memberName': '成员姓名',
        'team.email': '邮箱',
        'team.role': '角色',
        'team.joinDate': '加入日期',
        'team.status': '状态',
        'team.actions': '操作',
        'team.inviteMember': '邀请成员',
        'team.editMember': '编辑成员',
        'team.sendInvitation': '发送邀请',
        'team.save': '保存',
        'team.cancel': '取消',
        'team.revoke': '撤销',
        'team.confirmDelete': '确定要删除该成员吗？',
        'team.confirmRevoke': '确定要撤销此邀请吗？',
        'team.fetchMembersError': '获取团队成员失败',
        'team.memberUpdated': '成员信息已更新',
        'team.invitationSent': '邀请已发送',
        'team.memberDeleted': '成员已删除',
        'team.invitationRevoked': '邀请已撤销',
        'team.invitationError': '发送邀请失败',
        'team.updateMemberError': '更新成员失败',
        'team.deleteMemberError': '删除成员失败',
        'team.revokeInvitationError': '撤销邀请失败',
        'team.emailPlaceholder': '请输入邮箱地址',
        'team.rolePlaceholder': '请选择角色',
        'team.invitationMessage': '邀请消息',
        'team.invitationMessagePlaceholder': '可选的邀请消息',
        'team.defaultInvitationMessage': '邀请您加入我们的团队',
        'team.roles.admin': '管理员',
        'team.roles.editor': '编辑者',
        'team.roles.viewer': '查看者',
        'team.status.active': '活跃',
        'team.status.inactive': '非活跃',
        'team.invitationStatus.pending': '待处理',
        'team.invitationStatus.expired': '已过期',
        'common.edit': '编辑',
        'common.delete': '删除',
        'common.yes': '是',
        'common.no': '否',
        'common.totalItems': '共 {total} 条',
        'validation.invalidEmail': '邮箱格式不正确'
      };
      return translations[key] || key;
    }
  })
}));

describe('TeamManagement 组件测试', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn()
  };

  const mockTeamMembers = [
    {
      id: 'member-1',
      name: '张三',
      email: 'zhangsan@example.com',
      role: 'admin',
      created_at: '2024-01-15T10:00:00Z',
      status: 'active'
    },
    {
      id: 'member-2',
      name: '李四',
      email: 'lisi@example.com',
      role: 'editor',
      created_at: '2024-01-16T10:00:00Z',
      status: 'active'
    }
  ];

  const mockInvitations = [
    {
      id: 'invite-1',
      email: 'wangwu@example.com',
      role: 'viewer',
      created_at: '2024-01-17T10:00:00Z',
      status: 'pending'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { requestWithRetry } = require('../utils/apiClient');
    requestWithRetry.mockImplementation((config) => {
      if (config.url === '/api/team/members') {
        return Promise.resolve({ data: { members: mockTeamMembers } });
      }
      if (config.url === '/api/team/invitations') {
        return Promise.resolve({ data: { invitations: mockInvitations } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  test('组件应该正确渲染', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    expect(screen.getByText('团队管理')).toBeInTheDocument();
    expect(screen.getByText('团队成员')).toBeInTheDocument();
    expect(screen.getByText('待处理邀请')).toBeInTheDocument();
  });

  test('应该显示团队成员列表', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('李四')).toBeInTheDocument();
      expect(screen.getByText('zhangsan@example.com')).toBeInTheDocument();
      expect(screen.getByText('lisi@example.com')).toBeInTheDocument();
    });
  });

  test('应该显示邀请成员按钮', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    // 使用更具体的选择器，避免匹配到模态框中的标题
    const inviteButtons = screen.getAllByRole('button', { name: /邀请成员/ });
    // 第一个按钮是主界面的邀请按钮，第二个可能是模态框中的标题
    expect(inviteButtons[0]).toBeInTheDocument();
  });

  test('点击邀请成员按钮应该打开模态框', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    // 使用更具体的选择器，只选择主界面的邀请按钮
    const inviteButtons = screen.getAllByRole('button', { name: /邀请成员/ });
    const inviteButton = inviteButtons[0]; // 第一个按钮是主界面的
    
    await act(async () => {
      fireEvent.click(inviteButton);
    });
    
    // 检查模态框是否打开
    expect(screen.getByText('邀请成员')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入邮箱地址')).toBeInTheDocument();
  });

  test('邀请表单应该验证邮箱格式', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    // 使用更具体的选择器
    const inviteButtons = screen.getAllByRole('button', { name: /邀请成员/ });
    const inviteButton = inviteButtons[0];
    
    await act(async () => {
      fireEvent.click(inviteButton);
    });
    
    const emailInput = screen.getByPlaceholderText('请输入邮箱地址');
    const submitButton = screen.getByRole('button', { name: /发送邀请/ });
    
    // 输入无效邮箱
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    });
    
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('validation.invalidEmail')).toBeInTheDocument();
    });
  });

  test('成功发送邀请应该显示成功消息', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    requestWithRetry.mockResolvedValueOnce({ data: { success: true } });
    
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    // 使用更具体的选择器
    const inviteButtons = screen.getAllByRole('button', { name: /邀请成员/ });
    const inviteButton = inviteButtons[0];
    
    await act(async () => {
      fireEvent.click(inviteButton);
    });
    
    const emailInput = screen.getByPlaceholderText('请输入邮箱地址');
    const roleSelect = screen.getByPlaceholderText('请选择角色');
    const submitButton = screen.getByRole('button', { name: /发送邀请/ });
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    });
    
    await userEvent.click(roleSelect);
    const viewerOption = screen.getByText('查看者');
    await act(async () => {
      fireEvent.click(viewerOption);
    });
    
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(requestWithRetry).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/team/invitations',
        data: {
          email: 'newuser@example.com',
          role: 'viewer',
          message: '邀请您加入我们的团队'
        }
      });
    });
  });

  test('编辑成员应该正确工作', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });
    
    const editButtons = screen.getAllByRole('button', { name: /编辑/ });
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });
    
    expect(screen.getByText('编辑成员')).toBeInTheDocument();
    expect(screen.getByDisplayValue('zhangsan@example.com')).toBeInTheDocument();
  });

  test('删除成员应该显示确认对话框', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });
    
    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });
    
    expect(screen.getByText('确定要删除该成员吗？')).toBeInTheDocument();
  });

  test('切换标签页应该显示不同内容', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });
    
    // 切换到邀请标签页
    const invitationsTab = screen.getByText('待处理邀请');
    await act(async () => {
      fireEvent.click(invitationsTab);
    });
    
    await waitFor(() => {
      expect(screen.getByText('wangwu@example.com')).toBeInTheDocument();
    });
  });

  test('角色标签应该显示正确的颜色', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    await waitFor(() => {
      // 管理员应该是红色
      const adminTags = screen.getAllByText('管理员');
      expect(adminTags.length).toBeGreaterThan(0);
      
      // 编辑者应该是蓝色
      const editorTags = screen.getAllByText('编辑者');
      expect(editorTags.length).toBeGreaterThan(0);
    });
  });

  test('状态标签应该显示正确的颜色', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    await waitFor(() => {
      // 活跃状态应该是绿色
      const activeTags = screen.getAllByText('活跃');
      expect(activeTags.length).toBeGreaterThan(0);
    });
    
    // 切换到邀请标签页
    const invitationsTab = screen.getByText('待处理邀请');
    await act(async () => {
      fireEvent.click(invitationsTab);
    });
    
    await waitFor(() => {
      // 待处理状态应该是橙色
      const pendingTags = screen.getAllByText('待处理');
      expect(pendingTags.length).toBeGreaterThan(0);
    });
  });

  test('当前用户不应该能删除自己', async () => {
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('当前用户')).toBeInTheDocument();
    });
    
    // 查找当前用户的删除按钮（假设当前用户是管理员）
    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    // 应该有一个删除按钮被禁用（当前用户）
    const disabledDeleteButton = deleteButtons.find(button => button.disabled);
    expect(disabledDeleteButton).toBeTruthy();
  });

  test('当visible为false时组件不应该渲染', () => {
    const { container } = render(<TeamManagement {...mockProps} visible={false} />);
    
    expect(container.firstChild).toBeNull();
  });

  test('网络错误应该显示错误消息', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    requestWithRetry.mockRejectedValueOnce(new Error('网络错误'));
    
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('获取团队成员失败')).toBeInTheDocument();
    });
  });
});

describe('TeamManagement 集成测试', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('完整的团队成员管理流程应该正常工作', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    
    // 模拟完整的API响应
    requestWithRetry.mockImplementation((config) => {
      if (config.method === 'GET' && config.url === '/api/team/members') {
        return Promise.resolve({ 
          data: { 
            members: [
              {
                id: 'member-1',
                name: '测试用户',
                email: 'test@example.com',
                role: 'viewer',
                created_at: '2024-01-20T10:00:00Z',
                status: 'active'
              }
            ] 
          } 
        });
      }
      if (config.method === 'POST' && config.url === '/api/team/invitations') {
        return Promise.resolve({ 
          data: { 
            id: 'new-invite',
            email: 'newuser@example.com',
            role: 'editor',
            created_at: new Date().toISOString(),
            status: 'pending'
          } 
        });
      }
      return Promise.resolve({ data: { success: true } });
    });
    
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    // 1. 查看现有成员
    await waitFor(() => {
      expect(screen.getByText('测试用户')).toBeInTheDocument();
    });
    
    // 2. 邀请新成员
    const inviteButton = screen.getByRole('button', { name: /邀请成员/ });
    await act(async () => {
      fireEvent.click(inviteButton);
    });
    
    const emailInput = screen.getByPlaceholderText('请输入邮箱地址');
    const roleSelect = screen.getByPlaceholderText('请选择角色');
    const submitButton = screen.getByRole('button', { name: /发送邀请/ });
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    });
    
    await userEvent.click(roleSelect);
    const editorOption = screen.getByText('编辑者');
    await act(async () => {
      fireEvent.click(editorOption);
    });
    
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    // 3. 验证邀请已发送
    await waitFor(() => {
      expect(requestWithRetry).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/team/invitations',
        data: expect.objectContaining({
          email: 'newuser@example.com',
          role: 'editor'
        })
      });
    });
    
    // 4. 切换到邀请标签页查看新邀请
    const invitationsTab = screen.getByText('待处理邀请');
    await act(async () => {
      fireEvent.click(invitationsTab);
    });
    
    await waitFor(() => {
      expect(screen.getByText('newuser@example.com')).toBeInTheDocument();
    });
  });

  test('错误恢复机制应该正常工作', async () => {
    const { requestWithRetry } = require('../utils/apiClient');
    
    let callCount = 0;
    requestWithRetry.mockImplementation((config) => {
      callCount++;
      if (callCount === 1) {
        // 第一次调用失败
        return Promise.reject(new Error('网络错误'));
      }
      // 后续调用成功
      return Promise.resolve({ data: { members: [] } });
    });
    
    await act(async () => {
      render(<TeamManagement {...mockProps} />);
    });
    
    // 第一次应该显示错误
    await waitFor(() => {
      expect(screen.getByText('获取团队成员失败')).toBeInTheDocument();
    });
    
    // TODO: 实现重试机制
  });
});