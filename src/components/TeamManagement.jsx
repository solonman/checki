import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Tabs, Avatar, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { requestWithRetry } from '../utils/apiClient';
import { useTranslation } from '../context/i18nContext';

const { TabPane } = Tabs;
const { Option } = Select;

const TeamManagement = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form] = Form.useForm();

  // 获取团队成员列表
  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await requestWithRetry({
        method: 'GET',
        url: '/api/team/members'
      });
      
      if (response.data) {
        setTeamMembers(response.data.members || []);
      }
    } catch (error) {
      console.error('获取团队成员失败:', error);
      message.error(t('team.fetchMembersError'));
    } finally {
      setLoading(false);
    }
  };

  // 获取待处理邀请
  const fetchInvitations = async () => {
    try {
      const response = await requestWithRetry({
        method: 'GET',
        url: '/api/team/invitations'
      });
      
      if (response.data) {
        setInvitations(response.data.invitations || []);
      }
    } catch (error) {
      console.error('获取邀请列表失败:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchTeamMembers();
      fetchInvitations();
    }
  }, [visible]);

  // 添加或编辑团队成员
  const handleAddOrEditMember = async (values) => {
    try {
      setLoading(true);
      
      if (editingMember) {
        // 编辑现有成员
        const response = await requestWithRetry({
          method: 'PUT',
          url: `/api/team/members/${editingMember.id}`,
          data: values
        });
        
        if (response.data) {
          message.success(t('team.memberUpdated'));
          setTeamMembers(prev => 
            prev.map(member => 
              member.id === editingMember.id ? response.data : member
            )
          );
        }
      } else {
        // 添加新成员（通过邀请）
        const response = await requestWithRetry({
          method: 'POST',
          url: '/api/team/invitations',
          data: {
            email: values.email,
            role: values.role,
            message: values.message || t('team.defaultInvitationMessage')
          }
        });
        
        if (response.data) {
          message.success(t('team.invitationSent'));
          setInvitations(prev => [...prev, response.data]);
        }
      }
      
      setModalVisible(false);
      form.resetFields();
      setEditingMember(null);
    } catch (error) {
      console.error('操作失败:', error);
      message.error(editingMember ? t('team.updateMemberError') : t('team.invitationError'));
    } finally {
      setLoading(false);
    }
  };

  // 删除团队成员
  const handleDeleteMember = async (memberId) => {
    try {
      setLoading(true);
      
      await requestWithRetry({
        method: 'DELETE',
        url: `/api/team/members/${memberId}`
      });
      
      message.success(t('team.memberDeleted'));
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
    } catch (error) {
      console.error('删除成员失败:', error);
      message.error(t('team.deleteMemberError'));
    } finally {
      setLoading(false);
    }
  };

  // 撤销邀请
  const handleRevokeInvitation = async (invitationId) => {
    try {
      await requestWithRetry({
        method: 'DELETE',
        url: `/api/team/invitations/${invitationId}`
      });
      
      message.success(t('team.invitationRevoked'));
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (error) {
      console.error('撤销邀请失败:', error);
      message.error(t('team.revokeInvitationError'));
    }
  };

  // 打开编辑模态框
  const openEditModal = (member) => {
    setEditingMember(member);
    form.setFieldsValue({
      email: member.email,
      role: member.role,
      name: member.name
    });
    setModalVisible(true);
  };

  // 打开添加模态框
  const openAddModal = () => {
    setEditingMember(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 获取角色标签颜色
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'red';
      case 'editor': return 'blue';
      case 'viewer': return 'green';
      default: return 'default';
    }
  };

  // 获取角色显示名称
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return t('team.roles.admin');
      case 'editor': return t('team.roles.editor');
      case 'viewer': return t('team.roles.viewer');
      default: return role;
    }
  };

  // 团队成员表格列配置
  const memberColumns = [
    {
      title: t('team.memberName'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <span>{text || record.email}</span>
        </Space>
      )
    },
    {
      title: t('team.email'),
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: t('team.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={getRoleColor(role)}>
          {getRoleDisplayName(role)}
        </Tag>
      )
    },
    {
      title: t('team.joinDate'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: t('team.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {t(`team.status.${status}`)}
        </Tag>
      )
    },
    {
      title: t('team.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('team.confirmDelete')}
            onConfirm={() => handleDeleteMember(record.id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={record.id === user?.id}
            >
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 邀请表格列配置
  const invitationColumns = [
    {
      title: t('team.email'),
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: t('team.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={getRoleColor(role)}>
          {getRoleDisplayName(role)}
        </Tag>
      )
    },
    {
      title: t('team.invitationDate'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: t('team.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'pending' ? 'orange' : 'red'}>
          {t(`team.invitationStatus.${status}`)}
        </Tag>
      )
    },
    {
      title: t('team.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            title={t('team.confirmRevoke')}
            onConfirm={() => handleRevokeInvitation(record.id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button type="link" danger>
              {t('team.revoke')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined />
          <span>{t('team.title')}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      className="team-management-modal"
    >
      <Tabs
        defaultActiveKey="members"
        items={[
          {
            key: 'members',
            label: t('team.members'),
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAddModal}
                  >
                    {t('team.inviteMember')}
                  </Button>
                </div>
                
                <Table
                  columns={memberColumns}
                  dataSource={teamMembers}
                  loading={loading}
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => t('common.totalItems', { total })
                  }}
                />
              </>
            )
          },
          {
            key: 'invitations',
            label: t('team.invitations'),
            children: (
              <Table
                columns={invitationColumns}
                dataSource={invitations}
                loading={loading}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => t('common.totalItems', { total })
                }}
              />
            )
          }
        ]}
      />

      {/* 添加/编辑成员模态框 */}
      <Modal
        title={editingMember ? t('team.editMember') : t('team.inviteMember')}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingMember(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddOrEditMember}
        >
          {!editingMember && (
            <Form.Item
              name="email"
              label={t('team.email')}
              rules={[
                { required: true, message: t('validation.emailRequired') },
                { type: 'email', message: t('validation.invalidEmail') }
              ]}
            >
              <Input placeholder={t('team.emailPlaceholder')} />
            </Form.Item>
          )}
          
          <Form.Item
            name="role"
            label={t('team.role')}
            rules={[{ required: true, message: t('validation.roleRequired') }]}
          >
            <Select placeholder={t('team.rolePlaceholder')}>
              <Option value="admin">{t('team.roles.admin')}</Option>
              <Option value="editor">{t('team.roles.editor')}</Option>
              <Option value="viewer">{t('team.roles.viewer')}</Option>
            </Select>
          </Form.Item>
          
          {!editingMember && (
            <Form.Item
              name="message"
              label={t('team.invitationMessage')}
            >
              <Input.TextArea
                rows={3}
                placeholder={t('team.invitationMessagePlaceholder')}
              />
            </Form.Item>
          )}
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingMember ? t('common.save') : t('team.sendInvitation')}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                {t('common.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default TeamManagement;