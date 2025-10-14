import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 基于角色的受保护路由组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 * @param {Array} props.roles - 允许访问的角色列表
 * @returns {React.ReactNode} 路由组件
 */
const ProtectedRoute = ({ children, roles = ['user'] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>加载中...</div>;
  }

  // 检查用户是否登录
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 检查用户角色是否在允许的角色列表中
  const userRole = user.user_metadata?.role || 'user'; // 默认角色为普通用户
  
  // 如果角色列表包含'admin'，并且用户是管理员，则允许访问
  // 否则检查用户角色是否在允许的角色列表中
  const isAllowed = (roles.includes('admin') && userRole === 'admin') || roles.includes(userRole);

  if (!isAllowed) {
    // 用户没有足够的权限访问此页面
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2>权限不足</h2>
        <p>您没有足够的权限访问此页面，请联系管理员。</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;