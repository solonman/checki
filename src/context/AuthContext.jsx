import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../utils/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查用户是否已登录
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
      setLoading(false);
    };

    checkUser();

    // 修复：正确订阅认证状态变化
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    // 修复：使用正确的方式取消订阅
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 注册用户
  const signup = async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('注册失败:', error.message);
      throw error;
    }
  };

  // 登录用户
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('登录失败:', error.message);
      throw error;
    }
  };

  // 注销用户
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('注销失败:', error.message);
    }
  };

  // 更新用户信息
  const updateUserProfile = async (userData) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: userData
      });
      
      if (error) throw error;
      
      setUser(data.user);
      return data;
    } catch (error) {
      console.error('更新用户信息失败:', error.message);
      throw error;
    }
  };

  // 发送密码重置邮件
  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('发送密码重置邮件失败:', error.message);
      throw error;
    }
  };

  // 确认密码重置并设置新密码
  const confirmResetPassword = async (accessToken, newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      }, {
        // 在实际使用中，这个参数应该从URL中获取
        // 这里只是作为示例展示如何使用
        access_token: accessToken
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('重置密码失败:', error.message);
      throw error;
    }
  };

  // 获取用户角色
  const getUserRole = () => {
    return user?.user_metadata?.role || 'user';
  };

  // 检查用户是否为管理员
  const isAdmin = () => {
    return getUserRole() === 'admin';
  };

  // 检查用户是否具有特定角色
  const hasRole = (role) => {
    const userRole = getUserRole();
    return userRole === role || (role !== 'admin' && userRole === 'admin');
  };

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
    resetPassword,
    confirmResetPassword,
    getUserRole,
    isAdmin,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};