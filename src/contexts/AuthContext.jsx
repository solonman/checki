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
        
        // 设置超时机制，防止无限等待
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('初始化超时')), 5000)
        );
        
        // 尝试初始化，但设置超时
        const initPromise = (async () => {
          try {
            // 首先检查网络连接和服务可用性
            const healthCheck = await authAPI.healthCheck().catch(() => ({ success: false }));
            
            if (!healthCheck.success) {
              console.warn('服务不可用，使用离线模式');
              // 服务不可用，直接标记为初始化完成，使用离线模式
              setUser(null);
              setUserProfile(null);
              setIsInitialized(true);
              return;
            }
            
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
            console.error('认证初始化失败:', err);
            // 即使认证失败，也允许用户继续使用应用
            setUser(null);
            setUserProfile(null);
            setIsInitialized(true);
          }
        })();
        
        // 使用Promise.race设置超时
        await Promise.race([initPromise, timeoutPromise]);
        
      } catch (err) {
        console.error('初始化认证失败:', err);
        // 超时或其他错误，允许用户继续使用应用
        setUser(null);
        setUserProfile(null);
        setIsInitialized(true);
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
      
      // 检查服务是否可用
      const healthCheck = await authAPI.healthCheck().catch(() => ({ success: false }));
      if (!healthCheck.success) {
        return { success: false, error: '服务暂时不可用，请稍后重试' };
      }
      
      const metadata = fullName ? { full_name: fullName } : {};
      const response = await authAPI.register(email, password, metadata);
      
      if (response.success) {
        // 注册成功后，尝试获取或创建用户资料
        // 等待触发器创建用户记录，或手动创建
        try {
          if (response.data?.user?.id) {
            // 等待一小段时间让触发器执行
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 尝试获取用户资料
            const profileResponse = await userAPI.getUserProfile(response.data.user.id);
            if (!profileResponse.success || !profileResponse.data) {
              // 如果触发器没有创建记录，手动创建
              console.log('触发器未创建用户资料，手动创建...');
              await createUserProfile(response.data.user.id);
            }
          }
        } catch (profileError) {
          console.warn('创建用户资料时出错:', profileError);
          // 不中断注册流程，用户可以在后续操作中完善资料
        }
        
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
      
      // 检查服务是否可用
      const healthCheck = await authAPI.healthCheck().catch(() => ({ success: false }));
      if (!healthCheck.success) {
        return { success: false, error: '服务暂时不可用，请稍后重试' };
      }
      
      const response = await authAPI.login(email, password);
      
      if (response.success) {
        // 登录成功后，主动获取用户信息
        try {
          const currentUser = await authAPI.getCurrentUser();
          if (currentUser.success && currentUser.user) {
            setUser(currentUser.user);
            await fetchUserProfile(currentUser.user.id);
          }
        } catch (userError) {
          console.warn('获取用户信息失败:', userError);
          // 不中断登录流程，依赖onAuthStateChange事件
        }
        
        return { success: true, message: '登录成功！' };
      } else {
        // 优化错误信息显示
        let userFriendlyError = response.error;
        if (response.error.includes('Invalid login credentials')) {
          userFriendlyError = '邮箱或密码错误，请检查后重试';
        } else if (response.error.includes('Email not confirmed')) {
          userFriendlyError = '邮箱未验证，请检查邮箱并完成验证';
        } else if (response.error.includes('email_address_invalid')) {
          userFriendlyError = '邮箱格式不正确，请输入有效的邮箱地址';
        }
        
        setError(userFriendlyError);
        return { success: false, error: userFriendlyError };
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
      const errorMessage = err.message || '更新用户资料失败';
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
      // 优化错误信息显示
      let errorMessage = err.message || '发送邮件失败，请稍后重试';
      if (err.message.includes('over_email_send_rate_limit')) {
        errorMessage = '发送频率过高，请等待40秒后重试';
      } else if (err.message.includes('timeout') || err.message.includes('Timeout')) {
        errorMessage = '请求超时，请检查网络连接后重试';
      }
      
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

  /**
   * 确认密码重置（通过邮件链接）
   */
  const confirmResetPassword = async (newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('AuthContext: 开始确认密码重置');
      
      const response = await authAPI.confirmResetPassword(newPassword);
      
      console.log('AuthContext: API响应结果:', response);
      
      if (response.success) {
        return { success: true, message: '密码重置成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '密码重置失败，请重试';
      console.error('AuthContext: 密码重置异常:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      console.log('AuthContext: 确认密码重置流程结束');
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
    confirmResetPassword,
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