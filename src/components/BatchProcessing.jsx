import React, { useState, useEffect } from 'react';
import { Card, Button, Upload, Table, Progress, Space, Tag, message, Modal, Select, Form } from 'antd';
import { UploadOutlined, PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from '../context/i18nContext';
import { requestWithRetry } from '../utils/apiClient';
import { FileProcessingQueue } from '../utils/fileProcessingQueue';
import { validateFile, getFileExtension, formatFileSize } from '../utils/fileUtils';

const { Dragger } = Upload;
const { Option } = Select;

const BatchProcessing = ({ projectId, visible, onClose }) => {
  const { t } = useTranslation();
  const [fileList, setFileList] = useState([]);
  const [processingQueue, setProcessingQueue] = useState([]);
  const [processingStatus, setProcessingStatus] = useState('idle'); // idle, processing, paused, completed
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [batchConfig, setBatchConfig] = useState({
    proofreadingRules: {
      checkGrammar: true,
      checkSpelling: true,
      checkStyle: true,
      checkCompliance: true
    },
    outputFormat: 'detailed',
    generateReport: true,
    exportFormat: 'pdf'
  });

  const fileProcessingQueue = new FileProcessingQueue({
    maxConcurrency: 3,
    retryCount: 2,
    timeout: 300000 // 5分钟
  });

  // 处理文件上传
  const handleFileUpload = (info) => {
    const { file, fileList } = info;
    
    if (file.status === 'done' || file.status === 'error') {
      return;
    }

    // 验证文件
    const validation = validateFile(file, 10 * 1024 * 1024, ['.docx', '.pdf', '.txt', '.jpg', '.png']);
    
    if (!validation.isValid) {
      message.error(validation.error);
      return;
    }

    // 添加到文件列表
    const newFile = {
      uid: file.uid,
      name: file.name,
      size: file.size,
      type: getFileExtension(file.name),
      status: 'pending',
      progress: 0,
      result: null,
      error: null,
      file: file
    };

    setFileList(prev => [...prev, newFile]);
  };

  // 移除文件
  const handleRemoveFile = (fileId) => {
    setFileList(prev => prev.filter(file => file.uid !== fileId));
  };

  // 开始批量处理
  const startBatchProcessing = async () => {
    if (fileList.length === 0) {
      message.warning(t('batchProcessing.noFilesSelected'));
      return;
    }

    setProcessingStatus('processing');
    setProcessingProgress(0);
    setCurrentProcessingIndex(0);
    
    // 显示处理开始消息
    message.success(t('batchProcessing.processingStarted'));

    try {
      // 创建处理队列
      const queue = fileList.map(file => ({
        id: file.uid,
        file: file.file,
        status: 'pending',
        progress: 0,
        result: null,
        error: null
      }));

      setProcessingQueue(queue);

      // 处理每个文件
      for (let i = 0; i < queue.length; i++) {
        if (processingStatus === 'paused') {
          break;
        }

        const queueItem = queue[i];
        setCurrentProcessingIndex(i);

        try {
          // 更新状态为处理中
          updateQueueItem(queueItem.id, { status: 'processing', progress: 0 });

          // 提取文件内容
          const content = await extractFileContent(queueItem.file);
          
          // 更新进度
          updateQueueItem(queueItem.id, { progress: 30 });

          // 执行校对
          const proofreadingResult = await performProofreading(content);
          
          // 更新进度
          updateQueueItem(queueItem.id, { progress: 70 });

          // 生成报告（如果启用）
          let reportResult = null;
          if (batchConfig.generateReport) {
            reportResult = await generateReport(proofreadingResult);
          }

          // 更新状态为完成
          updateQueueItem(queueItem.id, {
            status: 'completed',
            progress: 100,
            result: {
              proofreading: proofreadingResult,
              report: reportResult
            }
          });

          // 更新总进度
          const overallProgress = ((i + 1) / queue.length) * 100;
          setProcessingProgress(overallProgress);

        } catch (error) {
          console.error(`处理文件 ${queueItem.file.name} 失败:`, error);
          updateQueueItem(queueItem.id, {
            status: 'error',
            progress: 0,
            error: error.message
          });
        }
      }

      setProcessingStatus('completed');
      message.success(t('batchProcessing.processingCompleted'));

    } catch (error) {
      console.error('批量处理失败:', error);
      setProcessingStatus('error');
      message.error(t('batchProcessing.processingError'));
    }
  };

  // 暂停批量处理
  const pauseBatchProcessing = () => {
    setProcessingStatus('paused');
    message.info(t('batchProcessing.processingPaused'));
  };

  // 继续批量处理
  const resumeBatchProcessing = () => {
    setProcessingStatus('processing');
    message.info(t('batchProcessing.processingResumed'));
  };

  // 停止批量处理
  const stopBatchProcessing = () => {
    setProcessingStatus('idle');
    setProcessingProgress(0);
    setCurrentProcessingIndex(0);
    message.info(t('batchProcessing.processingStopped'));
  };

  // 更新队列项目状态
  const updateQueueItem = (id, updates) => {
    setProcessingQueue(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );

    setFileList(prev => 
      prev.map(file => 
        file.uid === id ? { ...file, ...updates } : file
      )
    );
  };

  // 提取文件内容
  const extractFileContent = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await requestWithRetry({
      method: 'POST',
      url: '/api/files/extract-content',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data.content;
  };

  // 执行校对
  const performProofreading = async (content) => {
    const response = await requestWithRetry({
      method: 'POST',
      url: '/api/proofreading/analyze',
      data: {
        content,
        rules: batchConfig.proofreadingRules,
        projectId
      }
    });

    return response.data.result;
  };

  // 生成报告
  const generateReport = async (proofreadingResult) => {
    const response = await requestWithRetry({
      method: 'POST',
      url: '/api/batch/reports',
      data: {
        type: batchConfig.outputFormat,
        format: batchConfig.exportFormat,
        result: proofreadingResult,
        projectId
      }
    });

    return response.data;
  };

  // 查看结果
  const viewResult = (file) => {
    if (file.result) {
      Modal.info({
        title: `${file.name} - ${t('batchProcessing.processingResult')}`,
        width: 800,
        content: (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <pre>{JSON.stringify(file.result, null, 2)}</pre>
          </div>
        )
      });
    }
  };

  // 下载结果
  const downloadResult = async (file) => {
    if (!file.result?.report?.downloadUrl) {
      message.warning(t('batchProcessing.noReportAvailable'));
      return;
    }

    try {
      const response = await requestWithRetry({
        method: 'GET',
        url: file.result.report.downloadUrl,
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name}_report.${batchConfig.exportFormat}`;
      link.click();
      window.URL.revokeObjectURL(url);

      message.success(t('batchProcessing.downloadSuccess'));
    } catch (error) {
      console.error('下载失败:', error);
      message.error(t('batchProcessing.downloadError'));
    }
  };

  // 批量下载
  const batchDownload = async () => {
    const completedFiles = fileList.filter(file => file.status === 'completed' && file.result?.report);
    
    if (completedFiles.length === 0) {
      message.warning(t('batchProcessing.noCompletedFiles'));
      return;
    }

    message.info(t('batchProcessing.preparingBatchDownload'));

    for (const file of completedFiles) {
      await downloadResult(file);
    }

    message.success(t('batchProcessing.batchDownloadCompleted'));
  };

  // 生成报告
  const handleGenerateReport = async () => {
    const completedFiles = fileList.filter(file => file.status === 'completed');
    
    if (completedFiles.length === 0) {
      message.warning(t('batchProcessing.noCompletedFiles'));
      return;
    }

    setReportGenerating(true);
    
    try {
      // 收集所有处理结果
      const results = completedFiles.map(file => ({
        fileId: file.uid,
        fileName: file.name,
        result: file.result?.text || file.result || '处理完成'
      }));

      // 调用批量报告生成API
      const response = await requestWithRetry({
        method: 'POST',
        url: '/api/batch/reports',
        data: {
          fileIds: results.map(r => r.fileId),
          reportType: batchConfig.outputFormat,
          exportFormat: batchConfig.exportFormat,
          includeSummary: true,
          results: results,
          projectId
        }
      });

      message.success(t('batchProcessing.reportGenerated'));
      
    } catch (error) {
      console.error('生成报告失败:', error);
      message.error(t('batchProcessing.reportGenerationFailed'));
    } finally {
      setReportGenerating(false);
    }
  };

  // 文件表格列配置
  const fileColumns = [
    {
      title: t('batchProcessing.fileName'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          <Tag>{record.type}</Tag>
        </Space>
      )
    },
    {
      title: t('batchProcessing.fileSize'),
      dataIndex: 'size',
      key: 'size',
      render: (size) => formatFileSize(size)
    },
    {
      title: t('batchProcessing.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          pending: { color: 'default', text: t('batchProcessing.status.pending') },
          processing: { color: 'processing', text: t('batchProcessing.status.processing') },
          completed: { color: 'success', text: t('batchProcessing.status.completed') },
          error: { color: 'error', text: t('batchProcessing.status.error') }
        };
        
        const config = statusConfig[status] || statusConfig.pending;
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: t('batchProcessing.progress'),
      dataIndex: 'progress',
      key: 'progress',
      render: (progress, record) => (
        <Progress 
          percent={progress} 
          size="small"
          status={record.status === 'error' ? 'exception' : 'active'}
        />
      )
    },
    {
      title: t('batchProcessing.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => viewResult(record)}
            disabled={!record.result}
          >
            {t('common.view')}
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => downloadResult(record)}
            disabled={!record.result?.report}
          >
            {t('common.download')}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveFile(record.uid)}
            disabled={record.status === 'processing'}
          >
            {t('common.remove')}
          </Button>
        </Space>
      )
    }
  ];

  // 上传配置
  const uploadProps = {
    multiple: true,
    showUploadList: false,
    beforeUpload: () => false, // 手动处理上传
    onChange: handleFileUpload,
    accept: '.docx,.pdf,.txt,.jpg,.png'
  };

  return (
    <Modal
      title={t('batchProcessing.title')}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      className="batch-processing-modal"
    >
      <div className="batch-processing-container">
        {/* 批量处理配置 */}
        <Card title={t('batchProcessing.configuration')} size="small" style={{ marginBottom: 16 }}>
          <Form layout="inline">
            <Form.Item label={t('batchProcessing.outputFormat')}>
              <Select
                value={batchConfig.outputFormat}
                onChange={(value) => setBatchConfig(prev => ({ ...prev, outputFormat: value }))}
                style={{ width: 120 }}
              >
                <Option value="detailed">{t('batchProcessing.format.detailed')}</Option>
                <Option value="summary">{t('batchProcessing.format.summary')}</Option>
                <Option value="statistical">{t('batchProcessing.format.statistical')}</Option>
              </Select>
            </Form.Item>
            
            <Form.Item label={t('batchProcessing.exportFormat')}>
              <Select
                value={batchConfig.exportFormat}
                onChange={(value) => setBatchConfig(prev => ({ ...prev, exportFormat: value }))}
                style={{ width: 100 }}
              >
                <Option value="pdf">PDF</Option>
                <Option value="word">Word</Option>
                <Option value="excel">Excel</Option>
              </Select>
            </Form.Item>
            
            <Form.Item>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={startBatchProcessing}
                loading={processingStatus === 'processing'}
                disabled={fileList.length === 0 || processingStatus === 'processing'}
              >
                {t('batchProcessing.startProcessing')}
              </Button>
            </Form.Item>
            
            <Form.Item>
              <Button
                icon={<PauseCircleOutlined />}
                onClick={pauseBatchProcessing}
                disabled={processingStatus !== 'processing'}
              >
                {t('batchProcessing.pause')}
              </Button>
            </Form.Item>
            
            <Form.Item>
              <Button
                onClick={resumeBatchProcessing}
                disabled={processingStatus !== 'paused'}
              >
                {t('batchProcessing.resume')}
              </Button>
            </Form.Item>
            
            <Form.Item>
              <Button
                onClick={stopBatchProcessing}
                disabled={processingStatus === 'idle'}
              >
                {t('batchProcessing.stop')}
              </Button>
            </Form.Item>
            
            <Form.Item>
              <Button
                type="default"
                icon={<DownloadOutlined />}
                onClick={batchDownload}
                disabled={!fileList.some(file => file.status === 'completed')}
              >
                {t('batchProcessing.batchDownload')}
              </Button>
            </Form.Item>
            
            <Form.Item>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={handleGenerateReport}
                disabled={!fileList.some(file => file.status === 'completed')}
                loading={reportGenerating}
              >
                {t('batch.generateReport')}
              </Button>
            </Form.Item>
          </Form>
          
          {/* 总体进度 */}
          {processingStatus !== 'idle' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>{t('batchProcessing.overallProgress')}:</strong>
                {currentProcessingIndex + 1} / {fileList.length}
              </div>
              <Progress 
                percent={Math.round(processingProgress)} 
                status={processingStatus === 'error' ? 'exception' : 'active'}
              />
            </div>
          )}
        </Card>

        {/* 文件上传区域 */}
        <Card title={t('batchProcessing.fileUpload')} size="small" style={{ marginBottom: 16 }}>
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">{t('batchProcessing.uploadText')}</p>
            <p className="ant-upload-hint">{t('batchProcessing.uploadHint')}</p>
          </Dragger>
        </Card>

        {/* 文件列表 */}
        <Card title={`${t('batchProcessing.fileList')} (${fileList.length})`} size="small">
          <Table
            columns={fileColumns}
            dataSource={fileList}
            rowKey="uid"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => t('common.totalItems', { total })
            }}
            scroll={{ x: 800 }}
          />
        </Card>
      </div>
    </Modal>
  );
};

export default BatchProcessing;