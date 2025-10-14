import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI, userAPI } from '../utils/apiClient';
import supabase from '../utils/supabaseClient';

// 创建认证上下文
const AuthContext = createContext(null);

/**
 * 认证上下文提供者组件
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化认证状态
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (session?.user) {
              // 用户已登录
              setUser(session.user);
              
              // 获取用户详细资料
              await fetchUserProfile(session.user.id);
            } else {
              // 用户未登录或已登出
              setUser(null);
              setUserProfile(null);
            }
            setLoading(false);
            setIsInitialized(true);
          }
        );
        
        // 检查当前用户
        const currentUser = await authAPI.getCurrentUser();
        if (currentUser.success && currentUser.user) {
          setUser(currentUser.user);
          await fetchUserProfile(currentUser.user.id);
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('初始化认证失败:', err);
        setError('初始化认证失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 清理函数
    return () => {
      // Supabase会自动处理订阅清理
    };
  }, []);

  /**
   * 获取用户详细资料
   */
  const fetchUserProfile = async (userId) => {
    try {
      const profileResponse = await userAPI.getUserProfile(userId);
      if (profileResponse.success) {
        setUserProfile(profileResponse.data);
      } else {
        // 如果用户资料不存在，创建一个新的
        console.log('用户资料不存在，创建新资料');
        await createUserProfile(userId);
      }
    } catch (err) {
      console.error('获取用户资料失败:', err);
    }
  };

  /**
   * 创建用户资料
   */
  const createUserProfile = async (userId) => {
    try {
      const userData = {
        id: userId,
        email: user?.email || '',
        full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const response = await userAPI.createUserProfile(userData);
      if (response.success) {
        setUserProfile(response.data);
      }
    } catch (err) {
      console.error('创建用户资料失败:', err);
    }
  };

  /**
   * 用户注册
   */
  const register = async (email, password, fullName) => {
    try {
      setLoading(true);
      setError(null);
      
      const metadata = fullName ? { full_name: fullName } : {};
      const response = await authAPI.register(email, password, metadata);
      
      if (response.success) {
        return { success: true, message: '注册成功！请检查邮箱进行验证' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '注册失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 用户登录
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login(email, password);
      
      if (response.success) {
        return { success: true, message: '登录成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '登录失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 用户登出
   */
  const logout = async () => {
    try {
      setLoading(true);
      const response = await authAPI.logout();
      
      if (response.success) {
        return { success: true, message: '登出成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '登出失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 更新用户资料
   */
  const updateProfile = async (updates) => {
    try {
      if (!user?.id) {
        throw new Error('用户未登录');
      }
      
      setLoading(true);
      const response = await userAPI.updateUserProfile(user.id, updates);
      
      if (response.success) {
        setUserProfile(response.data);
        return { success: true, data: response.data, message: '资料更新成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '更新资料失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 上传用户头像
   */
  const uploadAvatar = async (file) => {
    try {
      if (!user?.id) {
        throw new Error('用户未登录');
      }
      
      setLoading(true);
      const response = await userAPI.uploadAvatar(user.id, file);
      
      if (response.success) {
        // 更新本地头像URL
        if (userProfile) {
          setUserProfile({
            ...userProfile,
            avatar_url: response.url
          });
        }
        return { success: true, url: response.url, message: '头像上传成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '上传头像失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 发送密码重置邮件
   */
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.resetPassword(email);
      
      if (response.success) {
        return { success: true, message: '密码重置邮件已发送，请查收邮箱！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '发送邮件失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 刷新认证令牌
   */
  const refreshToken = async () => {
    try {
      setLoading(true);
      
      // Supabase自动处理令牌刷新，但我们可以手动刷新
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      if (data?.user) {
        setUser(data.user);
      }
      
      return { success: true, data };
    } catch (err) {
      console.error('刷新令牌失败:', err);
      // 如果刷新失败，可能需要重新登录
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // 提供给子组件的值
  const value = {
    // 用户状态
    user,
    userProfile,
    loading,
    error,
    isAuthenticated: !!user,
    isInitialized,
    
    // 认证方法
    register,
    login,
    logout,
    updateProfile,
    uploadAvatar,
    resetPassword,
    refreshToken,
    
    // 辅助方法
    clearError: () => setError(null)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * 使用认证上下文的Hook
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === null) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  
  return context;
};

/**
 * 受保护的路由组件包装器
 */
export const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const { isAuthenticated, isInitialized, loading } = useAuth();
  
  // 如果认证状态尚未初始化，显示加载状态
  if (!isInitialized || loading) {
    return <div className="auth-loading">正在检查认证状态...</div>;
  }
  
  // 如果未认证，重定向到登录页
  if (!isAuthenticated) {
    // 在实际应用中，这里应该使用React Router的重定向
    // 这里只是一个示例
    window.location.href = redirectTo;
    return null;
  }
  
  // 已认证，渲染子组件
  return children;
};

export default AuthContext;