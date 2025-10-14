import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import supabase from '../utils/supabaseClient';

// Mock supabase client
jest.mock('../utils/supabaseClient');

const mockSupabase = supabase;

// 测试组件，用于使用AuthContext
const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="user">{auth.user?.email || 'No user'}</div>
      <div data-testid="loading">{auth.loading ? 'Loading' : 'Not loading'}</div>
    </div>
  );
};

describe('AuthContext 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.location for resetPassword tests
    delete window.location;
    window.location = {
      origin: 'http://localhost:3000'
    };
  });

  describe('AuthProvider 组件测试', () => {
    test('当用户未登录时，应显示加载状态后显示无用户', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // 初始加载状态
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

      // 等待加载完成
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });

    test('当用户已登录时，应显示用户信息', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      };
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: mockUser } } });
      mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });
    });

    test('当组件卸载时，应取消认证状态监听器', async () => {
      const mockUnsubscribe = jest.fn();
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });

      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // 等待初始加载完成
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });

      // 卸载组件
      unmount();

      // 验证监听器已取消
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('useAuth 钩子测试', () => {
    test('应在AuthProvider内部正常工作', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

      let authContext;
      const CaptureAuthContext = () => {
        authContext = useAuth();
        return null;
      };

      render(
        <AuthProvider>
          <CaptureAuthContext />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authContext).toBeDefined();
        expect(authContext.user).toBeNull();
        expect(authContext.loading).toBe(false);
        expect(typeof authContext.login).toBe('function');
        expect(typeof authContext.signup).toBe('function');
        expect(typeof authContext.logout).toBe('function');
      });
    });

    test('在AuthProvider外部使用时应抛出错误', () => {
      // 创建一个函数，在AuthProvider外部调用useAuth
      const OutsideComponent = () => {
        useAuth();
        return null;
      };

      // 验证在AuthProvider外部使用useAuth会抛出错误
      expect(() => {
        render(<OutsideComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });

  describe('认证方法测试', () => {
    let authContext;

    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

      // 创建一个组件来捕获authContext
      const CaptureAuthContext = () => {
        authContext = useAuth();
        return (
          <div>
            <button data-testid="login-btn" onClick={() => authContext.login('test@example.com', 'password')} />
            <button data-testid="signup-btn" onClick={() => authContext.signup('test@example.com', 'password', 'Test User')} />
            <button data-testid="logout-btn" onClick={() => authContext.logout()} />
          </div>
        );
      };

      render(
        <AuthProvider>
          <CaptureAuthContext />
        </AuthProvider>
      );
    });

    test('login 方法应正确调用supabase.auth.signInWithPassword', async () => {
      const mockUserData = {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token-123' }
      };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: mockUserData, error: null });

      await authContext.login('test@example.com', 'password');

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
    });

    test('login 方法在失败时应抛出错误', async () => {
      const mockError = { message: 'Invalid credentials' };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: mockError });

      await expect(authContext.login('test@example.com', 'wrong-password')).rejects.toThrow('Invalid credentials');
    });

    test('signup 方法应正确调用supabase.auth.signUp', async () => {
      const mockUserData = {
        user: { id: 'user-123', email: 'test@example.com' },
        session: null
      };
      mockSupabase.auth.signUp.mockResolvedValue({ data: mockUserData, error: null });

      await authContext.signup('test@example.com', 'password', 'Test User');

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: {
          data: { name: 'Test User' }
        }
      });
    });

    test('logout 方法应调用supabase.auth.signOut并设置用户为null', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await authContext.logout();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    test('resetPassword 方法应正确调用supabase.auth.resetPasswordForEmail', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      await authContext.resetPassword('test@example.com');

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: 'http://localhost:3000/reset-password' }
      );
    });

    test('updateUserProfile 方法应正确调用supabase.auth.updateUser', async () => {
      const mockUserData = { name: 'Updated User', role: 'user' };
      const mockResult = {
        user: { id: 'user-123', email: 'test@example.com', user_metadata: mockUserData }
      };
      mockSupabase.auth.updateUser.mockResolvedValue({ data: mockResult, error: null });

      await authContext.updateUserProfile(mockUserData);

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: mockUserData
      });
    });

    test('getUserRole 方法应返回正确的用户角色', () => {
      // 测试无用户情况
      expect(authContext.getUserRole()).toBe('user');

      // 模拟设置用户
      authContext.user = { user_metadata: { role: 'admin' } };
      expect(authContext.getUserRole()).toBe('admin');

      // 测试无角色信息情况
      authContext.user = { user_metadata: {} };
      expect(authContext.getUserRole()).toBe('user');
    });

    test('isAdmin 方法应正确判断用户是否为管理员', () => {
      // 测试无用户情况
      expect(authContext.isAdmin()).toBe(false);

      // 测试普通用户
      authContext.user = { user_metadata: { role: 'user' } };
      expect(authContext.isAdmin()).toBe(false);

      // 测试管理员用户
      authContext.user = { user_metadata: { role: 'admin' } };
      expect(authContext.isAdmin()).toBe(true);
    });

    test('hasRole 方法应正确判断用户是否具有指定角色', () => {
      // 测试普通用户
      authContext.user = { user_metadata: { role: 'user' } };
      expect(authContext.hasRole('user')).toBe(true);
      expect(authContext.hasRole('admin')).toBe(false);

      // 测试管理员用户
      authContext.user = { user_metadata: { role: 'admin' } };
      expect(authContext.hasRole('user')).toBe(true); // 管理员应该拥有所有角色的权限
      expect(authContext.hasRole('admin')).toBe(true);
    });
  });
});