import React, { useState, useEffect } from 'react';
import { List, Empty, Tooltip, Button, Tag, Space, Typography, Card, Row, Col } from 'antd';
import { 
  FolderOutlined, 
  ShareAltOutlined, 
  UserOutlined, 
  EyeOutlined, 
  CommentOutlined, 
  EditOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getUserSharedDocuments } from '../utils/documentSharingService';
import supabase from '../utils/supabaseClient';

const { Title, Text } = Typography;
const { Meta } = Card;

const SharedDocumentsList = ({ onDocumentSelect }) => {
  const { user } = useAuth();
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sharedWithMe'); // 'sharedWithMe' or 'sharedByMe'
  const [myDocuments, setMyDocuments] = useState([]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user, activeTab]);

  // 加载文档列表
  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'sharedWithMe') {
        // 加载共享给我的文档
        const sharedWithMe = await getUserSharedDocuments(user.id);
        setSharedDocuments(sharedWithMe);
      } else {
        // 加载我共享的文档（需要从proofreading_tasks表获取）
        const { data, error } = await supabase
          .from('proofreading_tasks')
          .select(`
            id,
            file_name,
            file_path,
            file_url,
            file_type,
            content_type,
            project,
            created_at,
            status
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw new Error(`获取我的文档失败: ${error.message}`);
        }
        
        // 为每个文档获取共享记录数量
        const documentsWithShareInfo = await Promise.all(
          data.map(async doc => {
            try {
              const shares = await supabase
                .from('document_shares')
                .select('id')
                .eq('document_id', doc.id);
              return {
                ...doc,
                shareCount: shares.data ? shares.data.length : 0
              };
            } catch (err) {
              console.error(`获取文档共享信息失败: ${doc.id}`, err);
              return {
                ...doc,
                shareCount: 0
              };
            }
          })
        );
        
        setMyDocuments(documentsWithShareInfo);
      }
    } catch (error) {
      console.error('加载文档列表失败:', error);
      // 在实际应用中，应该显示错误提示
    } finally {
      setLoading(false);
    }
  };

  // 获取文件类型图标
  const getFileTypeIcon = (fileType, contentType) => {
    if (contentType === 'image' || ['jpg', 'jpeg', 'png'].includes(fileType)) {
      return <PictureOutlined className="file-type-icon" />;
    }
    return <FileTextOutlined className="file-type-icon" />;
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 渲染文档卡片
  const renderDocumentCard = (doc) => {
    const isSharedDoc = activeTab === 'sharedWithMe';
    
    return (
      <Col xs={24} sm={12} md={8} lg={6} key={doc.id} style={{ padding: 8 }}>
        <Card
          hoverable
          className="document-card"
          actions={[
            <Tooltip title={isSharedDoc ? getPermissionLabel(doc.permission) : '我的文档'}>
              {isSharedDoc ? (
                getPermissionIcon(doc.permission)
              ) : (
                <UserOutlined />
              )}
            </Tooltip>,
            <Tooltip title={formatDate(doc.created_at)}>
              <ClockCircleOutlined />
            </Tooltip>,
            ...(isSharedDoc ? [
              <Tooltip title={`由 ${doc.owner?.email || '未知用户'} 共享`}>
                <ShareAltOutlined />
              </Tooltip>
            ] : []),
            ...(!isSharedDoc && doc.shareCount > 0 ? [
              <Tooltip title={`已共享给 ${doc.shareCount} 人`}>
                <ShareAltOutlined />
              </Tooltip>
            ] : [])
          ]}
          onClick={() => onDocumentSelect && onDocumentSelect(doc)}
        >
          <Meta
            avatar={
              <div className="file-icon-container">
                {getFileTypeIcon(doc.file_type, doc.content_type)}
              </div>
            }
            title={
              <div className="document-title">
                <Text ellipsis={{ rows: 1 }}>{doc.file_name}</Text>
              </div>
            }
            description={
              <div className="document-meta">
                {isSharedDoc && (
                  <div className="shared-by">
                    <Text type="secondary" ellipsis>
                      共享者: {doc.owner?.email || '未知用户'}
                    </Text>
                  </div>
                )}
                <div className="document-project">
                  <Tag size="small" color="blue">
                    {doc.project || '无项目'}
                  </Tag>
                </div>
                <div className="document-date">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatDate(doc.created_at)}
                  </Text>
                </div>
              </div>
            }
          />
        </Card>
      </Col>
    );
  };

  // 获取权限图标
  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'view':
        return <EyeOutlined className="permission-icon view" />;
      case 'comment':
        return <CommentOutlined className="permission-icon comment" />;
      case 'edit':
        return <EditOutlined className="permission-icon edit" />;
      default:
        return <EyeOutlined />;
    }
  };

  // 获取权限标签
  const getPermissionLabel = (permission) => {
    switch (permission) {
      case 'view':
        return '查看权限';
      case 'comment':
        return '评论权限';
      case 'edit':
        return '编辑权限';
      default:
        return '未知权限';
    }
  };

  return (
    <div className="shared-documents-list">
      {/* 标签页切换 */}
      <div className="tabs-container" style={{ marginBottom: 24 }}>
        <Button
          type={activeTab === 'sharedWithMe' ? 'primary' : 'default'}
          onClick={() => setActiveTab('sharedWithMe')}
          icon={<ShareAltOutlined />}
          style={{ marginRight: 8 }}
        >
          共享给我的
        </Button>
        <Button
          type={activeTab === 'sharedByMe' ? 'primary' : 'default'}
          onClick={() => setActiveTab('sharedByMe')}
          icon={<FolderOutlined />}
        >
          我共享的
        </Button>
      </div>

      {/* 文档列表 */}
      {loading ? (
        <div className="loading-container" style={{ textAlign: 'center', padding: 40 }}>
          <Text>加载中...</Text>
        </div>
      ) : (
        <>
          {activeTab === 'sharedWithMe' && sharedDocuments.length === 0 ? (
            <Empty description="暂无共享给您的文档" />
          ) : activeTab === 'sharedByMe' && myDocuments.length === 0 ? (
            <Empty description="您还没有共享任何文档" />
          ) : (
            <Row gutter={[16, 16]}>
              {(activeTab === 'sharedWithMe' ? sharedDocuments : myDocuments).map(renderDocumentCard)}
            </Row>
          )}
        </>
      )}

      {/* 样式 */}
      <style jsx>{`
        .document-card {
          height: 100%;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
        }
        
        .document-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }
        
        .file-icon-container {
          background: #f0f0f0;
          border-radius: 4px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .file-type-icon {
          font-size: 24px;
          color: #1890ff;
        }
        
        .document-title {
          margin-bottom: 8px;
        }
        
        .document-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .shared-by {
          margin-bottom: 4px;
        }
        
        .permission-icon {
          font-size: 16px;
        }
        
        .permission-icon.view {
          color: #1890ff;
        }
        
        .permission-icon.comment {
          color: #fa8c16;
        }
        
        .permission-icon.edit {
          color: #52c41a;
        }
      `}</style>
    </div>
  );
};

export default SharedDocumentsList;