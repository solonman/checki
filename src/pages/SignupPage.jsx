import { Card, Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react'; // 添加useState导入
import '../styles/auth.css';

const SignupPage = () => {
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await signup(values.email, values.password, values.name);
      message.success('注册成功，请登录');
      navigate('/login');
    } catch (error) {
      message.error(error.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        {/* 添加logo部分 */}
        <div className="logo-container">
          <img src="/checki.png" alt="AI校对应用" className="login-logo" />
        </div>
        {/* 简化标题 */}
        <Card title="注册" className="auth-card">
          <Form
            name="signup"
            onFinish={onFinish}
          >
            <Form.Item
              name="name"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="姓名" />
            </Form.Item>
            <Form.Item
              name="email"
              rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱地址' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="邮箱" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码长度至少为6位' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-button" loading={loading}>
                注册
              </Button>
              <span className="register-link">
                已有账号？<Link to="/login">立即登录</Link>
              </span>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;