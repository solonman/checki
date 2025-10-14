import React, { useState } from 'react';
import { UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { Card, Form, Input, Button, message } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import '../styles/auth.css';

const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await resetPassword(values.email);
      message.success('密码重置邮件已发送，请检查您的邮箱');
    } catch (error) {
      message.error(error.message || '发送邮件失败，请重试');
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
        <Card title="重置密码" className="auth-card">
          <Form
            name="forgotPassword"
            onFinish={onFinish}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' }, 
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="邮箱" />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="login-button" 
                loading={loading}
              >
                发送重置邮件
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

export default ForgotPasswordPage;