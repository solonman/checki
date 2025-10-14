import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Select, 
  Checkbox, 
  Radio, 
  Space, 
  Divider, 
  Spin, 
  message,
  Card,
  Typography,
  List,
  Tag,
  Empty
} from 'antd';
import { 
  DownloadOutlined, 
  FileTextOutlined, 
  FileExcelOutlined, 
  FilePdfOutlined, 
  FileWordOutlined, 
  FileImageOutlined,
  FileZipOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../utils/supabaseClient';
import { 
  generateSingleReport, 
  generateSummaryReport, 
  downloadReport
} from '../utils/reportGenerationService';
import { format } from 'date-fns';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RadioGroup, RadioButton } = Radio;

/**
 * 报告生成器组件
 * 提供用户界面用于生成和导出不同格式的校对报告
 */
const ReportGenerator = ({ visible, onCancel, selectedTasks = [] }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('single'); // 'single', 'summary'
  const [reportFormat, setReportFormat] = useState('pdf');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeStatistics, setIncludeStatistics] = useState(true);
  const [mergeReports, setMergeReports] = useState(false);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');

  // 组件挂载时加载任务数据
  useEffect(() => {
    if (visible && user) {
      loadTasks();
      // 如果有外部传入的选中任务，设置选中状态
      if (selectedTasks && selectedTasks.length > 0) {
        setSelectedTaskIds(selectedTasks.map(task => task.id));
      }
    }
  }, [visible, user, selectedTasks]);

  // 加载任务数据
  const loadTasks = async () => {
    try {
      setLoading(true);
      
      // 从数据库获取已完成的任务
      const { data, error } = await supabase
        .from('proofreading_tasks')
        .select(`
          id,
          file_name,
          file_path,
          file_type,
          project,
          status,
          created_at,
          proofreading_result
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw new Error(`加载任务失败: ${error.message}`);
      }

      // 更新任务列表
      setAvailableTasks(data || []);
    } catch (error) {
      console.error('加载任务失败:', error);
      message.error(`加载任务失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理报告生成
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setExportProgress(0);
      setExportStatus('开始生成报告...');

      // 获取选中的任务数据
      const selectedTaskData = availableTasks.filter(task => 
        selectedTaskIds.includes(task.id)
      );

      if (selectedTaskData.length === 0) {
        message.error('请至少选择一个任务');
        return;
      }

      // 根据报告类型和格式生成报告
      if (reportType === 'single' && selectedTaskData.length === 1) {
        // 生成单个报告
        setExportStatus('正在生成单个报告...');
        const reportBlob = await generateSingleReport(selectedTaskData[0], reportFormat);
        setExportProgress(50);
        
        // 下载报告
        const fileName = `${selectedTaskData[0].file_name.replace(/\.[^/.]+$/, "")}_校对报告_${format(new Date(), 'yyyyMMdd_HHmmss')}.${reportFormat}`;
        downloadReport(reportBlob, fileName);
        setExportProgress(100);
        setExportStatus('报告生成成功！');
        message.success('报告已生成并开始下载');
      } else if (reportType === 'summary') {
        // 生成统计摘要报告
        setExportStatus('正在生成统计摘要报告...');
        const summaryReport = await generateSummaryReport(selectedTaskData, reportFormat);
        setExportProgress(75);
        
        // 下载报告
        const fileName = `校对统计报告_${format(new Date(), 'yyyyMMdd_HHmmss')}.${reportFormat}`;
        downloadReport(summaryReport, fileName);
        setExportProgress(100);
        setExportStatus('统计报告生成成功！');
        message.success('统计报告已生成并开始下载');
      } else {
        // 默认情况下，如果有多个任务，生成统计报告
        setExportStatus('正在生成统计摘要报告...');
        const summaryReport = await generateSummaryReport(selectedTaskData, reportFormat);
        setExportProgress(75);
        
        // 下载报告
        const fileName = `校对统计报告_${format(new Date(), 'yyyyMMdd_HHmmss')}.${reportFormat}`;
        downloadReport(summaryReport, fileName);
        setExportProgress(100);
        setExportStatus('统计报告生成成功！');
        message.success('统计报告已生成并开始下载');
      }

      // 关闭弹窗
      setTimeout(() => {
        onCancel();
      }, 1000);
    } catch (error) {
      console.error('生成报告失败:', error);
      message.error(`生成报告失败: ${error.message}`);
      setExportStatus(`生成失败: ${error.message}`);
    } finally {
      setLoading(false);
      // 重置进度
      setTimeout(() => {
        setExportProgress(0);
        setExportStatus('');
      }, 2000);
    }
  };

  // 处理任务选择变化
  const handleTaskSelect = (values) => {
    setSelectedTaskIds(values);
    // 如果选择了多个任务，自动切换到统计摘要模式
    if (values.length > 1) {
      setReportType('summary');
    } else if (values.length === 1) {
      setReportType('single');
    }
  };

  // 获取文件图标
  const getFileIcon = (task) => {
    if (task.file_type && task.file_type.includes('docx')) {
      return <FileWordOutlined className="file-icon docx-icon" />;
    } else if (task.file_type && task.file_type.includes('image')) {
      return <FileImageOutlined className="file-icon image-icon" />;
    }
    return <FileTextOutlined className="file-icon text-icon" />;
  };

  // 渲染报告类型选择
  const renderReportTypeSection = () => (
    <div style={{ marginBottom: 16 }}>
      <Title level={4}>选择报告类型</Title>
      <RadioGroup 
        value={reportType} 
        onChange={(e) => setReportType(e.target.value)}
        buttonStyle="solid"
      >
        <RadioButton value="single">单个报告</RadioButton>
        <RadioButton value="summary">统计摘要</RadioButton>
      </RadioGroup>
    </div>
  );

  // 渲染报告格式选择
  const renderReportFormatSection = () => (
    <div style={{ marginBottom: 16 }}>
      <Title level={4}>选择报告格式</Title>
      <Select
        value={reportFormat}
        onChange={setReportFormat}
        style={{ width: 200 }}
      >
        <Option value="pdf">
          <Space>
            <FilePdfOutlined />
            <span>PDF格式</span>
          </Space>
        </Option>
        <Option value="docx">
          <Space>
            <FileWordOutlined />
            <span>Word格式</span>
          </Space>
        </Option>
        <Option value="csv">
          <Space>
            <FileExcelOutlined />
            <span>CSV格式</span>
          </Space>
        </Option>
        <Option value="html">
          <Space>
            <FileTextOutlined />
            <span>HTML格式</span>
          </Space>
        </Option>
        <Option value="json">
          <Space>
            <FileTextOutlined />
            <span>JSON格式</span>
          </Space>
        </Option>
      </Select>
    </div>
  );

  // 渲染任务选择
  const renderTaskSelection = () => (
    <div style={{ marginBottom: 16 }}>
      <Title level={4}>选择任务</Title>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin size="default" />
          <Text style={{ display: 'block', marginTop: 8 }}>加载任务中...</Text>
        </div>
      ) : availableTasks.length === 0 ? (
        <Empty description="暂无已完成的任务" />
      ) : (
        <Select
          mode="multiple"
          placeholder="请选择要生成报告的任务"
          value={selectedTaskIds}
          onChange={handleTaskSelect}
          style={{ width: '100%' }}
          maxTagCount="responsive"
          disabled={loading}
        >
          {availableTasks.map(task => (
            <Option key={task.id} value={task.id}>
              <Space align="center">
                {getFileIcon(task)}
                <span>{task.file_name}</span>
                {task.project && <Tag color="blue">{task.project}</Tag>}
                <Text type="secondary">{format(new Date(task.created_at), 'yyyy-MM-dd')}</Text>
              </Space>
            </Option>
          ))}
        </Select>
      )}
    </div>
  );

  // 渲染报告选项
  const renderReportOptions = () => (
    <div style={{ marginBottom: 16 }}>
      <Title level={4}>报告选项</Title>
      <Checkbox 
        checked={includeDetails} 
        onChange={(e) => setIncludeDetails(e.target.checked)}
      >
        包含错误详细信息
      </Checkbox>
      <br />
      <Checkbox 
        checked={includeStatistics} 
        onChange={(e) => setIncludeStatistics(e.target.checked)}
      >
        包含统计信息
      </Checkbox>
    </div>
  );

  // 渲染导出进度
  const renderExportProgress = () => (
    exportProgress > 0 && (
      <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <Title level={5}>导出进度</Title>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div 
            style={{
              width: '100%',
              height: 8,
              backgroundColor: '#e8e8e8',
              borderRadius: 4,
              overflow: 'hidden'
            }}
          >
            <div 
              style={{
                width: `${exportProgress}%`,
                height: '100%',
                backgroundColor: '#1890ff',
                transition: 'width 0.3s'
              }}
            />
          </div>
          <Text style={{ marginLeft: 12 }}>{exportProgress}%</Text>
        </div>
        {exportStatus && (
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {exportStatus}
          </Text>
        )}
      </div>
    )
  );

  // 渲染报告预览信息
  const renderReportPreviewInfo = () => {
    const selectedTaskData = availableTasks.filter(task => 
      selectedTaskIds.includes(task.id)
    );

    if (selectedTaskData.length === 0) return null;

    return (
      <Card title="报告预览信息" style={{ marginBottom: 16 }}>
        <List
          size="small"
          dataSource={selectedTaskData.slice(0, 5)}
          renderItem={(task) => (
            <List.Item>
              <List.Item.Meta
                avatar={getFileIcon(task)}
                title={task.file_name}
                description={
                  <Space direction="vertical" align="start" style={{ width: '100%' }}>
                    {task.project && <Text>项目: {task.project}</Text>}
                    <Text type="secondary">创建时间: {format(new Date(task.created_at), 'yyyy-MM-dd HH:mm')}</Text>
                    {task.proofreading_result && task.proofreading_result.statistics && (
                      <Text>错误数: {task.proofreading_result.statistics.totalErrors} | 准确率: {task.proofreading_result.statistics.accuracyRate}%</Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
          footer={
            selectedTaskData.length > 5 ? (
              <Text type="secondary">... 还有 {selectedTaskData.length - 5} 个任务</Text>
            ) : null
          }
        />
      </Card>
    );
  };

  return (
    <Modal
      title={
        <Space align="center">
          <FileTextOutlined />
          <span>报告生成器</span>
        </Space>
      }
      open={visible}
      onOk={handleGenerateReport}
      onCancel={onCancel}
      okText="生成报告"
      cancelText="取消"
      width={800}
      okButtonProps={{ disabled: loading || selectedTaskIds.length === 0 }}
      cancelButtonProps={{ disabled: loading }}
    >
      <div className="report-generator-content">
        {renderReportTypeSection()}
        
        {renderReportFormatSection()}
        
        <Divider />
        
        {renderTaskSelection()}
        
        {renderReportOptions()}
        
        {renderReportPreviewInfo()}
        
        {renderExportProgress()}
        
        <div className="report-format-info">
          <Title level={5}>格式说明</Title>
          <List
            size="small"
            dataSource={[
              { format: 'PDF', desc: '适合打印和存档，格式固定' },
              { format: 'Word', desc: '可编辑格式，适合进一步修改' },
              { format: 'CSV', desc: '表格数据格式，适合数据分析' },
              { format: 'HTML', desc: '网页格式，支持交互查看' },
              { format: 'JSON', desc: '结构化数据格式，适合程序处理' }
            ]}
            renderItem={(item) => (
              <List.Item>
                <Space>
                  <Tag color="blue">{item.format}</Tag>
                  <Text>{item.desc}</Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
      </div>

      <style jsx>{`
        .report-generator-content {
          max-height: 600px;
          overflow-y: auto;
        }
        
        .file-icon {
          font-size: 16px;
        }
        
        .docx-icon {
          color: #2196f3;
        }
        
        .image-icon {
          color: #4caf50;
        }
        
        .text-icon {
          color: #ff9800;
        }
        
        .report-format-info {
          marginTop: 24px;
          paddingTop: 16px;
          borderTop: 1px solid #f0f0f0;
        }
      `}</style>
    </Modal>
  );
};

export default ReportGenerator;