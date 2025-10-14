import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from '../components/PrivateRoute';
import { AuthProvider } from '../contexts/AuthContext';
import supabase from '../utils/supabaseClient';

// Mock supabase client
jest.mock('../utils/supabaseClient');

const mockSupabase = supabase;

// 测试页面组件
const ProtectedPage = () => {
  return <div data-testid="protected-page">这是受保护的页面</div>;
};

const LoginPage = () => {
  return <div data-testid="login-page">登录页面</div>;
};

describe('PrivateRoute 组件测试', () => {
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
              path="/protected"
              element={
                <PrivateRoute>
                  <ProtectedPage />
                </PrivateRoute>
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
      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
    });
  });

  test('当用户已登录时，应显示受保护的页面内容', async () => {
    // Mock 已登录状态
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { name: 'Test User' }
    };
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/protected"
              element={
                <PrivateRoute>
                  <ProtectedPage />
                </PrivateRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 等待加载完成并检查页面内容
    await waitFor(() => {
      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
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
                <PrivateRoute>
                  <ProtectedPage />
                </PrivateRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 立即检查加载状态
    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();

    // 手动解析Promise以结束测试
    resolveGetSession({ data: { session: null } });
  });

  test('应正确包装各种类型的子组件', async () => {
    const CustomComponent = () => <div data-testid="custom-component">自定义组件</div>;
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    };
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/custom"
              element={
                <PrivateRoute>
                  <CustomComponent />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('custom-component')).toBeInTheDocument();
    });
  });

  test('应在用户注销后正确重定向', async () => {
    // 初始状态为已登录
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    };
    let currentSession = { user: mockUser };
    mockSupabase.auth.getSession.mockImplementation(() => Promise.resolve({ data: { session: currentSession } }));
    
    // Mock onAuthStateChange，使其可以在测试中触发状态变化
    let authStateChangeCallback;
    const mockOnAuthStateChange = jest.fn().mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    mockSupabase.auth.onAuthStateChange = mockOnAuthStateChange;

    render(
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/protected"
              element={
                <PrivateRoute>
                  <ProtectedPage />
                </PrivateRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );

    // 等待初始加载完成，应显示受保护页面
    await waitFor(() => {
      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });

    // 模拟用户注销，触发auth state变化
    currentSession = null;
    authStateChangeCallback('SIGNED_OUT', null);

    // 等待重定向完成
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
    });
  });
});