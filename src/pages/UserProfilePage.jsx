import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Avatar } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import '../styles/userProfile.css';

const UserProfilePage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user, updateUserProfile } = useAuth();

  // 初始化表单数据
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        avatar: user.user_metadata?.avatar || '',
      });
    }
  }, [user, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // 准备要更新的用户数据
      const userData = {
        name: values.name,
        phone: values.phone
        // 头像上传功能可以在后续扩展
      };
      
      // 调用AuthContext中的updateUserProfile函数更新用户信息
      await updateUserProfile(userData);
      
      message.success('用户信息更新成功');
    } catch (error) {
      console.error('更新用户信息失败:', error);
      message.error(error.message || '更新用户信息失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-profile-container">
      <Card title="个人信息管理" className="user-profile-card">
        <div className="user-profile-content">
          <div className="avatar-section">
            <Avatar size={80} icon={<UserOutlined />} />
            <div className="avatar-upload">
              <Button>上传头像</Button>
              <p className="avatar-hint">支持JPG、PNG格式，大小不超过2MB</p>
            </div>
          </div>
          
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="profile-form"
          >
            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="请输入姓名" />
            </Form.Item>
            
            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱地址' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="请输入邮箱" disabled />
            </Form.Item>
            
            <Form.Item
              name="phone"
              label="手机号码"
              rules={[{ message: '请输入有效的手机号码' }]}
            >
              <Input placeholder="请输入手机号码" />
            </Form.Item>
            
            <Form.Item
              name="avatar"
              label="头像URL"
              hidden
            >
              <Input placeholder="头像URL" />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} className="submit-button">
                保存修改
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Card>
    </div>
  );
};

export default UserProfilePage;