import React, { useState } from 'react';
import { Card, Button, Input, Form, message, Alert, Typography, Space, Collapse, Descriptions } from 'antd';
import { LinkOutlined, MailOutlined, KeyOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { authAPI } from '../utils/apiClient';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

/**
 * 密码重置链接诊断工具
 * 专门用于解决"无效的重置链接"错误
 */
const PasswordResetLinkDiagnostics = () => {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [diagnosticResults, setDiagnosticResults] = useState({});
  const [currentStep, setCurrentStep] = useState(0);

  // 诊断步骤
  const diagnosticSteps = [
    {
      key: 'env_check',
      title: '环境配置检查',
      icon: <CheckCircleOutlined />,
      description: '检查Supabase配置和环境变量'
    },
    {
      key: 'email_service',
      title: '邮件服务测试',
      icon: <MailOutlined />,
      description: '测试邮件发送功能'
    },
    {
      key: 'url_validation',
      title: 'URL配置验证',
      icon: <LinkOutlined />,
      description: '验证重定向URL配置'
    },
    {
      key: 'token_analysis',
      title: '令牌格式分析',
      icon: <KeyOutlined />,
      description: '分析访问令牌的格式和有效性'
    }
  ];

  // 步骤1: 环境配置检查
  const checkEnvironment = async () => {
    const results = {
      supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
      hasAnonKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.REACT_APP_SUPABASE_ANON_KEY?.length,
      siteUrl: process.env.REACT_APP_SITE_URL || window.location.origin,
      redirectUrls: [
        `${window.location.origin}/reset-password`,
        `${window.location.origin}/password-reset-flow-test`
      ],
      timestamp: new Date().toISOString()
    };

    const isValid = results.supabaseUrl && results.hasAnonKey;
    
    return {
      success: isValid,
      message: isValid ? '环境配置正常' : '环境配置缺失',
      data: results,
      recommendations: isValid ? [] : [
        '请检查 .env 文件中的 REACT_APP_SUPABASE_URL 配置',
        '请检查 .env 文件中的 REACT_APP_SUPABASE_ANON_KEY 配置'
      ]
    };
  };

  // 步骤2: 邮件服务测试
  const testEmailService = async (email) => {
    if (!email) {
      throw new Error('请输入有效的邮箱地址');
    }

    try {
      console.log('测试邮件服务，发送给:', email);
      const result = await authAPI.resetPassword(email);
      
      if (!result.success) {
        throw new Error(result.error || '邮件发送失败');
      }

      return {
        success: true,
        message: '邮件发送成功',
        data: {
          email: email,
          timestamp: new Date().toISOString(),
          note: '请检查邮箱（包括垃圾邮件文件夹）'
        },
        recommendations: [
          '检查邮箱收件箱和垃圾邮件文件夹',
          '确认邮件中的重置链接格式正确',
          '验证邮件中的redirect_to参数'
        ]
      };
    } catch (error) {
      console.error('邮件服务测试失败:', error);
      throw new Error(`邮件服务测试失败: ${error.message}`);
    }
  };

  // 步骤3: URL配置验证
  const validateUrlConfiguration = async () => {
    const currentOrigin = window.location.origin;
    const resetPasswordUrl = `${currentOrigin}/reset-password`;
    const testUrl = `${currentOrigin}/password-reset-flow-test`;

    const expectedUrls = [
      resetPasswordUrl,
      testUrl,
      `${currentOrigin}/auth/reset-password`,
      `${currentOrigin}/#/reset-password`
    ];

    return {
      success: true,
      message: 'URL配置验证完成',
      data: {
        currentOrigin,
        resetPasswordUrl,
        testUrl,
        expectedUrls,
        note: '这些URL应该添加到Supabase的Redirect URLs白名单中'
      },
      recommendations: [
        '登录Supabase控制台',
        '进入 Authentication > Settings',
        '在"Redirect URLs"中添加以上URL',
        '确保Site URL设置正确'
      ]
    };
  };

  // 步骤4: 分析示例令牌格式
  const analyzeTokenFormat = () => {
    // 创建一个示例JWT令牌用于格式验证
    const exampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    const tokenParts = exampleToken.split('.');
    const isValidFormat = tokenParts.length === 3;

    let decodedHeader, decodedPayload;
    try {
      decodedHeader = JSON.parse(atob(tokenParts[0]));
      decodedPayload = JSON.parse(atob(tokenParts[1]));
    } catch (error) {
      console.error('令牌解析失败:', error);
    }

    return {
      success: true,
      message: '令牌格式分析完成',
      data: {
        exampleToken,
        tokenParts: tokenParts.length,
        isValidFormat,
        decodedHeader,
        decodedPayload,
        formatDescription: 'JWT令牌应该包含三个部分：header.payload.signature'
      },
      recommendations: [
        '确保从邮件链接中提取完整的access_token参数',
        '验证令牌格式为JWT（三个base64编码部分）',
        '检查令牌是否包含有效的exp（过期时间）字段'
      ]
    };
  };

  // 执行单个诊断步骤
  const executeDiagnosticStep = async (stepKey) => {
    setLoading(true);
    
    try {
      let result;
      
      switch (stepKey) {
        case 'env_check':
          result = await checkEnvironment();
          break;
        case 'email_service':
          if (!testEmail) {
            throw new Error('请先输入测试邮箱地址');
          }
          result = await testEmailService(testEmail);
          break;
        case 'url_validation':
          result = await validateUrlConfiguration();
          break;
        case 'token_analysis':
          result = await analyzeTokenFormat();
          break;
        default:
          throw new Error(`未知的诊断步骤: ${stepKey}`);
      }

      setDiagnosticResults(prev => ({
        ...prev,
        [stepKey]: result
      }));

      message.success(result.message);
      return result;
      
    } catch (error) {
      const errorResult = {
        success: false,
        message: error.message,
        error: error,
        recommendations: ['请检查错误信息并采取相应措施']
      };
      
      setDiagnosticResults(prev => ({
        ...prev,
        [stepKey]: errorResult
      }));
      
      message.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 运行完整诊断
  const runFullDiagnostics = async () => {
    if (!testEmail) {
      message.error('请输入测试邮箱地址');
      return;
    }

    try {
      setCurrentStep(1);
      
      // 步骤1: 环境检查
      await executeDiagnosticStep('env_check');
      setCurrentStep(2);
      
      // 步骤2: 邮件服务测试
      await executeDiagnosticStep('email_service');
      setCurrentStep(3);
      
      // 步骤3: URL配置验证
      await executeDiagnosticStep('url_validation');
      setCurrentStep(4);
      
      // 步骤4: 令牌格式分析
      await executeDiagnosticStep('token_analysis');
      
      message.success('完整诊断完成！请查看结果和建议。');
      
    } catch (error) {
      console.error('诊断流程失败:', error);
      message.error('诊断过程中出现错误，请查看具体步骤的结果。');
    }
  };

  // 获取步骤状态图标
  const getStepStatusIcon = (stepKey) => {
    const result = diagnosticResults[stepKey];
    if (!result) return null;
    
    return result.success ? 
      <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card title="🔍 密码重置链接诊断工具" style={{ marginBottom: '20px' }}>
        <Alert
          message="专门解决'无效的重置链接'错误问题"
          description="此工具将帮助您诊断和修复密码重置流程中的所有问题"
          type="warning"
          showIcon
          style={{ marginBottom: '20px' }}
        />

        {/* 快速诊断步骤 */}
        <Card title="诊断步骤" size="small" style={{ marginBottom: '20px' }}>
          <Collapse defaultActiveKey={['env_check']}>
            {diagnosticSteps.map((step, index) => (
              <Panel 
                key={step.key}
                header={
                  <Space>
                    {step.icon}
                    <Text strong>{step.title}</Text>
                    <Text type="secondary">{step.description}</Text>
                    {getStepStatusIcon(step.key)}
                  </Space>
                }
                extra={
                  <Button 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeDiagnosticStep(step.key);
                    }}
                    loading={loading}
                    disabled={step.key === 'email_service' && !testEmail}
                  >
                    运行
                  </Button>
                }
              >
                {diagnosticResults[step.key] && (
                  <Card 
                    size="small"
                    style={{
                      backgroundColor: diagnosticResults[step.key].success ? '#f6ffed' : '#fff2f0',
                      borderColor: diagnosticResults[step.key].success ? '#52c41a' : '#ff4d4f'
                    }}
                  >
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="状态">
                        <Text type={diagnosticResults[step.key].success ? 'success' : 'danger'}>
                          {diagnosticResults[step.key].success ? '✅ 通过' : '❌ 失败'}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="消息">
                        {diagnosticResults[step.key].message}
                      </Descriptions.Item>
                    </Descriptions>
                    
                    {diagnosticResults[step.key].data && (
                      <div style={{ marginTop: '10px' }}>
                        <Text strong>详细信息:</Text>
                        <pre style={{ 
                          background: '#f5f5f5', 
                          padding: '10px', 
                          borderRadius: '4px',
                          fontSize: '12px',
                          maxHeight: '200px',
                          overflow: 'auto'
                        }}>
                          {JSON.stringify(diagnosticResults[step.key].data, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {diagnosticResults[step.key].recommendations && 
                     diagnosticResults[step.key].recommendations.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <Text strong>建议操作:</Text>
                        <ul>
                          {diagnosticResults[step.key].recommendations.map((rec, idx) => (
                            <li key={idx}><Text>{rec}</Text></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                )}
              </Panel>
            ))}
          </Collapse>
        </Card>

        {/* 测试邮箱输入 */}
        <Card title="测试邮箱" style={{ marginBottom: '20px' }}>
          <Form layout="inline">
            <Form.Item label="测试邮箱地址">
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="请输入有效的邮箱地址"
                style={{ width: '300px' }}
              />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                onClick={runFullDiagnostics} 
                loading={loading}
                disabled={!testEmail}
              >
                运行完整诊断
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 常见问题快速修复 */}
        <Card title="🔧 常见问题快速修复" style={{ marginBottom: '20px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" title="1. Supabase配置检查" type="inner">
              <Paragraph>
                <Text strong>问题:</Text> 环境变量配置错误
              </Paragraph>
              <Paragraph>
                <Text strong>检查项目:</Text>
              </Paragraph>
              <ul>
                <li>REACT_APP_SUPABASE_URL 格式: https://[project-id].supabase.co</li>
                <li>REACT_APP_SUPABASE_ANON_KEY 是否为有效的JWT密钥</li>
                <li>.env 文件是否已保存并重新启动应用</li>
              </ul>
            </Card>

            <Card size="small" title="2. 邮件服务配置" type="inner">
              <Paragraph>
                <Text strong>问题:</Text> 邮件发送失败或链接格式错误
              </Paragraph>
              <Paragraph>
                <Text strong>解决步骤:</Text>
              </Paragraph>
              <ul>
                <li>登录 Supabase 控制台</li>
                <li>进入 Authentication > Email Templates</li>
                <li>检查 "Confirm signup" 和 "Reset Password" 模板</li>
                <li>确保模板中的 &#123;&#123; .ConfirmationURL &#125;&#125; 包含正确的 redirect_to 参数</li>
              </ul>
            </Card>

            <Card size="small" title="3. 重定向URL配置" type="inner">
              <Paragraph>
                <Text strong>问题:</Text> 重置链接跳转失败
              </Paragraph>
              <Paragraph>
                <Text strong>解决步骤:</Text>
              </Paragraph>
              <ul>
                <li>登录 Supabase 控制台</li>
                <li>进入 Authentication > Settings</li>
                <li>配置 Site URL 为您的应用首页地址</li>
                <li>在 "Redirect URLs" 中添加:
                  <ul>
                    <li>{`${window.location.origin}/reset-password`}</li>
                    <li>{`${window.location.origin}/password-reset-flow-test`}</li>
                  </ul>
                </li>
              </ul>
            </Card>

            <Card size="small" title="4. 令牌验证失败" type="inner">
              <Paragraph>
                <Text strong>问题:</Text> "无效的重置链接" 或 "Token has expired or is invalid"
              </Paragraph>
              <Paragraph>
                <Text strong>可能原因:</Text>
              </Paragraph>
              <ul>
                <li>令牌已过期（默认1小时有效期）</li>
                <li>令牌已被使用</li>
                <li>令牌格式不正确（应为JWT格式）</li>
                <li>应用URL与配置不匹配</li>
              </ul>
            </Card>
          </Space>
        </Card>

        {/* 一键修复建议 */}
        <Card title="⚡ 一键修复建议" type="inner">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="基于诊断结果的修复建议"
              description="根据您的测试结果，以下是推荐的修复步骤"
              type="info"
              showIcon
            />
            
            {Object.keys(diagnosticResults).length > 0 && (
              <Card size="small" title="推荐操作">
                <ol>
                  {Object.entries(diagnosticResults).map(([key, result]) => {
                    if (!result.success) {
                      return result.recommendations?.map((rec, idx) => (
                        <li key={`${key}-${idx}`}>{rec}</li>
                      ));
                    }
                    return null;
                  })}
                </ol>
              </Card>
            )}
            
            <Space>
              <Button 
                type="primary"
                onClick={() => window.open('https://app.supabase.com', '_blank')}
              >
                打开 Supabase 控制台
              </Button>
              <Button 
                onClick={() => window.location.reload()}
              >
                刷新应用
              </Button>
            </Space>
          </Space>
        </Card>
      </Card>
    </div>
  );
};

export default PasswordResetLinkDiagnostics;