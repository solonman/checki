import React, { useState } from 'react';
import { Card, Button, Input, Form, message, Alert, Typography, Space, Collapse, Descriptions, Tag } from 'antd';
import { LinkOutlined, MailOutlined, KeyOutlined, CheckCircleOutlined, CloseCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { authAPI } from '../utils/apiClient';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

/**
 * 密码重置链接诊断报告
 * 专门分析和解决"无效的重置链接"错误
 */
const PasswordResetDiagnosticsReport = () => {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [diagnosticResults, setDiagnosticResults] = useState({});
  const [currentPhase, setCurrentPhase] = useState('idle');
  const [receivedToken, setReceivedToken] = useState('');
  const [tokenValidationResult, setTokenValidationResult] = useState(null);

  // 诊断阶段
  const diagnosticPhases = [
    { key: 'config', title: '配置诊断', status: '待开始' },
    { key: 'email', title: '邮件发送测试', status: '待开始' },
    { key: 'token', title: '令牌验证', status: '待开始' },
    { key: 'summary', title: '问题总结', status: '待开始' }
  ];

  // 运行完整诊断流程
  const runCompleteDiagnostics = async () => {
    if (!testEmail) {
      message.error('请输入测试邮箱地址');
      return;
    }

    setCurrentPhase('config');
    
    try {
      // 阶段1: 配置诊断
      await runConfigurationDiagnostics();
      setCurrentPhase('email');
      
      // 阶段2: 邮件发送测试
      await runEmailTest();
      setCurrentPhase('token');
      
      message.info('请检查邮箱获取重置邮件，然后输入收到的访问令牌');
      
    } catch (error) {
      console.error('诊断流程失败:', error);
      message.error('诊断过程中出现错误');
      setCurrentPhase('error');
    }
  };

  // 配置诊断
  const runConfigurationDiagnostics = async () => {
    const config = {
      supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
      hasAnonKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.REACT_APP_SUPABASE_ANON_KEY?.length,
      siteUrl: window.location.origin,
      redirectUrl: `${window.location.origin}/reset-password`,
      currentTime: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    const issues = [];
    if (!config.supabaseUrl) issues.push('缺少SUPABASE_URL配置');
    if (!config.hasAnonKey) issues.push('缺少SUPABASE_ANON_KEY配置');
    if (config.anonKeyLength < 100) issues.push('API密钥长度过短，可能无效');

    const result = {
      success: issues.length === 0,
      config,
      issues,
      recommendations: [
        '检查.env文件中的配置',
        '确认Supabase项目是否激活',
        '验证API密钥是否正确'
      ]
    };

    setDiagnosticResults(prev => ({ ...prev, config: result }));
    return result;
  };

  // 邮件发送测试
  const runEmailTest = async () => {
    try {
      console.log('发送测试邮件给:', testEmail);
      const result = await authAPI.resetPassword(testEmail);
      
      if (!result.success) {
        throw new Error(result.error || '邮件发送失败');
      }

      const emailResult = {
        success: true,
        email: testEmail,
        timestamp: new Date().toISOString(),
        nextStep: '检查邮箱获取包含access_token的重置链接'
      };

      setDiagnosticResults(prev => ({ ...prev, email: emailResult }));
      return emailResult;
      
    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        commonCauses: [
          'Supabase邮件服务未配置',
          '邮箱地址格式错误',
          '邮件被拦截'
        ],
        recommendations: [
          '检查Supabase控制台中的邮件配置',
          '验证邮箱地址格式',
          '检查垃圾邮件文件夹'
        ]
      };
      
      setDiagnosticResults(prev => ({ ...prev, email: errorResult }));
      throw error;
    }
  };

  // 验证用户输入的令牌
  const validateUserToken = async () => {
    if (!receivedToken) {
      message.error('请输入收到的访问令牌');
      return;
    }

    setLoading(true);
    
    try {
      // 验证令牌格式
      const formatValidation = validateTokenFormat(receivedToken);
      
      // 尝试使用令牌（用测试密码）
      const { data, error } = await authAPI.confirmResetPassword(receivedToken, 'TestPassword123!');
      
      let validationResult;
      
      if (error) {
        // 分析具体的错误类型
        const errorType = analyzeTokenError(error.message);
        
        validationResult = {
          success: false,
          token: receivedToken.substring(0, 20) + '...',
          error: error.message,
          errorType,
          format: formatValidation,
          recommendations: getTokenErrorRecommendations(errorType)
        };
      } else {
        validationResult = {
          success: true,
          token: receivedToken.substring(0, 20) + '...',
          format: formatValidation,
          message: '令牌验证成功',
          recommendations: ['令牌有效，可以用于密码重置']
        };
      }
      
      setTokenValidationResult(validationResult);
      setDiagnosticResults(prev => ({ ...prev, token: validationResult }));
      
      if (validationResult.success) {
        message.success('令牌验证成功！');
      } else {
        message.error(`令牌验证失败: ${validationResult.error}`);
      }
      
    } catch (error) {
      console.error('令牌验证失败:', error);
      message.error('令牌验证过程中出现错误');
    } finally {
      setLoading(false);
    }
  };

  // 验证令牌格式
  const validateTokenFormat = (token) => {
    const parts = token.split('.');
    const isJwt = parts.length === 3;
    
    let decodedHeader = null;
    let decodedPayload = null;
    
    if (isJwt) {
      try {
        decodedHeader = JSON.parse(atob(parts[0]));
        decodedPayload = JSON.parse(atob(parts[1]));
      } catch (error) {
        console.error('JWT解析失败:', error);
      }
    }

    return {
      isJwt,
      parts: parts.length,
      length: token.length,
      decodedHeader,
      decodedPayload,
      isValid: isJwt && decodedHeader && decodedPayload
    };
  };

  // 分析令牌错误类型
  const analyzeTokenError = (errorMessage) => {
    if (errorMessage.includes('expired')) return 'expired';
    if (errorMessage.includes('invalid')) return 'invalid';
    if (errorMessage.includes('malformed')) return 'malformed';
    if (errorMessage.includes('used')) return 'already_used';
    return 'unknown';
  };

  // 获取令牌错误的修复建议
  const getTokenErrorRecommendations = (errorType) => {
    const recommendations = {
      expired: [
        '令牌已过期，请重新发送重置邮件',
        '检查邮件发送时间，确保在1小时内使用'
      ],
      invalid: [
        '令牌无效，请确保复制完整的access_token',
        '检查是否包含了多余的空格或字符'
      ],
      malformed: [
        '令牌格式错误，应为JWT格式（三部分）',
        '重新从邮件链接中提取access_token参数'
      ],
      already_used: [
        '令牌已被使用，请重新发送重置邮件',
        '每个令牌只能使用一次'
      ],
      unknown: [
        '未知错误，请重新发送重置邮件',
        '检查Supabase配置和邮件模板'
      ]
    };
    
    return recommendations[errorType] || recommendations.unknown;
  };

  // 生成诊断报告
  const generateReport = () => {
    const config = diagnosticResults.config;
    const email = diagnosticResults.email;
    const token = diagnosticResults.token;
    
    if (!config || !email) return null;

    const overallSuccess = config.success && email.success && (token ? token.success : true);
    
    return {
      overallSuccess,
      timestamp: new Date().toISOString(),
      phases: {
        config: config.success ? '通过' : '失败',
        email: email.success ? '通过' : '失败',
        token: token ? (token.success ? '通过' : '失败') : '未测试'
      },
      mainIssues: [
        ...(!config.success ? ['配置问题'] : []),
        ...(!email.success ? ['邮件发送问题'] : []),
        ...(token && !token.success ? ['令牌验证问题'] : [])
      ],
      recommendations: generateOverallRecommendations(config, email, token)
    };
  };

  // 生成总体建议
  const generateOverallRecommendations = (config, email, token) => {
    const recommendations = [];
    
    if (!config.success) {
      recommendations.push(
        '🔧 修复配置问题：',
        '  - 检查.env文件中的Supabase配置',
        '  - 确认API密钥有效',
        '  - 验证Supabase项目状态'
      );
    }
    
    if (!email.success) {
      recommendations.push(
        '📧 修复邮件问题：',
        '  - 配置Supabase邮件服务',
        '  - 检查邮件模板设置',
        '  - 验证邮箱地址格式'
      );
    }
    
    if (token && !token.success) {
      recommendations.push(
        '🔑 修复令牌问题：',
        '  - 确保正确提取access_token',
        '  - 检查令牌是否过期',
        '  - 验证重定向URL配置'
      );
    }
    
    if (config.success && email.success && (!token || token.success)) {
      recommendations.push(
        '✅ 所有测试通过！',
        '  - 密码重置功能正常工作',
        '  - 如仍有问题，请检查具体使用场景'
      );
    }
    
    return recommendations;
  };

  const report = generateReport();

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card title="🔍 密码重置链接完整诊断报告" style={{ marginBottom: '20px' }}>
      <Alert
            message="专门解决'无效的重置链接'错误问题"
            description="此工具将帮助您诊断和修复密码重置流程中的所有问题"
            type="warning"
            showIcon
            style={{ marginBottom: '20px' }}
          />

        {/* 诊断阶段状态 */}
        <Card title="诊断进度" size="small" style={{ marginBottom: '20px' }}>
          <Space>
            {diagnosticPhases.map((phase, index) => (
              <Tag 
                key={phase.key}
                color={
                  currentPhase === phase.key ? 'processing' :
                  diagnosticResults[phase.key] ? 'success' :
                  index === 0 && currentPhase === 'idle' ? 'default' :
                  'default'
                }
                icon={
                  diagnosticResults[phase.key]?.success ? <CheckCircleOutlined /> :
                  diagnosticResults[phase.key] ? <CloseCircleOutlined /> : null
                }
              >
                {phase.title}
              </Tag>
            ))}
          </Space>
        </Card>

        {/* 测试邮箱输入 */}
        <Card title="开始诊断" style={{ marginBottom: '20px' }}>
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
                onClick={runCompleteDiagnostics} 
                loading={loading && currentPhase !== 'token'}
                disabled={!testEmail}
              >
                开始完整诊断
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 令牌验证部分 */}
        {currentPhase === 'token' && (
          <Card title="步骤3: 令牌验证" style={{ marginBottom: '20px' }}>
            <Alert
              message="请检查邮箱获取重置邮件"
              description={
                <>
                  <Paragraph>1. 检查收件箱（包括垃圾邮件文件夹）</Paragraph>
                  <Paragraph>2. 找到Supabase发送的重置密码邮件</Paragraph>
                  <Paragraph>3. 点击邮件中的链接或复制链接中的access_token参数</Paragraph>
                  <Paragraph>4. 将access_token值粘贴到下方输入框中</Paragraph>
                </>
              }
              type="info"
              style={{ marginBottom: '15px' }}
            />
            
            <Form layout="inline">
              <Form.Item label="访问令牌 (access_token)">
                <Input
                  value={receivedToken}
                  onChange={(e) => setReceivedToken(e.target.value)}
                  placeholder="从邮件链接中复制的access_token值"
                  style={{ width: '400px' }}
                />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary" 
                  onClick={validateUserToken}
                  loading={loading}
                  disabled={!receivedToken}
                >
                  验证令牌
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}

        {/* 诊断结果 */}
        {Object.keys(diagnosticResults).length > 0 && (
          <Card title="📊 诊断结果" style={{ marginBottom: '20px' }}>
            <Collapse defaultActiveKey={['config']}>
              {Object.entries(diagnosticResults).map(([key, result]) => (
                <Panel 
                  key={key}
                  header={
                    <Space>
                      <Text strong>
                        {key === 'config' ? '配置诊断' :
                         key === 'email' ? '邮件测试' :
                         key === 'token' ? '令牌验证' : '未知测试'}
                      </Text>
                      <Tag color={result.success ? 'success' : 'error'}>
                        {result.success ? '✅ 通过' : '❌ 失败'}
                      </Tag>
                    </Space>
                  }
                >
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="状态">
                      <Text type={result.success ? 'success' : 'danger'}>
                        {result.success ? '测试通过' : '测试失败'}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="消息">
                      {result.message || result.error}
                    </Descriptions.Item>
                  </Descriptions>
                  
                  {result.data && (
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
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {result.recommendations && result.recommendations.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <Text strong>建议:</Text>
                      <ul>
                        {result.recommendations.map((rec, idx) => (
                          <li key={idx}><Text>{rec}</Text></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Panel>
              ))}
            </Collapse>
          </Card>
        )}

        {/* 总体报告 */}
        {report && (
          <Card 
            title="📋 诊断报告" 
            style={{ 
              marginBottom: '20px',
              borderColor: report.overallSuccess ? '#52c41a' : '#ff4d4f',
              backgroundColor: report.overallSuccess ? '#f6ffed' : '#fff2f0'
            }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="总体状态">
                <Tag color={report.overallSuccess ? 'success' : 'error'}>
                  {report.overallSuccess ? '✅ 通过' : '❌ 失败'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="测试时间">
                {report.timestamp}
              </Descriptions.Item>
              <Descriptions.Item label="测试阶段">
                <Space>
                  {Object.entries(report.phases).map(([key, status]) => (
                    <Tag key={key} color={status === '通过' ? 'success' : status === '失败' ? 'error' : 'default'}>
                      {key}: {status}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            </Descriptions>
            
            {report.mainIssues.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <Text strong>主要问题:</Text>
                <ul>
                  {report.mainIssues.map((issue, idx) => (
                    <li key={idx}><Text type="danger">{issue}</Text></li>
                  ))}
                </ul>
              </div>
            )}
            
            <div style={{ marginTop: '15px' }}>
              <Text strong>修复建议:</Text>
              <pre style={{ 
                background: '#fafafa', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '14px',
                whiteSpace: 'pre-wrap'
              }}>
                {report.recommendations.join('\n')}
              </pre>
            </div>
          </Card>
        )}

        {/* 快速修复指南 */}
        <Card title="🔧 快速修复指南">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" title="1. Supabase控制台检查" type="inner">
              <Button 
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => window.open('https://app.supabase.com', '_blank')}
                style={{ marginBottom: '10px' }}
              >
                打开 Supabase 控制台
              </Button>
              <ul>
                <li>确认项目处于激活状态</li>
                <li>检查 Authentication > Settings 配置</li>
                <li>验证邮件服务是否启用</li>
                <li>确认 Redirect URLs 包含应用地址</li>
              </ul>
            </Card>

            <Card size="small" title="2. 邮件模板检查" type="inner">
              <ul>
                <li>进入 Authentication > Email Templates</li>
                <li>检查 "Reset Password" 模板</li>
                <li>确认包含正确的 &#123;&#123; .ConfirmationURL &#125;&#125;</li>
                <li>验证 redirect_to 参数是否正确</li>
              </ul>
            </Card>

            <Card size="small" title="3. 应用配置检查" type="inner">
              <ul>
                <li>检查 .env 文件中的配置</li>
                <li>确认 REACT_APP_SUPABASE_URL 格式正确</li>
                <li>验证 REACT_APP_SUPABASE_ANON_KEY 有效</li>
                <li>重启应用确保配置生效</li>
              </ul>
            </Card>
          </Space>
        </Card>
      </Card>
    </div>
  );
};

export default PasswordResetDiagnosticsReport;