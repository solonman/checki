import React, { useState } from 'react';
import { Button, Upload, message, Card, Typography, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { extractTextFromDocx } from '../utils/documentParser';

const { Title, Paragraph, Text } = Typography;

const DocxTest = () => {
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);

  // 自定义日志函数
  const log = (message) => {
    console.log('DocxTest:', message);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // 处理文件上传
  const handleFileUpload = async (file) => {
    log('开始处理文件:', file.name);
    setLoading(true);
    setFileContent('');
    setError('');
    setFileInfo(null);
    setLogs(['开始测试docx解析功能...']);
    
    try {
      // 记录文件信息
      log(`文件名: ${file.name}`);
      log(`文件大小: ${(file.size / 1024).toFixed(2)} KB`);
      log(`文件类型: ${file.type}`);
      log(`文件对象类型: ${typeof file}`);
      log(`是否为File实例: ${file instanceof File}`);
      
      // 检查文件类型
      if (file.name.toLowerCase().endsWith('.docx')) {
        log('确认是docx文件，开始解析...');
        
        // 直接调用解析函数
        const startTime = Date.now();
        const content = await extractTextFromDocx(file);
        const endTime = Date.now();
        
        log(`解析完成，耗时: ${(endTime - startTime) / 1000} 秒`);
        log(`提取的文本长度: ${content.length} 字符`);
        
        setFileContent(content);
        setFileInfo({
          name: file.name,
          size: file.size,
          type: file.type,
          parseTime: (endTime - startTime) / 1000
        });
        
        message.success('文件解析成功');
      } else {
        const errorMsg = '请上传.docx格式的文件';
        log(errorMsg);
        setError(errorMsg);
        message.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = `解析失败: ${err.message}`;
      log(errorMsg);
      log('错误详情:', err);
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
    
    return false; // 阻止自动上传
  };

  const props = {
    name: 'file',
    beforeUpload: handleFileUpload,
    showUploadList: false,
    accept: '.docx',
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card title="DOCX文件解析测试" style={{ marginBottom: '20px' }}>
        <Title level={4}>测试docx文件直接在前端的解析功能</Title>
        <Paragraph>这个页面专门用于测试docx文件的解析功能，帮助我们诊断预览问题。</Paragraph>
        
        <Upload {...props}>
          <Button icon={<UploadOutlined />} loading={loading}>
            选择并解析docx文件
          </Button>
        </Upload>
        
        {error && (
          <Text type="danger" style={{ display: 'block', marginTop: '10px' }}>
            {error}
          </Text>
        )}
        
        {fileInfo && (
          <Card title="文件信息" size="small" style={{ marginTop: '20px' }}>
            <pre>
              {JSON.stringify(fileInfo, null, 2)}
            </pre>
          </Card>
        )}
        
        {fileContent && (
          <Card title="解析结果" style={{ marginTop: '20px' }}>
            <Paragraph
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                maxHeight: '400px',
                overflow: 'auto'
              }}
            >
              {fileContent}
            </Paragraph>
          </Card>
        )}
        
        <Card title="执行日志" style={{ marginTop: '20px' }}>
          <div
            style={{
              backgroundColor: '#000',
              color: '#0f0',
              padding: '10px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              maxHeight: '300px',
              overflow: 'auto',
              fontSize: '12px'
            }}
          >
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </Card>
      </Card>
      
      <Card title="调试信息" size="small">
        <Paragraph>如果解析失败，请查看控制台日志获取更多详细信息。</Paragraph>
        <Paragraph>当前使用的解析方法：</Paragraph>
        <ol>
          <li>使用JSZip库读取docx文件（本质是zip文件）</li>
          <li>提取word/document.xml文件</li>
          <li>使用正则表达式和DOM解析双重方法提取文本</li>
          <li>如果主文档解析失败，尝试其他XML文件</li>
        </ol>
      </Card>
    </div>
  );
};

export default DocxTest;