import React, { useState } from 'react';
import { LockOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Button, message } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import '../styles/auth.css';

const ResetPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { confirmResetPassword } = useAuth();
  const navigate = useNavigate();

  // 从URL中获取访问令牌
  const accessToken = searchParams.get('access_token');

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
  const validateConfirmPassword = (_rule, value, { getFieldValue }) => {
    if (!value) {
      return Promise.reject('请确认密码');
    }
    if (value !== getFieldValue('password')) {
      return Promise.reject('两次输入的密码不一致');
    }
    return Promise.resolve();
  };

  const onFinish = async (values) => {
    if (!accessToken) {
      message.error('无效的重置链接，请重新请求密码重置');
      return;
    }

    setLoading(true);
    try {
      await confirmResetPassword(accessToken, values.password);
      message.success('密码重置成功，请登录');
      navigate('/login');
    } catch (error) {
      message.error(error.message || '密码重置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="logo-container">
          <img src="/logo小.png" alt="AI校对应用" className="login-logo" />
        </div>
        <Card title="设置新密码" className="auth-card">
          <Form
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
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;