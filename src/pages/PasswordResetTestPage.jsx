import React, { useState } from 'react';
import { Card, Button, Input, message, Divider, Typography } from 'antd';
import { Link } from 'react-router-dom';

const { Text, Paragraph } = Typography;

const PasswordResetTestPage = () => {
  const [testUrl, setTestUrl] = useState('');
  const [parsedParams, setParsedParams] = useState(null);

  // 模拟Supabase密码重置链接格式
  const sampleLinks = [
    {
      name: '标准格式',
      url: 'http://localhost:3000/reset-password?token=test_token_123&type=recovery'
    },
    {
      name: '带哈希格式',
      url: 'http://localhost:3000/reset-password#access_token=test_token_456&type=recovery'
    },
    {
      name: 'Supabase重定向格式',
      url: 'http://localhost:3000/reset-password?type=recovery&token=test_token_789'
    },
    {
      name: '错误链接格式',
      url: 'http://localhost:3000/reset-password?error=access_denied&error_description=Email+link+is+invalid+or+has+expired'
    }
  ];

  const parseUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const searchParams = Object.fromEntries(urlObj.searchParams);
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      
      const params = {
        searchParams,
        hashParams: Object.fromEntries(hashParams),
        fullUrl: urlObj.href,
        pathname: urlObj.pathname
      };
      
      setParsedParams(params);
      message.success('URL解析成功');
    } catch (error) {
      message.error('URL格式错误');
    }
  };

  const testCurrentPage = () => {
    const currentUrl = window.location.href;
    const urlObj = new URL(currentUrl);
    const searchParams = Object.fromEntries(urlObj.searchParams);
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    
    const params = {
      searchParams,
      hashParams: Object.fromEntries(hashParams),
      fullUrl: currentUrl,
      pathname: urlObj.pathname
    };
    
    setParsedParams(params);
    message.success('当前页面URL解析成功');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card title="密码重置链接测试工具">
        <Paragraph>
          此工具用于测试Supabase密码重置链接的解析逻辑。请使用真实的密码重置链接进行测试。
        </Paragraph>
        
        <Divider>测试当前页面</Divider>
        
        <div style={{ marginBottom: '16px' }}>
          <Button type="primary" onClick={testCurrentPage}>
            解析当前页面URL
          </Button>
        </div>
        
        <Divider>手动测试链接</Divider>
        
        <div style={{ marginBottom: '16px' }}>
          <Input 
            placeholder="粘贴密码重置链接URL"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            style={{ marginBottom: '8px' }}
          />
          <Button 
            type="primary" 
            onClick={() => parseUrl(testUrl)}
            disabled={!testUrl}
          >
            解析URL
          </Button>
        </div>
        
        <Divider>示例链接</Divider>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sampleLinks.map((link, index) => (
            <div key={index} style={{ padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
              <Text strong>{link.name}:</Text>
              <br />
              <Text code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                {link.url}
              </Text>
              <br />
              <Button 
                size="small" 
                type="link" 
                onClick={() => {
                  setTestUrl(link.url);
                  parseUrl(link.url);
                }}
              >
                使用此链接
              </Button>
            </div>
          ))}
        </div>
        
        {parsedParams && (
          <>
            <Divider>解析结果</Divider>
            
            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
              <Text strong>完整URL:</Text>
              <br />
              <Text code>{parsedParams.fullUrl}</Text>
              
              <br /><br />
              
              <Text strong>路径:</Text>
              <br />
              <Text>{parsedParams.pathname}</Text>
              
              <br /><br />
              
              <Text strong>查询参数 (searchParams):</Text>
              <br />
              <Text code>{JSON.stringify(parsedParams.searchParams, null, 2)}</Text>
              
              <br /><br />
              
              <Text strong>哈希参数 (hashParams):</Text>
              <br />
              <Text code>{JSON.stringify(parsedParams.hashParams, null, 2)}</Text>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              <Text strong>检测结果:</Text>
              <br />
              {parsedParams.searchParams.type === 'recovery' || parsedParams.hashParams.type === 'recovery' ? (
                <Text type="success">✓ 检测到密码重置参数</Text>
              ) : (
                <Text type="warning">⚠ 未检测到密码重置参数</Text>
              )}
              <br />
              {parsedParams.searchParams.token || parsedParams.hashParams.token ? (
                <Text type="success">✓ 检测到token参数</Text>
              ) : (
                <Text type="warning">⚠ 未检测到token参数</Text>
              )}
              <br />
              {parsedParams.searchParams.error ? (
                <Text type="danger">✗ 检测到错误: {parsedParams.searchParams.error}</Text>
              ) : (
                <Text type="success">✓ 无错误信息</Text>
              )}
            </div>
          </>
        )}
        
        <Divider />
        
        <div style={{ textAlign: 'center' }}>
          <Link to="/reset-password">
            <Button>返回密码重置页面</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default PasswordResetTestPage;