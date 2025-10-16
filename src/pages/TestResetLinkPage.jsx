import React, { useState, useEffect } from 'react';
import { Card, Button, Input, message } from 'antd';

const TestResetLinkPage = () => {
  const [testUrl, setTestUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.href);
    // 设置默认测试URL
    setTestUrl('http://localhost:3000/reset-password#access_token=test_access_token_12345&refresh_token=test_refresh_token&expires_in=3600&token_type=bearer&type=recovery');
  }, []);

  // 解析当前URL的所有参数
  const parseUrlParams = (url = window.location.href) => {
    try {
      const urlObj = new URL(url);
      const result = {
        href: url,
        hash: urlObj.hash,
        search: urlObj.search,
        pathname: urlObj.pathname
      };

      // 解析查询参数
      const searchParams = urlObj.searchParams;
      result.searchParams = {};
      for (let [key, value] of searchParams) {
        result.searchParams[key] = value;
      }

      // 解析hash参数
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      result.hashParams = {};
      for (let [key, value] of hashParams) {
        result.hashParams[key] = value;
      }

      // 尝试获取访问令牌
      result.accessToken = result.hashParams['access_token'] || 
                         result.searchParams['access_token'] || 
                         result.hashParams['token'] || 
                         result.searchParams['token'];

      return result;
    } catch (error) {
      console.error('URL解析错误:', error);
      return { error: error.message };
    }
  };

  const handleTestUrl = () => {
    if (testUrl) {
      window.location.href = testUrl;
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(testUrl).then(() => {
      message.success('测试链接已复制到剪贴板');
    });
  };

  const urlInfo = parseUrlParams();

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Card title="重置链接调试工具" style={{ marginBottom: '20px' }}>
        <h3>测试URL生成器</h3>
        <div style={{ marginBottom: '20px' }}>
          <Input.TextArea
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            rows={3}
            placeholder="输入测试URL"
            style={{ marginBottom: '10px' }}
          />
          <Button type="primary" onClick={handleTestUrl} style={{ marginRight: '10px' }}>
            跳转到测试URL
          </Button>
          <Button onClick={handleCopyUrl}>
            复制测试链接
          </Button>
        </div>

        <h3>当前URL信息</h3>
        <p><strong>完整URL:</strong> {urlInfo.href}</p>
        <p><strong>路径:</strong> {urlInfo.pathname}</p>
        <p><strong>查询字符串:</strong> {urlInfo.search}</p>
        <p><strong>Hash:</strong> {urlInfo.hash}</p>
        
        <h3>查询参数</h3>
        <pre>{JSON.stringify(urlInfo.searchParams, null, 2)}</pre>
        
        <h3>Hash参数</h3>
        <pre>{JSON.stringify(urlInfo.hashParams, null, 2)}</pre>
        
        <h3>访问令牌</h3>
        <p><strong>找到的令牌:</strong> {urlInfo.accessToken || '未找到'}</p>
        {urlInfo.accessToken && (
          <p style={{ color: 'green' }}>✓ 成功解析到访问令牌</p>
        )}
        {!urlInfo.accessToken && urlInfo.hash && (
          <p style={{ color: 'red' }}>✗ 未找到访问令牌，请检查链接格式</p>
        )}
      </Card>

      <Card title="Supabase重置链接格式">
        <p>正常的Supabase重置链接格式应该是:</p>
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
{`https://your-project.supabase.co/auth/v1/verify?token=RECOVERY_TOKEN&type=recovery&redirect_to=http://localhost:3000/reset-password`}
        </pre>
        <p>当用户点击这个链接后，会被重定向到:</p>
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
{`http://localhost:3000/reset-password#access_token=ACCESS_TOKEN&refresh_token=REFRESH_TOKEN&expires_in=3600&token_type=bearer&type=recovery`}
        </pre>
        <p><strong>重要提示:</strong> 访问令牌在URL的hash部分，不是查询参数！</p>
      </Card>

      <Card title="快速测试链接">
        <p>点击以下链接快速测试:</p>
        <Button 
          type="link" 
          onClick={() => window.open('http://localhost:3000/reset-password#access_token=quick_test_token_12345&refresh_token=quick_refresh&expires_in=3600&token_type=bearer&type=recovery', '_blank')}
        >
          打开测试重置页面
        </Button>
      </Card>
    </div>
  );
};

export default TestResetLinkPage;