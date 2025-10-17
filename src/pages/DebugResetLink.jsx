import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Descriptions } from 'antd';

const DebugResetLink = () => {
  const [urlInfo, setUrlInfo] = useState({});

  useEffect(() => {
    const analyzeUrl = () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const searchParams = url.searchParams;
      
      const info = {
        fullUrl: url.href,
        hash: url.hash,
        search: url.search,
        hashParams: Object.fromEntries(hashParams),
        searchParams: Object.fromEntries(searchParams),
        hasAccessToken: !!hashParams.get('access_token') || !!searchParams.get('access_token'),
        hasType: !!hashParams.get('type') || !!searchParams.get('type'),
        accessTokenFromHash: hashParams.get('access_token'),
        accessTokenFromSearch: searchParams.get('access_token'),
        typeFromHash: hashParams.get('type'),
        typeFromSearch: searchParams.get('type')
      };
      
      setUrlInfo(info);
    };

    analyzeUrl();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <Card title="密码重置链接调试工具">
        <Alert 
          message="此页面用于调试密码重置链接参数" 
          description="请检查以下信息，确认URL参数是否正确解析"
          type="info" 
          style={{ marginBottom: 20 }}
        />
        
        <Descriptions title="URL分析结果" bordered column={1}>
          <Descriptions.Item label="完整URL">
            {urlInfo.fullUrl}
          </Descriptions.Item>
          <Descriptions.Item label="Hash部分">
            {urlInfo.hash || '空'}
          </Descriptions.Item>
          <Descriptions.Item label="Search部分">
            {urlInfo.search || '空'}
          </Descriptions.Item>
          <Descriptions.Item label="Hash参数">
            <pre>{JSON.stringify(urlInfo.hashParams, null, 2)}</pre>
          </Descriptions.Item>
          <Descriptions.Item label="Search参数">
            <pre>{JSON.stringify(urlInfo.searchParams, null, 2)}</pre>
          </Descriptions.Item>
          <Descriptions.Item label="是否找到access_token">
            {urlInfo.hasAccessToken ? '✅ 找到' : '❌ 未找到'}
          </Descriptions.Item>
          <Descriptions.Item label="是否找到type参数">
            {urlInfo.hasType ? '✅ 找到' : '❌ 未找到'}
          </Descriptions.Item>
          <Descriptions.Item label="Hash中的access_token">
            {urlInfo.accessTokenFromHash || '未找到'}
          </Descriptions.Item>
          <Descriptions.Item label="Search中的access_token">
            {urlInfo.accessTokenFromSearch || '未找到'}
          </Descriptions.Item>
          <Descriptions.Item label="Hash中的type">
            {urlInfo.typeFromHash || '未找到'}
          </Descriptions.Item>
          <Descriptions.Item label="Search中的type">
            {urlInfo.typeFromSearch || '未找到'}
          </Descriptions.Item>
        </Descriptions>
        
        <div style={{ marginTop: 20 }}>
          <Button 
            type="primary" 
            onClick={() => window.location.href = '/reset-password'}
          >
            返回重置密码页面
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DebugResetLink;