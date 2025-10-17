import React, { useState, useEffect } from 'react';
import { LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, message } from 'antd';
import supabase from '../utils/supabaseClient';
import '../styles/auth.css';

const ResetPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [hasError, setHasError] = useState(false);
  const [errorDescription, setErrorDescription] = useState('');
  const [isValidLink, setIsValidLink] = useState(false);
  const [passwordRecoveryEvent, setPasswordRecoveryEvent] = useState(false);

  useEffect(() => {
    let timeoutId = null;
    
    // 改进的URL解析函数
    const parseResetLink = () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const searchParams = url.searchParams;
      
      // 从hash和search中获取参数
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      const type = hashParams.get('type') || searchParams.get('type');
      
      console.log('URL解析结果:', {
        href: url.href,
        hash: url.hash,
        search: url.search,
        accessToken: accessToken ? '存在' : '不存在',
        refreshToken: refreshToken ? '存在' : '不存在',
        type: type || '未指定'
      });
      
      return { accessToken, refreshToken, type };
    };

    // 订阅 auth 事件
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Supabase认证事件:', event, session);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('检测到PASSWORD_RECOVERY事件');
        setPasswordRecoveryEvent(true);
        setIsValidLink(true);
        setHasError(false);
      }
      
      if (event === 'SIGNED_IN' && session) {
        console.log('检测到SIGNED_IN事件，会话有效');
        setPasswordRecoveryEvent(true);
        setIsValidLink(true);
        setHasError(false);
      }
      
      if (event === 'TOKEN_REFRESHED' && session) {
        console.log('检测到TOKEN_REFRESHED事件，会话有效');
        setPasswordRecoveryEvent(true);
        setIsValidLink(true);
        setHasError(false);
      }
    });

    const checkAndProcessResetLink = async () => {
      try {
        console.log('开始检查密码重置链接...');
        
        // 解析URL参数
        const { accessToken, refreshToken, type } = parseResetLink();
        
        // 检查是否是有效的重置链接
        if (!accessToken) {
          console.log('未找到access_token参数');
          setHasError('invalid_access');
          setErrorDescription('请使用邮件中的完整链接访问此页面');
          setIsValidLink(false);
          return;
        }
        
        if (type !== 'recovery') {
          console.log('链接类型不是recovery:', type);
          setHasError('invalid_access');
          setErrorDescription('链接类型无效，请使用密码重置链接');
          setIsValidLink(false);
          return;
        }
        
        console.log('检测到有效的重置链接，开始设置会话...');
        
        // 尝试设置会话 - 使用Supabase推荐的方法
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || undefined
        });
        
        console.log('setSession结果:', { data, error });
        
        if (error) {
          console.error('设置会话失败:', error);
          // 检查是否是无效的访问令牌错误
          if (error.message?.includes('invalid') || error.message?.includes('expired')) {
            setHasError('invalid_access');
            setErrorDescription('密码重置链接无效或已过期，请重新请求密码重置');
          } else {
            setHasError('session_error');
            setErrorDescription(`会话设置失败: ${error.message}`);
          }
          setIsValidLink(false);
          return;
        }
        
        // 检查会话是否设置成功
        const session = data?.session;
        if (session) {
          console.log('会话设置成功，用户ID:', session.user?.id);
          setPasswordRecoveryEvent(true);
          setIsValidLink(true);
          setHasError(false);
        } else {
          console.log('会话设置成功但未返回会话，等待认证事件...');
          // 设置超时，避免无限等待
          timeoutId = setTimeout(() => {
            console.log('等待认证事件超时');
            setHasError('timeout_error');
            setErrorDescription('链接验证超时，请重新点击邮件中的链接');
            setIsValidLink(false);
          }, 3000); // 缩短超时时间
        }
      } catch (err) {
        console.error('处理重置链接失败:', err);
        setHasError('validation_error');
        setErrorDescription(err?.message || '链接验证失败，请重试');
        setIsValidLink(false);
      }
    };

    checkAndProcessResetLink();
    
    return () => {
      subscription?.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // 空依赖，仅执行一次

  // 调试信息
  useEffect(() => {
    console.log('ResetPasswordPage状态:', {
      hasError,
      errorDescription,
      isValidLink,
      passwordRecoveryEvent,
      currentUrl: window.location.href,
      hash: window.location.hash
    });
  }, [hasError, errorDescription, isValidLink, passwordRecoveryEvent]);

  // 自定义密码验证规则
  const validatePassword = (_rule, value) => {
    if (!value) {
      return Promise.reject('请输入密码');
    }
    if (value.length < 6) {
      return Promise.reject('密码长度至少为6位');
    }
    return Promise.resolve();
  };

  // 确认密码验证规则
  const validateConfirmPassword = (_rule, value) => {
    if (!value) {
      return Promise.reject('请确认密码');
    }
    const password = form.getFieldValue('password');
    if (password && value !== password) {
      return Promise.reject('两次输入的密码不一致');
    }
    return Promise.resolve();
  };

  const onFinish = async (values) => {
    setLoading(true);
    console.log('开始密码重置流程');
    
    try {
      // 首先检查当前会话状态
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('获取会话失败:', sessionError);
        message.error('会话验证失败，请重新点击重置链接');
        return;
      }
      
      if (!session) {
        console.error('无有效会话');
        message.error('重置链接无效或已过期，请重新请求密码重置');
        return;
      }
      
      console.log('当前会话有效，用户ID:', session.user?.id);
      
      // 直接使用Supabase更新密码，而不是通过API客户端
      console.log('正在更新用户密码...');
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });
      
      if (error) {
        console.error('密码更新失败:', error);
        
        // 提供更具体的错误信息
        let errorMessage = error.message || '密码重置失败，请重试';
        if (error.message.includes('Password should be at least 6 characters')) {
          errorMessage = '密码长度至少为6位';
        } else if (error.message.includes('Invalid authentication') || error.message.includes('JWT')) {
          errorMessage = '重置链接无效或已过期，请重新请求密码重置';
        }
        
        message.error(errorMessage);
        return;
      }
      
      console.log('密码更新成功');
      message.success('密码重置成功！请重新登录');
      
      // 登出当前会话，让用户重新登录
      await supabase.auth.signOut();
      
      // 跳转到登录页面
      navigate('/login');
      
    } catch (error) {
      console.error('密码重置异常:', error);
      message.error(error.message || '密码重置失败，请重试');
    } finally {
      setLoading(false);
      console.log('密码重置流程结束');
    }
  };



  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="logo-container">
          <img src="/checki.png" alt="AI校对应用" className="login-logo" />
        </div>
        <Card title="设置新密码" className="auth-card">
          {hasError ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              {hasError === 'access_denied' && errorDescription?.includes('Email link is invalid or has expired') ? (
                <>
                  <h3 style={{ color: '#ff4d4f' }}>密码重置链接已过期</h3>
                  <p>您的密码重置链接已超过有效期（通常为24小时）。</p>
                  <p>请重新请求密码重置邮件。</p>
                </>
              ) : (
                <>
                  <h3 style={{ color: '#ff4d4f' }}>密码重置链接无效</h3>
                  <p>错误代码: {hasError}</p>
                  <p>错误描述: {errorDescription}</p>
                  <p>可能的原因：</p>
                  <ul style={{ textAlign: 'left', margin: '20px 0' }}>
                    <li>链接已超过有效期（通常为24小时）</li>
                    <li>链接已被使用过</li>
                    <li>链接格式不正确</li>
                  </ul>
                </>
              )}
              <Button type="primary">
                <Link to="/forgot-password" style={{ color: 'white', textDecoration: 'none' }}>
                  重新请求密码重置
                </Link>
              </Button>
            </div>
          ) : !passwordRecoveryEvent && !isValidLink ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3 style={{ color: '#ff4d4f' }}>无效的重置链接</h3>
              <p>请确保您使用的是完整的重置链接。</p>
              <p>如果您是从邮件中点击链接，请尝试以下方法：</p>
              <ul style={{ textAlign: 'left', margin: '20px 0' }}>
                <li>复制邮件中的完整链接</li>
                <li>在浏览器中粘贴并访问</li>
                <li>或者重新请求密码重置</li>
              </ul>
              <p style={{ color: '#666', fontSize: '14px', marginTop: '16px' }}>
                提示：请确保点击的是邮件中的完整链接，而不是直接访问此页面。
              </p>
              <Button type="primary">
                <Link to="/forgot-password" style={{ color: 'white', textDecoration: 'none' }}>
                  重新请求密码重置
                </Link>
              </Button>
            </div>
          ) : passwordRecoveryEvent ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3 style={{ color: '#52c41a' }}>链接验证成功</h3>
              <p>您的密码重置链接已验证通过，请设置新密码。</p>
              <Form
                form={form}
                name="resetPassword"
                onFinish={onFinish}
              >
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, validator: validatePassword }
                  ]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, validator: validateConfirmPassword }
                  ]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="确认新密码" />
                </Form.Item>
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    className="login-button" 
                    loading={loading}
                  >
                    确认重置
                  </Button>
                  <span className="register-link">
                    <Link to="/login">返回登录</Link>
                  </span>
                </Form.Item>
              </Form>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3>正在验证重置链接...</h3>
              <p>请稍等，系统正在验证您的密码重置链接。</p>
              <p>如果长时间没有响应，请尝试重新点击邮件中的链接。</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;