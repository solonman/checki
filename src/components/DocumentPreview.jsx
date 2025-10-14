import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Spin, message } from 'antd';
import { EyeOutlined, DownloadOutlined, FullscreenOutlined, FileTextOutlined, PictureOutlined } from '@ant-design/icons';
import { saveTextAsFile, extractTextFromDocx, extractTextFromImage, extractTextFromFile } from '../utils/documentParser';

const { TabPane } = Tabs;

/**
 * 文档预览组件
 * 支持文本、图片等多种文件格式的预览
 */
const DocumentPreview = ({ 
  visible, 
  onClose, 
  fileData, 
  fileName, 
  fileType 
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [previewContent, setPreviewContent] = useState(null);
  const [contentType, setContentType] = useState('text');

  useEffect(() => {
    // 标志位，用于检测组件是否已卸载
    let isMounted = true;
    
    const fetchData = async () => {
      if (visible && fileData && isMounted) {
        await loadPreviewContent();
      }
    };
    
    fetchData();
    
    // 清理函数，在组件卸载或依赖项变化时执行
    return () => {
      isMounted = false;
    };
  }, [visible, fileData]);

  // 确定文件类型
  const determineFileType = () => {
    // 优先使用传入的fileType
    if (fileType) {
      console.log('DocumentPreview - 使用传入的fileType:', fileType);
      return fileType;
    }
    
    // 其次根据文件名推断
    if (fileName) {
      const lowerFileName = fileName.toLowerCase();
      if (lowerFileName.endsWith('.docx')) {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
      if (lowerFileName.endsWith('.pdf')) {
        return 'application/pdf';
      }
      if (lowerFileName.endsWith('.txt')) {
        return 'text/plain';
      }
      if (['.jpg', '.jpeg', '.png', '.gif'].some(ext => lowerFileName.endsWith(ext))) {
        return 'image';
      }
    }
    
    // 最后检查fileData的type属性
    if (fileData && fileData.type) {
      return fileData.type;
    }
    
    return 'unknown';
  };

  // 加载预览内容
  const loadPreviewContent = async () => {
    try {
      setLoading(true);
      
      console.log('DocumentPreview - 开始加载预览内容');
      console.log('DocumentPreview - fileData类型:', typeof fileData);
      console.log('DocumentPreview - fileData是否为File/Blob:', fileData instanceof File || fileData instanceof Blob);
      console.log('DocumentPreview - fileName:', fileName);
      console.log('DocumentPreview - 原始fileType:', fileType);
      
      // 解码URL编码的文件名
      const decodedFileName = fileName ? decodeURIComponent(fileName) : '';
      console.log('DocumentPreview - 解码后文件名:', decodedFileName);
      
      // 确定文件类型
      const actualFileType = determineFileType();
      console.log('DocumentPreview - 确定的文件类型:', actualFileType);
      
      if (!fileData) {
        setContentType('text');
        setPreviewContent('无法预览文件内容：没有提供有效的文件数据');
        return;
      }
      
      // 确保fileData是一个可用的File或Blob对象
      let file;
      if (fileData instanceof File || fileData instanceof Blob) {
        file = fileData;
      } else if (fileData.buffer || fileData instanceof ArrayBuffer || fileData.constructor?.name === 'Buffer') {
        // 处理Buffer、ArrayBuffer或类似对象
        const buffer = fileData.buffer || fileData;
        const blob = new Blob([buffer]);
        file = new File([blob], decodedFileName || 'document.docx', { 
          type: actualFileType 
        });
      } else if (typeof fileData === 'string') {
        // 如果是base64字符串或其他字符串形式，尝试转换
        const blob = new Blob([fileData]);
        file = new File([blob], decodedFileName || 'document.docx', { 
          type: actualFileType 
        });
      } else {
        // 最后尝试创建一个通用File对象
        console.warn('DocumentPreview - 尝试将非标准fileData转换为File对象');
        file = new File([JSON.stringify(fileData)], decodedFileName || 'document.txt', { 
          type: 'text/plain' 
        });
      }
      
      console.log('DocumentPreview - 处理后的file对象:', file);
      
      // 优先处理docx文件
      const isDocxFile = 
        actualFileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        (decodedFileName && decodedFileName.toLowerCase().endsWith('.docx'));
      
      console.log('DocumentPreview - 是否为docx文件:', isDocxFile);
      
      if (isDocxFile) {
        // 强制设置为文本内容类型
        setContentType('text');
        console.log('DocumentPreview - 开始解析docx文件');
        
        // 使用多阶段解析策略
        try {
          // 第一阶段：尝试主要解析方法
          console.log('DocumentPreview - 使用主要docx解析方法');
          const textContent = await extractTextFromDocx(file);
          console.log('DocumentPreview - 主要解析方法结果长度:', textContent?.length || 0);
          
          if (textContent && textContent.trim() !== '') {
            setPreviewContent(textContent);
            return;
          }
          
          // 第二阶段：尝试使用FileReader读取文件内容
          console.log('DocumentPreview - 主要方法失败，尝试使用FileReader读取文件');
          const reader = new FileReader();
          const textResult = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
          });
          
          if (textResult && textResult.trim() !== '') {
            setPreviewContent('以下是文件的原始文本内容（可能包含编码问题）:\n\n' + textResult);
          } else {
            // 第三阶段：尝试以ArrayBuffer方式读取并使用TextDecoder解码
            console.log('DocumentPreview - 文本读取失败，尝试以ArrayBuffer方式读取并解码');
            const arrayBufferResult = await new Promise((resolve, reject) => {
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = reject;
              reader.readAsArrayBuffer(file);
            });
            
            // 使用TextDecoder解码，使用fallback选项以处理非UTF-8字符
            const decoder = new TextDecoder('utf-8', { fatal: false });
            const decodedText = decoder.decode(arrayBufferResult);
            
            // 过滤出实际可读的文本
            const readableText = decodedText.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
            
            if (readableText && readableText.length > 10) {
              setPreviewContent(`从文档中提取的文本内容（解码后）：\n\n${readableText.substring(0, 5000)}${readableText.length > 5000 ? '...（内容过长，已截断）' : ''}`);
            } else {
              setPreviewContent(`经过多种解析方法尝试后，仍然无法提取文档内容。\n\n文件名：${fileName || '未知'}\n文件大小：${file.size ? (file.size / 1024).toFixed(2) + ' KB' : '未知'}\n\n可能的原因：\n1. 文档格式特殊或使用了非常规的docx结构\n2. 文档可能受到保护或加密\n3. 文档主要包含图片、图表等非文本内容\n\n建议：\n1. 尝试将文件转换为纯文本(.txt)格式后再上传\n2. 确保文件未被加密或保护\n3. 如文件包含图片文字，可尝试使用图片OCR功能`);
            }
          }
        } catch (docxError) {
          console.error('DocumentPreview - docx文件解析失败:', docxError);
          setPreviewContent(`文档解析过程中遇到问题: ${docxError.message}\n\n文件名：${fileName || '未知'}\n\n建议解决方案：\n1. 确认文件格式正确且未损坏\n2. 尝试将文档另存为新版本的docx格式\n3. 将文本内容复制到纯文本文件中再上传\n4. 如问题持续，可尝试使用专业文档转换工具`);
        }
        return;
      }
      // 图片文件处理
      else if (actualFileType.includes('image/') || actualFileType === 'image') {
        console.log('DocumentPreview - 处理图片文件');
        setContentType('image');
        
        // 如果fileData是字符串，直接设置为图片src
        if (typeof fileData === 'string' && (fileData.startsWith('http') || fileData.startsWith('data:image'))) {
          setPreviewContent(fileData);
        } 
        // 如果fileData是文件或Blob对象，创建URL
        else if (fileData instanceof File || fileData instanceof Blob) {
          const objectUrl = URL.createObjectURL(fileData);
          setPreviewContent(objectUrl);
        } else {
          // 尝试提取图片文本内容
          try {
            const textContent = await extractTextFromImage(file);
            setContentType('text');
            setPreviewContent(textContent || '图片内容无法提取文本');
          } catch (imgError) {
            console.error('DocumentPreview - 图片文本提取失败:', imgError);
            setContentType('text');
            setPreviewContent('图片内容无法预览，请尝试下载查看。');
          }
        }
      }
      // 尝试通用文件文本提取
      else {
        console.log('DocumentPreview - 处理通用文件');
        try {
          const textContent = await extractTextFromFile(file);
          setContentType('text');
          setPreviewContent(textContent);
        } catch (fileError) {
          console.error('DocumentPreview - 通用文件解析失败:', fileError);
          // 回退到原始处理逻辑
          setContentType('text');
          
          // 处理JSON对象
          if (typeof fileData === 'object' && fileData !== null && !(fileData instanceof File) && !(fileData instanceof Blob)) {
            setPreviewContent(JSON.stringify(fileData, null, 2));
          } 
          // 处理字符串
          else if (typeof fileData === 'string') {
            setPreviewContent(fileData);
          } 
          // 其他情况转换为字符串
          else {
            setPreviewContent(Array.isArray(fileData) ? JSON.stringify(fileData, null, 2) : String(fileData));
          }
        }
      }
    } catch (error) {
        console.error('DocumentPreview - 加载预览内容失败:', error);
        message.error('加载预览内容失败');
        setContentType('text');
        setPreviewContent(`预览内容加载失败，请尝试下载文件查看。错误: ${error.message}`);
      } finally {
        setLoading(false);
        console.log('DocumentPreview - 加载预览内容完成');
      }
  };

  // 下载文件
  const handleDownload = () => {
    try {
      if (contentType === 'text' && typeof previewContent === 'string') {
        // 文本内容保存
        const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : 'txt';
        saveTextAsFile(previewContent, fileName || `document_${Date.now()}.${fileExtension}`);
        message.success('文件下载成功');
      } else if (contentType === 'image' && previewContent) {
        // 图片下载
        const link = document.createElement('a');
        link.href = previewContent;
        link.download = fileName || `image_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('图片下载成功');
      }
    } catch (error) {
      console.error('下载文件失败:', error);
      message.error('下载文件失败');
    }
  };

  // 处理全屏预览
  const handleFullscreen = () => {
    // 这里可以添加全屏预览的逻辑
    message.info('全屏预览功能开发中');
  };

  // 获取文件图标
  const getFileIcon = () => {
    if (contentType === 'image') {
      return <PictureOutlined />;
    }
    return <FileTextOutlined />;
  };

  // 清理资源
  useEffect(() => {
    return () => {
      // 清理创建的ObjectURL
      if (previewContent && contentType === 'image' && previewContent.startsWith('blob:')) {
        URL.revokeObjectURL(previewContent);
      }
    };
  }, [previewContent, contentType]);

  // 自定义页头
  const modalTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {getFileIcon()}
      <span>文档预览 - {fileName ? decodeURIComponent(fileName) : '未命名文件'}</span>
    </div>
  );

  // 自定义页脚操作按钮
  const modalFooter = (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
      <button 
        onClick={handleDownload}
        className="ant-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 16px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        <DownloadOutlined />
        下载
      </button>
      <button 
        onClick={handleFullscreen}
        className="ant-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 16px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        <FullscreenOutlined />
        全屏预览
      </button>
    </div>
  );

  return (
    <Modal
        title={modalTitle}
        open={visible}
        onCancel={onClose}
        footer={modalFooter}
        width={900}
        centered
        destroyOnHidden
        styles={{
          body: {
            padding: 0,
            overflow: 'hidden',
            backgroundColor: '#fafafa',
            maxHeight: '80vh'
          }
        }}
    >
      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ height: 'calc(100vh - 200px)' }}
        tabBarStyle={{
          padding: '12px 24px 0 24px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #f0f0f0'
        }}
      >
        <TabPane tab="预览" key="preview">
          <div style={{ 
            height: 'calc(100% - 48px)', 
            padding: '24px',
            overflow: 'auto',
            backgroundColor: '#fff'
          }}>
            {loading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '200px'
              }}>
                <Spin tip="加载预览内容中..." />
              </div>
            ) : contentType === 'text' ? (
              <pre 
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: '1.6',
                  fontSize: '14px',
                  color: '#333',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
                  padding: '16px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '4px',
                  maxHeight: '100%',
                  overflow: 'auto',
                  border: '1px solid #e8e8e8'
                }}
              >
                {previewContent || '无内容可预览'}
              </pre>
            ) : (
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  backgroundColor: '#f0f0f0'
                }}
              >
                {previewContent ? (
                  <img 
                    src={previewContent} 
                    alt="文档预览" 
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                ) : (
                  <div style={{ color: '#999' }}>图片加载失败</div>
                )}
              </div>
            )}
          </div>
        </TabPane>
        <TabPane tab="文件信息" key="info">
          <div style={{ 
            height: 'calc(100% - 48px)', 
            padding: '24px',
            overflow: 'auto'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: '#fff',
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', backgroundColor: '#fafafa', width: '120px' }}>文件名</td>
                  <td style={{ padding: '12px 16px' }}>{fileName || '未知'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', backgroundColor: '#fafafa' }}>文件类型</td>
                  <td style={{ padding: '12px 16px' }}>{fileType || '未知'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', backgroundColor: '#fafafa' }}>预览类型</td>
                  <td style={{ padding: '12px 16px' }}>{contentType === 'image' ? '图片' : '文本'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', backgroundColor: '#fafafa' }}>预览内容大小</td>
                  <td style={{ padding: '12px 16px' }}>
                    {previewContent ? (
                      typeof previewContent === 'string' ? 
                        `${Math.round((new Blob([previewContent]).size / 1024) * 100) / 100} KB` : 
                        '图片数据'
                    ) : '未知'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', backgroundColor: '#fafafa' }}>处理状态</td>
                  <td style={{ padding: '12px 16px' }}>
                    {loading ? '处理中...' : '处理完成'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default DocumentPreview;