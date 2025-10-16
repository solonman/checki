import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Form, message, Alert, Tabs, Descriptions, Tag } from 'antd';
import { authAPI } from '../utils/apiClient';
import supabase from '../utils/supabaseClient';

// 使用新的items API替代TabPane

const SupabaseAuthDiagnostics = () => {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [diagnostics, setDiagnostics] = useState({
    supabaseConfig: null,
    authSettings: null,
    emailTemplates: null,
    urlParsing: null,
    tokenValidation: null
  });

  // 诊断Supabase配置
  const diagnoseSupabaseConfig = async () => {
    const config = {
      url: process.env.REACT_APP_SUPABASE_URL,
      hasAnonKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.REACT_APP_SUPABASE_ANON_KEY?.length,
      origin: window.location.origin,
      currentUrl: window.location.href
    };

    // 检查客户端配置
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      config.clientTest = {
        success: !error,
        user: user ? '已登录' : '未登录',
        error: error?.message
      };
    } catch (err) {
      config.clientTest = {
        success: false,
        error: err.message
      };
    }

    return config;
  };

  // 诊断认证设置
  const diagnoseAuthSettings = async () => {
    try {
      // 获取当前会话
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // 获取认证配置（通过健康检查）
      const healthCheck = await authAPI.healthCheck();
      
      return {
        hasSession: !!session,
        sessionError: sessionError?.message,
        healthCheck: healthCheck,
        currentUser: session?.user?.email || '无'
      };
    } catch (err) {
      return {
        error: err.message,
        details: '无法获取认证设置'
      };
    }
  };

  // 诊断邮件模板
  const diagnoseEmailTemplates = () => {
    return {
      redirectUrl: `${window.location.origin}/reset-password`,
      expectedFormat: 'https://your-project.supabase.co/auth/v1/verify?token=TOKEN&type=recovery&redirect_to=YOUR_URL',
      notes: [
        '需要在Supabase控制台中配置邮件模板',
        '确保Site URL设置为http://localhost:3000',
        '确保Redirect URLs包含http://localhost:3000/reset-password'
      ]
    };
  };

  // 诊断URL解析
  const diagnoseUrlParsing = () => {
    const testUrls = [
      'http://localhost:3000/reset-password#access_token=test_token_123&refresh_token=test_refresh&expires_in=3600&token_type=bearer&type=recovery',
      'http://localhost:3000/reset-password?token=test_token_123&type=recovery',
      window.location.href
    ];

    const results = testUrls.map(url => {
      const urlObj = new URL(url);
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      const searchParams = urlObj.searchParams;

      return {
        url,
        hash: urlObj.hash,
        accessTokenFromHash: hashParams.get('access_token'),
        accessTokenFromSearch: searchParams.get('access_token'),
        tokenFromHash: hashParams.get('token'),
        tokenFromSearch: searchParams.get('token'),
        type: hashParams.get('type') || searchParams.get('type'),
        hasRecoveryType: (hashParams.get('type') || searchParams.get('type')) === 'recovery'
      };
    });

    return results;
  };

  // 诊断令牌验证
  const diagnoseTokenValidation = async (testToken) => {
    if (!testToken || testToken === 'test_token_123') {
      return {
        skipped: true,
        message: '使用测试令牌，跳过实际验证'
      };
    }

    try {
      // 尝试设置会话
      const { data, error } = await supabase.auth.setSession({
        access_token: testToken,
        refresh_token: testToken
      });

      return {
        success: !error,
        data: data ? '会话设置成功' : '无数据',
        error: error?.message,
        errorCode: error?.code
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  };

  // 运行完整诊断
  const runFullDiagnostics = async () => {
    setLoading(true);
    
    try {
      message.info('正在运行完整诊断...');
      
      const results = {};
      
      // 1. 诊断Supabase配置
      results.supabaseConfig = await diagnoseSupabaseConfig();
      
      // 2. 诊断认证设置
      results.authSettings = await diagnoseAuthSettings();
      
      // 3. 诊断邮件模板
      results.emailTemplates = diagnoseEmailTemplates();
      
      // 4. 诊断URL解析
      results.urlParsing = diagnoseUrlParsing();
      
      // 5. 诊断令牌验证（使用测试令牌）
      results.tokenValidation = await diagnoseTokenValidation('test_token_123');
      
      setDiagnostics(results);
      message.success('诊断完成！');
      
    } catch (err) {
      console.error('诊断失败:', err);
      message.error('诊断失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 发送测试邮件
  const sendTestEmail = async () => {
    if (!testEmail) {
      message.error('请输入测试邮箱地址');
      return;
    }

    setLoading(true);
    
    try {
      console.log('发送测试邮件给:', testEmail);
      const result = await authAPI.resetPassword(testEmail);
      
      if (result.success) {
        message.success('测试邮件发送成功！请检查邮箱');
      } else {
        message.error('邮件发送失败: ' + result.error);
      }
      
      console.log('邮件发送结果:', result);
    } catch (err) {
      console.error('邮件发送异常:', err);
      message.error('邮件发送异常: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 手动测试令牌验证
  const testTokenManually = async (token) => {
    if (!token) {
      message.error('请输入测试令牌');
      return;
    }

    setLoading(true);
    
    try {
      const result = await diagnoseTokenValidation(token);
      
      const newDiagnostics = { ...diagnostics };
      newDiagnostics.tokenValidation = result;
      setDiagnostics(newDiagnostics);
      
      if (result.success) {
        message.success('令牌验证成功！');
      } else {
        message.error('令牌验证失败: ' + (result.error || '未知错误'));
      }
      
    } catch (err) {
      message.error('测试失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runFullDiagnostics();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card title="🔧 Supabase认证诊断工具" style={{ marginBottom: '20px' }}>
        <Alert
          message="此工具帮助诊断Supabase密码重置功能的问题"
          description="请按照诊断结果检查配置，确保所有设置正确"
          type="info"
          style={{ marginBottom: '20px' }}
        />
        
        <Tabs 
          defaultActiveKey="config"
          items={[
            {
              key: 'config',
              label: 'Supabase配置',
              children: (
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Supabase URL">
                    {diagnostics.supabaseConfig?.url ? 
                      <Tag color="green">已配置</Tag> : 
                      <Tag color="red">未配置</Tag>
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label="匿名密钥">
                    {diagnostics.supabaseConfig?.hasAnonKey ? 
                      <Tag color="green">已配置 ({diagnostics.supabaseConfig.anonKeyLength}字符)</Tag> : 
                      <Tag color="red">未配置</Tag>
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label="客户端测试">
                    {diagnostics.supabaseConfig?.clientTest?.success ? 
                      <Tag color="green">成功 - {diagnostics.supabaseConfig.clientTest.user}</Tag> : 
                      <Tag color="orange">失败 - {diagnostics.supabaseConfig?.clientTest?.error}</Tag>
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label="当前来源">
                    {diagnostics.supabaseConfig?.origin}</Descriptions.Item>
                </Descriptions>
              )
            },
            {
              key: 'auth',
              label: '认证设置',
              children: (
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="会话状态">
                    {diagnostics.authSettings?.hasSession ? 
                      <Tag color="green">活跃 - {diagnostics.authSettings.currentUser}</Tag> : 
                      <Tag color="orange">无会话</Tag>
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label="健康检查">
                    {diagnostics.authSettings?.healthCheck?.success ? 
                      <Tag color="green">正常</Tag> : 
                      <Tag color="red">异常</Tag>
                    }
                  </Descriptions.Item>
                  {diagnostics.authSettings?.healthCheck?.message && (
                    <Descriptions.Item label="检查详情">
                      {diagnostics.authSettings.healthCheck.message}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              )
            },
            {
              key: 'email',
              label: '邮件模板配置',
              children: (
                <>
                  <Card title="配置要求" size="small">
                    <ul>
                      {diagnostics.emailTemplates?.notes.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  </Card>
                  <Descriptions bordered column={1} style={{ marginTop: '10px' }}>
                    <Descriptions.Item label="重定向URL">
                      <code>{diagnostics.emailTemplates?.redirectUrl}</code>
                    </Descriptions.Item>
                    <Descriptions.Item label="期望格式">
                      <code>{diagnostics.emailTemplates?.expectedFormat}</code>
                    </Descriptions.Item>
                  </Descriptions>
                </>
              )
            },
            {
              key: 'url',
              label: 'URL解析测试',
              children: (
                <Card title="URL解析结果" size="small">
                  {diagnostics.urlParsing?.map((result, index) => (
                    <div key={index} style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5' }}>
                      <strong>测试URL {index + 1}:</strong>
                      <div style={{ wordBreak: 'break-all', marginBottom: '5px' }}>
                        <code>{result.url}</code>
                      </div>
                      <Descriptions size="small" column={2}>
                        <Descriptions.Item label="Hash中的access_token">
                          {result.accessTokenFromHash || <Tag color="red">无</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="查询中的access_token">
                          {result.accessTokenFromSearch || <Tag color="red">无</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Hash中的token">
                          {result.tokenFromHash || <Tag color="red">无</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="类型">
                          {result.type || <Tag color="red">无</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="恢复类型">
                          {result.hasRecoveryType ? <Tag color="green">✓ 是</Tag> : <Tag color="red">✗ 否</Tag>}
                        </Descriptions.Item>
                      </Descriptions>
                    </div>
                  ))}
                </Card>
              )
            },
            {
              key: 'token',
              label: '令牌验证',
              children: (
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="验证状态">
                    {diagnostics.tokenValidation?.skipped ? 
                      <Tag color="orange">跳过测试</Tag> :
                      diagnostics.tokenValidation?.success ? 
                      <Tag color="green">成功</Tag> :
                      <Tag color="red">失败</Tag>
                    }
                  </Descriptions.Item>
                  {diagnostics.tokenValidation?.error && (
                    <Descriptions.Item label="错误信息">
                      {diagnostics.tokenValidation.error}
                    </Descriptions.Item>
                  )}
                  {diagnostics.tokenValidation?.errorCode && (
                    <Descriptions.Item label="错误代码">
                      {diagnostics.tokenValidation.errorCode}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              )
            }
          ]}
        />
        
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Button type="primary" onClick={runFullDiagnostics} loading={loading}>
            重新运行诊断
          </Button>
        </div>
      </Card>

      <Card title="📧 邮件发送测试" style={{ marginBottom: '20px' }}>
        <Form layout="inline">
          <Form.Item label="测试邮箱">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="请输入测试邮箱地址"
              style={{ width: '300px' }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={sendTestEmail} loading={loading}>
              发送测试邮件
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="🔑 令牌验证测试">
        <Form layout="inline">
          <Form.Item label="测试令牌">
            <Input
              placeholder="输入从URL获取的access_token"
              style={{ width: '400px' }}
              onPressEnter={(e) => testTokenManually(e.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={(e) => {
              const input = e.target.parentElement.parentElement.querySelector('input');
              testTokenManually(input.value);
            }} loading={loading}>
              验证令牌
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ marginTop: '10px' }}>
          <p><strong>快速测试:</strong></p>
          <Button 
            size="small" 
            onClick={() => testTokenManually('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_payload.test_signature')}
          >
            测试JWT格式令牌
          </Button>
          <Button 
            size="small" 
            style={{ marginLeft: '10px' }}
            onClick={() => testTokenManually('test_real_token_from_email')}
          >
            测试真实令牌格式
          </Button>
        </div>
      </Card>

      <Card title="📋 问题排查清单" style={{ marginTop: '20px' }}>
        <h4>密码重置流程检查清单:</h4>
        <ol>
          <li>
            <strong>Supabase控制台配置:</strong>
            <ul>
              <li>☐ Authentication → Email Templates → Recovery 模板已配置</li>
              <li>☐ Authentication → URL Configuration → Site URL 设置为 http://localhost:3000</li>
              <li>☐ Authentication → URL Configuration → Redirect URLs 包含 http://localhost:3000/reset-password</li>
            </ul>
          </li>
          <li>
            <strong>应用配置:</strong>
            <ul>
              <li>☐ .env 文件中 SUPABASE_URL 和 SUPABASE_ANON_KEY 已正确设置</li>
              <li>☐ 重置密码页面路由 /reset-password 正常工作</li>
            </ul>
          </li>
          <li>
            <strong>测试步骤:</strong>
            <ul>
              <li>☐ 在忘记密码页面输入邮箱并发送重置邮件</li>
              <li>☐ 检查邮箱收到重置邮件（可能在垃圾邮件文件夹）</li>
              <li>☐ 点击邮件中的重置链接</li>
              <li>☐ 确认链接跳转到 /reset-password 并带有正确的hash参数</li>
              <li>☐ 在新密码页面输入新密码并提交</li>
            </ul>
          </li>
        </ol>
      </Card>
    </div>
  );
};

export default SupabaseAuthDiagnostics;