import { Card, Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react'; // 添加缺失的useState导入
import '../styles/auth.css';

const LoginPage = () => {
  const { login, loading } = useAuth();
  const [formLoading, setFormLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setFormLoading(true);
    try {
      const result = await login(values.email, values.password);
      if (result.success) {
        message.success(result.message || '登录成功');
        // 给状态更新一点时间，然后跳转
        setTimeout(() => {
          navigate('/');
        }, 100);
      } else {
        message.error(result.error || '登录失败，请重试');
      }
    } catch (error) {
      message.error(error.message || '登录失败，请重试');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        {/* 在红框处添加logo */}
        <div className="logo-container">
          <img src="/checki.png" alt="AI校对应用" className="login-logo" />
        </div>
        <Card title="登录" className="auth-card">
          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={onFinish}
          >
            <Form.Item
              name="email"
              rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱地址' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="邮箱" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-button" loading={loading || formLoading}>
                登录
              </Button>
              <span className="register-link">
                还没有账号？<Link to="/signup">立即注册</Link>
              </span>
              <span className="register-link">
                <Link to="/forgot-password">忘记密码？</Link>
              </span>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;