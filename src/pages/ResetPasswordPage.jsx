import React, { useState, useEffect } from 'react';
import { LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, message } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../utils/supabaseClient';
import '../styles/auth.css';

const ResetPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const { confirmResetPassword } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [hasError, setHasError] = useState(false);
  const [errorDescription, setErrorDescription] = useState('');
  const [isValidLink, setIsValidLink] = useState(false);
  const [passwordRecoveryEvent, setPasswordRecoveryEvent] = useState(false);

  useEffect(() => {
    // 检查URL中的错误信息
    const checkUrlForErrors = () => {
      const hash = window.location.hash.substring(1);
      const searchParams = new URLSearchParams(hash);
      
      const error = searchParams.get('error');
      const errorDesc = searchParams.get('error_description');
      
      if (error) {
        setHasError(true);
        setErrorDescription(errorDesc || '');
        setIsValidLink(false);
        console.error('密码重置链接错误:', { error, description: errorDesc });
        return;
      }
      
      // 检查是否是有效的重置链接重定向
      const isRecoveryRedirect = window.location.href.includes('type=recovery') || 
                                hash.includes('type=recovery');
      
      if (isRecoveryRedirect) {
        console.log('检测到密码重置重定向参数');
        // 设置标记，等待PASSWORD_RECOVERY事件
        setIsValidLink(true);
        setHasError(false);
      } else {
        // 检查是否直接访问页面（没有重定向参数）
        const hasNoParams = !hash && window.location.search === '';
        if (hasNoParams) {
          setHasError(true);
          setErrorDescription('请使用邮件中的完整链接访问此页面');
          setIsValidLink(false);
        } else {
          setIsValidLink(true);
        }
      }
    };

    checkUrlForErrors();

    // 监听Supabase的PASSWORD_RECOVERY事件
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase认证状态变化:', event, session);
        
        if (event === 'PASSWORD_RECOVERY') {
          console.log('检测到密码重置事件，链接有效');
          setPasswordRecoveryEvent(true);
          setIsValidLink(true);
          setHasError(false);
          
          // 自动设置用户为已认证状态，以便后续操作
          if (session?.user) {
            console.log('用户已通过密码重置验证');
          }
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('用户已登录，密码重置成功');
          // 密码重置后用户会自动登录，可以在这里处理后续逻辑
        }
        
        if (event === 'USER_UPDATED') {
          console.log('用户信息已更新，密码重置完成');
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // 调试信息
  useEffect(() => {
    console.log('ResetPasswordPage状态:', {
      hasError,
      errorDescription,
      isValidLink,
      currentUrl: window.location.href,
      hash: window.location.hash
    });
  }, [hasError, errorDescription, isValidLink]);

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
      const result = await confirmResetPassword(values.password);
      console.log('密码重置结果:', result);
      
      if (result.success) {
        message.success('密码重置成功，请重新登录');
        navigate('/login');
      } else {
        console.error('密码重置失败:', result.error);
        message.error(result.error || '密码重置失败，请重试');
      }
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