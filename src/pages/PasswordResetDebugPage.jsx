import React, { useState, useEffect } from 'react';
import { Card, Button, message, Typography, Divider, Alert } from 'antd';
import { Link } from 'react-router-dom';

const { Text, Paragraph } = Typography;

const PasswordResetDebugPage = () => {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    analyzeCurrentPage();
  }, []);

  const analyzeCurrentPage = () => {
    const currentUrl = window.location.href;
    const urlObj = new URL(currentUrl);
    const searchParams = Object.fromEntries(urlObj.searchParams);
    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
    
    const info = {
      currentUrl,
      pathname: urlObj.pathname,
      searchParams,
      hashParams: Object.fromEntries(hashParams),
      hasError: searchParams.error || hashParams.get('error'),
      errorDescription: searchParams.error_description || hashParams.get('error_description'),
      hasAccessToken: !!(searchParams.access_token || hashParams.get('access_token')),
      hasToken: !!(searchParams.token || hashParams.get('token')),
      isSupabaseRedirect: currentUrl.includes('access_token') || currentUrl.includes('type=recovery'),
      userAgent: navigator.userAgent
    };

    setDebugInfo(info);
    console.log('调试信息:', info);
  };

  const simulateSupabaseRedirect = () => {
    // 模拟Supabase重定向URL
    const testUrl = 'http://localhost:3000/reset-password#access_token=test_token_123&type=recovery';
    window.location.href = testUrl;
  };

  const testTokenExtraction = () => {
    const testUrls = [
      'http://localhost:3000/reset-password#access_token=test1&type=recovery',
      'http://localhost:3000/reset-password?access_token=test2&type=recovery',
      'http://localhost:3000/reset-password?token=test3&type=recovery',
      'http://localhost:3000/reset-password#token=test4&type=recovery'
    ];

    testUrls.forEach(url => {
      const urlObj = new URL(url);
      const searchParams = Object.fromEntries(urlObj.searchParams);
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      
      const accessToken = hashParams.get('access_token') || 
                         searchParams.access_token || 
                         hashParams.get('token') || 
                         searchParams.token;

      console.log(`URL: ${url}`);
      console.log(`提取的令牌: ${accessToken}`);
      console.log('---');
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card title="密码重置调试工具">
        <Paragraph>
          此工具用于诊断密码重置链接的问题。请提供具体的错误信息或URL格式。
        </Paragraph>

        <Divider>当前页面分析</Divider>

        <Button type="primary" onClick={analyzeCurrentPage} style={{ marginBottom: '16px' }}>
          重新分析当前页面
        </Button>

        {debugInfo.currentUrl && (
          <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px', marginBottom: '16px' }}>
            <Text strong>分析结果:</Text>
            <br />
            <Text>当前URL: {debugInfo.currentUrl}</Text>
            <br />
            <Text>路径: {debugInfo.pathname}</Text>
            <br />
            <Text>是否有错误: {debugInfo.hasError ? '是' : '否'}</Text>
            <br />
            <Text>错误描述: {debugInfo.errorDescription || '无'}</Text>
            <br />
            <Text>是否有access_token: {debugInfo.hasAccessToken ? '是' : '否'}</Text>
            <br />
            <Text>是否有token: {debugInfo.hasToken ? '是' : '否'}</Text>
            <br />
            <Text>是否是Supabase重定向: {debugInfo.isSupabaseRedirect ? '是' : '否'}</Text>
            <br />
            <Text>用户代理: {debugInfo.userAgent}</Text>
          </div>
        )}

        <Divider>测试功能</Divider>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <Button onClick={simulateSupabaseRedirect}>
            模拟Supabase重定向
          </Button>
          <Button onClick={testTokenExtraction}>
            测试令牌提取逻辑
          </Button>
        </div>

        <Divider>常见问题诊断</Divider>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Alert 
            type="info"
            message="问题1: 链接格式不正确"
            description="请确保点击的是邮件中的完整链接，而不是直接访问重置页面。正确的链接应该包含access_token或token参数。"
          />

          <Alert 
            type="warning"
            message="问题2: 链接已过期"
            description="密码重置链接通常有24小时的有效期。如果链接已过期，需要重新请求密码重置。"
          />

          <Alert 
            type="error"
            message="问题3: 浏览器兼容性问题"
            description="某些浏览器可能对URL哈希参数的处理不同。请尝试使用Chrome或Firefox浏览器。"
          />
        </div>

        <Divider>下一步操作</Divider>

        <div style={{ textAlign: 'center' }}>
          <Link to="/reset-password">
            <Button style={{ marginRight: '8px' }}>返回密码重置页面</Button>
          </Link>
          <Link to="/forgot-password">
            <Button type="primary">重新请求密码重置</Button>
          </Link>
        </div>

        <Divider>调试信息</Divider>

        <details>
          <summary>查看详细调试信息</summary>
          <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      </Card>
    </div>
  );
};

export default PasswordResetDebugPage;