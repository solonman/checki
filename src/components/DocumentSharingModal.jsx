import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Table, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { 
  shareDocumentWithUser, 
  getDocumentShares, 
  removeDocumentShare, 
  updateDocumentSharePermission 
} from '../utils/documentSharingService';

const { Option } = Select;
const { Search } = Input;

const DocumentSharingModal = ({ visible, onCancel, documentId, documentName, onShareSuccess }) => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [editingShareId, setEditingShareId] = useState(null);

  // 加载文档共享记录
  useEffect(() => {
    if (visible && documentId) {
      loadDocumentShares();
    }
  }, [visible, documentId]);

  // 加载文档共享记录
  const loadDocumentShares = async () => {
    try {
      setLoading(true);
      const data = await getDocumentShares(documentId);
      setShares(data);
    } catch (error) {
      console.error('加载文档共享记录失败:', error);
      message.error(`加载共享记录失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 搜索用户（模拟搜索，实际应调用API）
  const handleSearchUser = (value) => {
    setSearchingUser(true);
    // 模拟API调用延迟
    setTimeout(() => {
      setSearchingUser(false);
      // 在实际应用中，这里应该调用API搜索用户
      console.log('搜索用户:', value);
    }, 500);
  };

  // 共享文档
  const handleShare = async (values) => {
    try {
      setLoading(true);
      
      // 模拟用户ID（实际应用中应通过搜索API获取）
      const targetUserId = `user_${Date.now()}`; // 临时用户ID
      
      // 调用共享服务
      await shareDocumentWithUser(documentId, targetUserId, values.permission);
      
      // 重新加载共享记录
      await loadDocumentShares();
      
      // 重置表单
      form.resetFields();
      
      // 显示成功消息
      message.success('文档共享成功');
      
      // 通知父组件共享成功
      if (onShareSuccess) {
        onShareSuccess();
      }
    } catch (error) {
      console.error('共享文档失败:', error);
      message.error(`共享失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 更新共享权限
  const handleUpdatePermission = async (shareId, newPermission) => {
    try {
      setLoading(true);
      await updateDocumentSharePermission(shareId, newPermission);
      await loadDocumentShares();
      message.success('权限更新成功');
      setEditingShareId(null);
    } catch (error) {
      console.error('更新权限失败:', error);
      message.error(`更新权限失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 删除共享
  const handleRemoveShare = async (shareId) => {
    try {
      setLoading(true);
      await removeDocumentShare(shareId);
      await loadDocumentShares();
      message.success('已取消共享');
    } catch (error) {
      console.error('取消共享失败:', error);
      message.error(`取消共享失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 权限标签颜色映射
  const getPermissionTagColor = (permission) => {
    switch (permission) {
      case 'view':
        return 'blue';
      case 'comment':
        return 'orange';
      case 'edit':
        return 'green';
      default:
        return 'default';
    }
  };

  // 权限中文名称映射
  const getPermissionLabel = (permission) => {
    switch (permission) {
      case 'view':
        return '查看';
      case 'comment':
        return '评论';
      case 'edit':
        return '编辑';
      default:
        return permission;
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '用户邮箱',
      dataIndex: ['user', 'email'],
      key: 'email',
      render: (email) => email || '未知用户'
    },
    {
      title: '用户名称',
      dataIndex: ['user', 'user_metadata', 'name'],
      key: 'name',
      render: (name, record) => name || record.user?.email || '未知用户'
    },
    {
      title: '权限',
      dataIndex: 'permission_type',
      key: 'permission',
      render: (permission, record) => {
        if (editingShareId === record.id) {
          return (
            <Select
              value={permission}
              style={{ width: 100 }}
              onChange={(newPermission) => handleUpdatePermission(record.id, newPermission)}
              onBlur={() => setEditingShareId(null)}
              autoFocus
            >
              <Option value="view">查看</Option>
              <Option value="comment">评论</Option>
              <Option value="edit">编辑</Option>
            </Select>
          );
        }
        return (
          <Tag color={getPermissionTagColor(permission)}>
            {getPermissionLabel(permission)}
          </Tag>
        );
      }
    },
    {
      title: '共享时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (createdAt) => {
        if (!createdAt) return '-';
        return new Date(createdAt).toLocaleString();
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => setEditingShareId(record.id)}
          >
            修改权限
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleRemoveShare(record.id)}
          >
            取消共享
          </Button>
        </>
      )
    }
  ];

  return (
    <Modal
      title={`共享文档: ${documentName}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      loading={loading}
    >
      <div className="document-sharing-modal">
        {/* 共享表单 */}
        <div className="share-form-section">
          <h3 style={{ marginBottom: 16 }}>添加新共享</h3>
          <Form
            form={form}
            layout="inline"
            onFinish={handleShare}
            initialValues={{ permission: 'view' }}
          >
            <Form.Item
              name="email"
              rules={[{ required: true, message: '请输入用户邮箱' }]}
              style={{ width: 250 }}
            >
              <Search
                placeholder="输入用户邮箱"
                enterButton="搜索"
                allowClear
                loading={searchingUser}
                onSearch={handleSearchUser}
              />
            </Form.Item>
            
            <Form.Item
              name="permission"
              rules={[{ required: true, message: '请选择权限' }]}
            >
              <Select placeholder="选择权限" style={{ width: 120 }}>
                <Option value="view">查看</Option>
                <Option value="comment">评论</Option>
                <Option value="edit">编辑</Option>
              </Select>
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                共享
              </Button>
            </Form.Item>
          </Form>
        </div>

        {/* 已共享列表 */}
        <div className="shared-list-section" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>已共享用户</h3>
          <Table
            columns={columns}
            dataSource={shares}
            rowKey="id"
            pagination={false}
            loading={loading}
            locale={{
              emptyText: '暂无共享记录'
            }}
          />
        </div>

        {/* 共享说明 */}
        <div className="share-description" style={{ marginTop: 24, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <h4 style={{ marginBottom: 8 }}>权限说明：</h4>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><Tag color="blue">查看</Tag>：只能查看文档和校对结果</li>
            <li><Tag color="orange">评论</Tag>：可以查看文档和添加评论</li>
            <li><Tag color="green">编辑</Tag>：可以查看、编辑和管理文档</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentSharingModal;