import React from 'react';
import { Layout, Button, Typography, Card, Row, Col, Avatar } from 'antd';
import { UploadOutlined, FileTextOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/dashboard.css';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;
const { Meta } = Card;

const DashboardPage = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // 登出后不立即导航，让 Supabase 请求完成
  };

  const features = [
    {
      title: '文件校对',
      description: '上传广告稿件进行错别字、合规性等检查',
      icon: <UploadOutlined style={{ fontSize: '24px' }} />,
      link: '/proofread'
    },
    {
      title: '项目管理',
      description: '创建和管理您的广告项目及标准信息',
      icon: <FileTextOutlined style={{ fontSize: '24px' }} />,
      link: '/projects'
    },
    {
      title: '设置',
      description: '管理您的账户和应用设置',
      icon: <SettingOutlined style={{ fontSize: '24px' }} />,
      link: '/settings'
    }
  ];

  return (
    <Layout className="layout">
      <Header className="header">
        <div className="header-left">
          <Title level={3} style={{ color: 'white', margin: 0 }}>广告校对应用</Title>
        </div>
        <div className="header-right">
          <span style={{ color: 'white', marginRight: 16 }}>欢迎，{user?.user_metadata?.name || user?.email}</span>
          <Button type="default" onClick={handleLogout}>退出登录</Button>
        </div>
      </Header>
      <Content style={{ padding: '0 50px', marginTop: 24, marginBottom: 24 }}>
        <div className="content-wrapper">
          <div className="welcome-section">
            <Row gutter={[16, 16]} align="middle">
              <Col>
                <Avatar size={64} icon={<UserOutlined />} />
              </Col>
              <Col>
                <Title level={2}>欢迎使用广告校对应用</Title>
                <Paragraph>
                  这是一个帮助您校对广告稿件的智能工具，可以检查错别字、信息准确性、logo准确度和合规性。
                </Paragraph>
              </Col>
            </Row>
          </div>
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} md={8} key={index}>
                <Card className="feature-card" hoverable>
                  <Meta
                    avatar={feature.icon}
                    title={feature.title}
                    description={feature.description}
                  />
                  <Link to={feature.link}>
                    <Button type="primary" style={{ marginTop: 16, width: '100%' }}>
                      立即前往
                    </Button>
                  </Link>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Content>
    </Layout>
  );
};

export default DashboardPage;