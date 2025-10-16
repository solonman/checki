import supabase from './supabaseClient';

/**
 * 文档共享服务
 * 提供文档共享、访问权限管理等功能
 */

/**
 * 共享文档给其他用户
 * @param {string} documentId - 文档ID
 * @param {string} targetUserId - 目标用户ID
 * @param {string} permission - 权限类型: 'view', 'comment', 'edit'
 * @returns {Promise<Object>} - 共享操作结果
 */
export const shareDocumentWithUser = async (documentId, targetUserId, permission = 'view') => {
  try {
    // 检查权限类型是否有效
    const validPermissions = ['view', 'comment', 'edit'];
    if (!validPermissions.includes(permission)) {
      throw new Error(`无效的权限类型: ${permission}，有效类型为: ${validPermissions.join(', ')}`);
    }

    // 在数据库中创建共享记录
    const { data, error } = await supabase
      .from('document_shares')
      .insert({
        document_id: documentId,
        user_id: targetUserId,
        permission_type: permission,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('共享文档失败:', error);
      throw new Error(`共享文档失败: ${error.message}`);
    }

    console.log('文档共享成功:', data);
    return data;
  } catch (error) {
    console.error('共享文档过程中出错:', error);
    throw error;
  }
};

/**
 * 共享文档给多个用户
 * @param {string} documentId - 文档ID
 * @param {Array<{userId: string, permission: string}>} shares - 共享信息数组
 * @returns {Promise<Object>} - 共享结果
 */
export const batchShareDocument = async (documentId, shares) => {
  try {
    // 验证输入
    if (!Array.isArray(shares) || shares.length === 0) {
      throw new Error('请提供有效的共享信息数组');
    }

    // 准备插入数据
    const insertData = shares.map(share => ({
      document_id: documentId,
      user_id: share.userId,
      permission_type: share.permission || 'view',
      created_at: new Date().toISOString()
    }));

    // 执行插入
    const { data, error } = await supabase
      .from('document_shares')
      .insert(insertData)
      .select();

    if (error) {
      console.error('共享文档失败:', error);
      throw new Error(`共享文档失败: ${error.message}`);
    }

    console.log('共享文档成功:', data);
    return data;
  } catch (error) {
    console.error('共享文档过程中出错:', error);
    throw error;
  }
};

/**
 * 获取文档的所有共享记录
 * @param {string} documentId - 文档ID
 * @returns {Promise<Array>} - 共享记录列表
 */
export const getDocumentShares = async (documentId) => {
  try {
    const { data, error } = await supabase
      .from('document_shares')
      .select(`
        id,
        permission_type,
        created_at,
        user: user_id (
          id,
          email,
          user_metadata
        )
      `)
      .eq('document_id', documentId);

    if (error) {
      console.error('获取文档共享记录失败:', error);
      throw new Error(`获取文档共享记录失败: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('获取文档共享记录过程中出错:', error);
    throw error;
  }
};

/**
 * 更新文档共享权限
 * @param {string} shareId - 共享记录ID
 * @param {string} newPermission - 新的权限类型
 * @returns {Promise<Object>} - 更新后的共享记录
 */
export const updateDocumentSharePermission = async (shareId, newPermission) => {
  try {
    // 检查权限类型是否有效
    const validPermissions = ['view', 'comment', 'edit'];
    if (!validPermissions.includes(newPermission)) {
      throw new Error(`无效的权限类型: ${newPermission}，有效类型为: ${validPermissions.join(', ')}`);
    }

    const { data, error } = await supabase
      .from('document_shares')
      .update({
        permission_type: newPermission,
        updated_at: new Date().toISOString()
      })
      .eq('id', shareId)
      .select();

    if (error) {
      console.error('更新文档共享权限失败:', error);
      throw new Error(`更新文档共享权限失败: ${error.message}`);
    }

    console.log('更新文档共享权限成功:', data);
    return data;
  } catch (error) {
    console.error('更新文档共享权限过程中出错:', error);
    throw error;
  }
};

/**
 * 取消文档共享
 * @param {string} shareId - 共享记录ID
 * @returns {Promise<Object>} - 删除结果
 */
export const removeDocumentShare = async (shareId) => {
  try {
    const { data, error } = await supabase
      .from('document_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      console.error('取消文档共享失败:', error);
      throw new Error(`取消文档共享失败: ${error.message}`);
    }

    console.log('取消文档共享成功:', data);
    return data;
  } catch (error) {
    console.error('取消文档共享过程中出错:', error);
    throw error;
  }
};

/**
 * 获取用户可以访问的所有共享文档
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} - 可访问的共享文档列表
 */
export const getUserSharedDocuments = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('document_shares')
      .select(`
        id,
        permission_type,
        created_at,
        document: document_id (
          id,
          file_name,
          file_path,
          file_url,
          file_type,
          content_type,
          project,
          created_at,
          user: user_id (
            id,
            email,
            user_metadata
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('获取用户共享文档失败:', error);
      throw new Error(`获取用户共享文档失败: ${error.message}`);
    }

    // 格式化结果，便于前端使用
    const formattedDocuments = data.map(share => ({
      ...share.document,
      shareId: share.id,
      permission: share.permission_type,
      sharedAt: share.created_at,
      owner: share.document.user
    }));

    return formattedDocuments;
  } catch (error) {
    console.error('获取用户共享文档过程中出错:', error);
    throw error;
  }
};

/**
 * 检查用户是否有权限访问文档
 * @param {string} userId - 用户ID
 * @param {string} documentId - 文档ID
 * @param {string} requiredPermission - 所需权限级别
 * @returns {Promise<boolean>} - 是否有权限
 */
export const checkDocumentPermission = async (userId, documentId, requiredPermission = 'view') => {
  try {
    // 权限级别映射，用于比较权限
    const permissionLevels = {
      'view': 1,
      'comment': 2,
      'edit': 3
    };

    // 检查所需权限是否有效
    if (!permissionLevels[requiredPermission]) {
      throw new Error(`无效的所需权限: ${requiredPermission}`);
    }

    // 检查用户是否为文档所有者
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .select('user_id')
      .eq('id', documentId)
      .single();

    if (documentError && documentError.code !== 'PGRST116') { // PGRST116表示没有找到记录
      console.error('获取文档信息失败:', documentError);
      throw new Error(`获取文档信息失败: ${documentError.message}`);
    }

    // 如果用户是文档所有者，拥有最高权限
    if (documentData && documentData.user_id === userId) {
      return true;
    }

    // 检查用户的共享权限
    const { data: shareData, error: shareError } = await supabase
      .from('document_shares')
      .select('permission_type')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .single();

    if (shareError && shareError.code !== 'PGRST116') { // PGRST116表示没有找到记录
      console.error('获取共享权限失败:', shareError);
      throw new Error(`获取共享权限失败: ${shareError.message}`);
    }

    // 如果没有共享记录，用户没有权限
    if (!shareData) {
      return false;
    }

    // 比较用户权限是否满足所需权限
    const userPermissionLevel = permissionLevels[shareData.permission_type];
    const requiredPermissionLevel = permissionLevels[requiredPermission];

    return userPermissionLevel >= requiredPermissionLevel;
  } catch (error) {
    console.error('检查文档权限过程中出错:', error);
    throw error;
  }
};

/**
 * 创建协作审核评论
 * @param {string} documentId - 文档ID
 * @param {string} userId - 用户ID
 * @param {string} content - 评论内容
 * @param {Object} position - 评论位置信息（可选）
 * @returns {Promise<Object>} - 创建的评论
 */
export const createDocumentComment = async (documentId, userId, content, position = null) => {
  try {
    const { data, error } = await supabase
      .from('document_comments')
      .insert({
        document_id: documentId,
        user_id: userId,
        content,
        position: position ? JSON.stringify(position) : null,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('创建文档评论失败:', error);
      throw new Error(`创建文档评论失败: ${error.message}`);
    }

    console.log('创建文档评论成功:', data);
    return data;
  } catch (error) {
    console.error('创建文档评论过程中出错:', error);
    throw error;
  }
};

/**
 * 获取文档的所有评论
 * @param {string} documentId - 文档ID
 * @returns {Promise<Array>} - 评论列表
 */
export const getDocumentComments = async (documentId) => {
  try {
    const { data, error } = await supabase
      .from('document_comments')
      .select(`
        id,
        content,
        position,
        created_at,
        updated_at,
        user: user_id (
          id,
          email,
          user_metadata
        )
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('获取文档评论失败:', error);
      throw new Error(`获取文档评论失败: ${error.message}`);
    }

    // 解析position JSON字符串
    const parsedComments = data.map(comment => ({
      ...comment,
      position: comment.position ? JSON.parse(comment.position) : null
    }));

    return parsedComments;
  } catch (error) {
    console.error('获取文档评论过程中出错:', error);
    throw error;
  }
};

/**
 * 更新文档评论
 * @param {string} commentId - 评论ID
 * @param {string} content - 新的评论内容
 * @returns {Promise<Object>} - 更新后的评论
 */
export const updateDocumentComment = async (commentId, content) => {
  try {
    const { data, error } = await supabase
      .from('document_comments')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select();

    if (error) {
      console.error('更新文档评论失败:', error);
      throw new Error(`更新文档评论失败: ${error.message}`);
    }

    console.log('更新文档评论成功:', data);
    return data;
  } catch (error) {
    console.error('更新文档评论过程中出错:', error);
    throw error;
  }
};

/**
 * 删除文档评论
 * @param {string} commentId - 评论ID
 * @returns {Promise<Object>} - 删除结果
 */
export const deleteDocumentComment = async (commentId) => {
  try {
    const { data, error } = await supabase
      .from('document_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('删除文档评论失败:', error);
      throw new Error(`删除文档评论失败: ${error.message}`);
    }

    console.log('删除文档评论成功:', data);
    return data;
  } catch (error) {
    console.error('删除文档评论过程中出错:', error);
    throw error;
  }
};