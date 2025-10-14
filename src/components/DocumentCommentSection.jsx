import React, { useState, useEffect } from 'react';
import { 
  List, 
  Avatar, 
  Input, 
  Button, 
  Divider, 
  Popconfirm, 
  Tooltip,
  message,
  Spin
} from 'antd';
import { 
  SendOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  UserOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { 
  getDocumentComments, 
  createDocumentComment, 
  updateDocumentComment, 
  deleteDocumentComment,
  checkDocumentPermission
} from '../utils/documentSharingService';

const { TextArea } = Input;

const DocumentCommentSection = ({ documentId, onCommentUpdate }) => {
  const { user, loading: authLoading } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [hasCommentPermission, setHasCommentPermission] = useState(false);

  // 组件挂载时加载评论
  useEffect(() => {
    if (documentId && user) {
      loadComments();
      checkUserPermission();
    }
  }, [documentId, user]);

  // 检查用户是否有评论权限
  const checkUserPermission = async () => {
    try {
      const canComment = await checkDocumentPermission(user.id, documentId, 'comment');
      setHasCommentPermission(canComment);
    } catch (error) {
      console.error('检查评论权限失败:', error);
      // 默认允许评论，如果检查失败
      setHasCommentPermission(true);
    }
  };

  // 加载评论
  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await getDocumentComments(documentId);
      setComments(data);
    } catch (error) {
      console.error('加载评论失败:', error);
      message.error(`加载评论失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 提交新评论
  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      message.warning('评论内容不能为空');
      return;
    }

    if (!hasCommentPermission) {
      message.error('您没有评论权限');
      return;
    }

    try {
      setLoading(true);
      await createDocumentComment(documentId, user.id, commentText.trim());
      setCommentText('');
      await loadComments();
      message.success('评论发布成功');
      
      // 通知父组件评论已更新
      if (onCommentUpdate) {
        onCommentUpdate();
      }
    } catch (error) {
      console.error('发布评论失败:', error);
      message.error(`发布评论失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 开始编辑评论
  const handleEditComment = (comment) => {
    setEditingComment(comment.id);
    setEditText(comment.content);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditText('');
  };

  // 提交编辑后的评论
  const handleSubmitEdit = async (commentId) => {
    if (!editText.trim()) {
      message.warning('评论内容不能为空');
      return;
    }

    try {
      setLoading(true);
      await updateDocumentComment(commentId, editText.trim());
      setEditingComment(null);
      setEditText('');
      await loadComments();
      message.success('评论更新成功');
      
      // 通知父组件评论已更新
      if (onCommentUpdate) {
        onCommentUpdate();
      }
    } catch (error) {
      console.error('更新评论失败:', error);
      message.error(`更新评论失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId) => {
    try {
      setLoading(true);
      await deleteDocumentComment(commentId);
      await loadComments();
      message.success('评论已删除');
      
      // 通知父组件评论已更新
      if (onCommentUpdate) {
        onCommentUpdate();
      }
    } catch (error) {
      console.error('删除评论失败:', error);
      message.error(`删除评论失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取用户头像
  const getUserAvatar = (commentUser) => {
    if (!commentUser) {
      return <Avatar icon={<UserOutlined />} />;
    }
    
    const name = commentUser.user_metadata?.name || commentUser.email?.split('@')[0] || '用户';
    return <Avatar>{name.charAt(0).toUpperCase()}</Avatar>;
  };

  // 获取用户名称
  const getUserName = (commentUser) => {
    if (!commentUser) {
      return '未知用户';
    }
    
    return commentUser.user_metadata?.name || commentUser.email || '未知用户';
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) {
      return '刚刚';
    } else if (diffMins < 60) {
      return `${diffMins}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  // 检查当前用户是否可以编辑或删除评论
  const canManageComment = (comment) => {
    // 只有评论作者或文档所有者才能编辑/删除评论
    return user && (comment.user.id === user.id);
  };

  // 渲染评论项
  const renderCommentItem = ({ item }) => {
    const isEditing = editingComment === item.id;
    const canManage = canManageComment(item);
    
    return (
      <List.Item
        className="comment-item"
        actions={
          canManage && !isEditing ? [
            <Tooltip title="编辑">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEditComment(item)}
              />
            </Tooltip>,
            <Popconfirm
              title="确认删除"
              description="确定要删除这条评论吗？"
              onConfirm={() => handleDeleteComment(item.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
          ] : []
        }
      >
        <List.Item.Meta
          avatar={getUserAvatar(item.user)}
          title={
            <div className="comment-header">
              <span className="comment-author">{getUserName(item.user)}</span>
              <span className="comment-time">
                <ClockCircleOutlined className="time-icon" />
                {formatDate(item.created_at)}
              </span>
            </div>
          }
          description={
            isEditing ? (
              <div className="comment-edit-form">
                <TextArea
                  rows={2}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  autoFocus
                />
                <div className="edit-actions" style={{ marginTop: 8 }}>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleSubmitEdit(item.id)}
                  >
                    保存
                  </Button>
                  <Button
                    size="small"
                    onClick={handleCancelEdit}
                    style={{ marginLeft: 8 }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="comment-content">
                {item.content}
              </div>
            )
          }
        />
      </List.Item>
    );
  };

  if (authLoading) {
    return (
      <div className="comment-section-loading" style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="small" />
        <span style={{ marginLeft: 8 }}>加载中...</span>
      </div>
    );
  }

  return (
    <div className="document-comment-section">
      <h3 style={{ marginBottom: 16 }}>协作评论</h3>
      
      {/* 评论输入框 */}
      {hasCommentPermission ? (
        <div className="comment-input-section" style={{ marginBottom: 24 }}>
          <div className="input-container" style={{ display: 'flex', gap: 8 }}>
            <Avatar>{user?.user_metadata?.name?.charAt(0)?.toUpperCase() || '我'}</Avatar>
            <TextArea
              rows={3}
              placeholder="添加您的评论..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={{ flex: 1 }}
              disabled={loading}
            />
          </div>
          <div className="submit-container" style={{ textAlign: 'right', marginTop: 8 }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmitComment}
              disabled={loading || !commentText.trim()}
            >
              发布评论
            </Button>
          </div>
        </div>
      ) : (
        <div className="no-permission" style={{ 
          padding: 16, 
          background: '#f5f5f5', 
          borderRadius: 4, 
          textAlign: 'center',
          marginBottom: 24
        }}>
          <Text type="secondary">您没有评论权限</Text>
        </div>
      )}

      {/* 评论列表 */}
      <Divider style={{ marginBottom: 24 }} />
      
      {loading ? (
        <div className="comments-loading" style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="small" />
          <span style={{ marginLeft: 8 }}>加载评论中...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="no-comments" style={{ textAlign: 'center', padding: 40 }}>
          <Text type="secondary">暂无评论，来发表第一条评论吧！</Text>
        </div>
      ) : (
        <List
          className="comment-list"
          itemLayout="horizontal"
          dataSource={comments}
          renderItem={renderCommentItem}
        />
      )}

      {/* 样式 */}
      <style jsx>{`
        .comment-item {
          padding: 16px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .comment-item:last-child {
          border-bottom: none;
        }
        
        .comment-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        
        .comment-author {
          font-weight: 500;
          color: #333;
        }
        
        .comment-time {
          color: #999;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .time-icon {
          font-size: 12px;
        }
        
        .comment-content {
          color: #333;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        .comment-edit-form {
          width: 100%;
        }
        
        .edit-actions {
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
};

export default DocumentCommentSection;