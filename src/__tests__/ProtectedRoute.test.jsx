import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';
import supabase from '../utils/supabaseClient';

// Mock supabase client
jest.mock('../utils/supabaseClient');

const mockSupabase = supabase;

// 测试页面组件
const AdminPage = () => {
  return <div data-testid="admin-page">这是管理员页面</div>;
};

const UserPage = () => {
  return <div data-testid="user-page">这是用户页面</div>;
};

const LoginPage = () => {
  return <div data-testid="login-page">登录页面</div>;
};

describe('ProtectedRoute 组件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('当用户未登录时，应重定向到登录页面', async () => {
    // Mock 未登录状态
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 等待加载完成并检查重定向
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
    });
  });

  test('当普通用户访问需要管理员权限的页面时，应显示权限不足信息', async () => {
    // Mock 普通用户登录状态
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: { role: 'user', name: '普通用户' }
    };
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 等待加载完成并检查权限不足信息
    await waitFor(() => {
      expect(screen.getByText('权限不足')).toBeInTheDocument();
      expect(screen.getByText('您没有足够的权限访问此页面，请联系管理员。')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
  });

  test('当管理员用户访问需要管理员权限的页面时，应显示页面内容', async () => {
    // Mock 管理员用户登录状态
    const mockAdminUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      user_metadata: { role: 'admin', name: '管理员' }
    };
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockAdminUser } } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 等待加载完成并检查页面内容
    await waitFor(() => {
      expect(screen.getByTestId('admin-page')).toBeInTheDocument();
      expect(screen.queryByText('权限不足')).not.toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
  });

  test('当用户具有允许的角色时，应显示页面内容', async () => {
    // Mock 普通用户登录状态
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: { role: 'user' }
    };
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/user"
              element={
                <ProtectedRoute roles={['user']}>
                  <UserPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 等待加载完成并检查页面内容
    await waitFor(() => {
      expect(screen.getByTestId('user-page')).toBeInTheDocument();
      expect(screen.queryByText('权限不足')).not.toBeInTheDocument();
    });
  });

  test('当未指定角色列表时，默认允许普通用户访问', async () => {
    // Mock 普通用户登录状态
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: { role: 'user' }
    };
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/default"
              element={
                <ProtectedRoute>
                  <UserPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 等待加载完成并检查页面内容
    await waitFor(() => {
      expect(screen.getByTestId('user-page')).toBeInTheDocument();
    });
  });

  test('管理员用户应能够访问需要普通用户权限的页面', async () => {
    // Mock 管理员用户登录状态
    const mockAdminUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      user_metadata: { role: 'admin' }
    };
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockAdminUser } } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/user"
              element={
                <ProtectedRoute roles={['user']}>
                  <UserPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 等待加载完成并检查页面内容（管理员应该能够访问用户页面）
    await waitFor(() => {
      expect(screen.getByTestId('user-page')).toBeInTheDocument();
      expect(screen.queryByText('权限不足')).not.toBeInTheDocument();
    });
  });

  test('当用户没有角色信息时，应默认使用普通用户角色', async () => {
    // Mock 没有角色信息的用户登录状态
    const mockUserWithoutRole = {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: { name: '无角色用户' } // 没有role字段
    };
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUserWithoutRole } } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/user"
              element={
                <ProtectedRoute roles={['user']}>
                  <UserPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 等待加载完成并检查权限
    await waitFor(() => {
      // 应该能够访问用户页面
      expect(screen.getByTestId('user-page')).toBeInTheDocument();
      // 不应该能够访问管理员页面（会显示权限不足信息）
      expect(screen.getByText('权限不足')).toBeInTheDocument();
    });
  });

  test('在认证状态加载中时，应显示加载状态', async () => {
    // Mock 一个永远处于加载状态的实现
    let resolveGetSession;
    const getSessionPromise = new Promise(resolve => {
      resolveGetSession = resolve;
    });
    mockSupabase.auth.getSession.mockReturnValue(getSessionPromise);
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute roles={['user']}>
                  <UserPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 立即检查加载状态
    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByTestId('user-page')).not.toBeInTheDocument();
    expect(screen.queryByText('权限不足')).not.toBeInTheDocument();

    // 手动解析Promise以结束测试
    resolveGetSession({ data: { session: null } });
  });

  test('应支持多个允许的角色', async () => {
    // Mock 编辑用户登录状态
    const mockEditorUser = {
      id: 'editor-123',
      email: 'editor@example.com',
      user_metadata: { role: 'editor' }
    };
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockEditorUser } } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/multi-role"
              element={
                <ProtectedRoute roles={['admin', 'editor']}>
                  <div data-testid="multi-role-page">多角色页面</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 等待加载完成并检查页面内容
    await waitFor(() => {
      expect(screen.getByTestId('multi-role-page')).toBeInTheDocument();
      expect(screen.queryByText('权限不足')).not.toBeInTheDocument();
    });
  });
});