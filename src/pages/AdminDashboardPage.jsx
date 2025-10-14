import React, { useState, useEffect } from 'react';
import { Layout, Card, Typography, Row, Col, Button, Table, Tag, message } from 'antd';
import { UserOutlined, DatabaseOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/adminDashboard.css';

const { Title, Text } = Typography;
const { Header, Content } = Layout;

const AdminDashboardPage = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    totalTasks: 0
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查用户是否为管理员
    if (!isAdmin()) {
      navigate('/');
      return;
    }

    // 模拟加载数据
    const loadAdminData = async () => {
      try {
        setLoading(true);
        // 在实际应用中，这里应该从API获取数据
        // 模拟API请求延迟
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 模拟统计数据
        setStatistics({
          totalUsers: 25,
          activeUsers: 18,
          totalProjects: 42,
          totalTasks: 187
        });
        
        // 模拟用户数据
        setUsers([
          { key: '1', name: '张三', email: 'zhangsan@example.com', role: 'admin', status: 'active', lastLogin: '2023-09-15 14:30' },
          { key: '2', name: '李四', email: 'lisi@example.com', role: 'user', status: 'active', lastLogin: '2023-09-14 09:15' },
          { key: '3', name: '王五', email: 'wangwu@example.com', role: 'user', status: 'inactive', lastLogin: '2023-09-10 16:45' },
          { key: '4', name: '赵六', email: 'zhaoliu@example.com', role: 'user', status: 'active', lastLogin: '2023-09-15 11:20' },
          { key: '5', name: '孙七', email: 'sunqi@example.com', role: 'user', status: 'active', lastLogin: '2023-09-13 13:50' },
        ]);
      } catch (error) {
        console.error('加载管理员数据失败:', error);
        message.error('加载数据失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [isAdmin, navigate]);

  // 处理注销
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      message.error('注销失败，请重试');
    }
  };

  // 处理用户角色变更
  const handleRoleChange = async (userId, newRole) => {
    try {
      // 在实际应用中，这里应该调用API更新用户角色
      message.success(`用户角色已更新为${newRole}`);
    } catch (error) {
      message.error('更新用户角色失败，请重试');
    }
  };

  // 用户表格列配置
  const columns = [
    {
      title: '用户名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <UserOutlined style={{ marginRight: 8 }} />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role, record) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={status === 'active' ? 'green' : 'gray'}>
          {status === 'active' ? '活跃' : '不活跃'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type={record.role === 'admin' ? 'default' : 'primary'} 
          size="small" 
          onClick={() => handleRoleChange(record.key, record.role === 'admin' ? 'user' : 'admin')}
          disabled={record.role === 'admin' && user.email === record.email}
        >
          {record.role === 'admin' ? '降为普通用户' : '提升为管理员'}
        </Button>
      ),
    },
  ];

  return (
    <Layout className="admin-layout">
      <Header className="admin-header">
        <div className="admin-header-left">
          <Title level={3} style={{ color: 'white', margin: 0 }}>管理控制台</Title>
        </div>
        <div className="admin-header-right">
          <span style={{ color: 'white', marginRight: 16 }}>管理员，{user?.user_metadata?.name || user?.email}</span>
          <Button type="default" icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </Header>
      
      <Content className="admin-content">
        <div className="admin-container">
          <div className="admin-welcome">
            <Title level={4}>欢迎使用管理控制台</Title>
            <Text type="secondary">这里是系统管理员专用的控制面板，您可以查看系统统计信息和管理用户。</Text>
          </div>
          
          {/* 统计卡片区域 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card className="stat-card" loading={loading}>
                <div className="stat-icon">
                  <UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{statistics.totalUsers}</div>
                  <div className="stat-label">总用户数</div>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card" loading={loading}>
                <div className="stat-icon">
                  <UserOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{statistics.activeUsers}</div>
                  <div className="stat-label">活跃用户</div>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card" loading={loading}>
                <div className="stat-icon">
                  <DatabaseOutlined style={{ fontSize: 24, color: '#faad14' }} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{statistics.totalProjects}</div>
                  <div className="stat-label">项目总数</div>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card" loading={loading}>
                <div className="stat-icon">
                  <SettingOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">{statistics.totalTasks}</div>
                  <div className="stat-label">任务总数</div>
                </div>
              </Card>
            </Col>
          </Row>
          
          {/* 用户管理表格 */}
          <Card title="用户管理" className="admin-card">
            <Table 
              columns={columns} 
              dataSource={users} 
              rowKey="key" 
              loading={loading} 
              pagination={{ pageSize: 10 }}
              className="users-table"
            />
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default AdminDashboardPage;