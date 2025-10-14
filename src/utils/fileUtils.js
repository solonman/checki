// 文件处理工具函数

/**
 * 验证文件格式是否支持
 * @param {File} file - 要验证的文件
 * @returns {boolean} - 文件格式是否支持
 */
export const isValidFileFormat = (file) => {
  const supportedFormats = ['.docx', '.jpg', '.jpeg', '.png'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  return supportedFormats.includes(fileExtension);
};

/**
 * 验证文件大小是否符合限制
 * @param {File} file - 要验证的文件
 * @param {number} maxSizeMB - 最大文件大小（MB）
 * @returns {boolean} - 文件大小是否符合限制
 */
export const isValidFileSize = (file, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * 获取文件类型
 * @param {File} file - 要获取类型的文件
 * @returns {string} - 文件类型（'document'、'image'或'unknown'）
 */
export const getFileType = (file) => {
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (extension === '.docx') return 'document';
  if (['.jpg', '.jpeg', '.png'].includes(extension)) return 'image';
  return 'unknown';
};

/**
 * 生成唯一的文件名
 * @param {string} originalName - 原始文件名
 * @returns {string} - 唯一文件名
 */
export const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.toLowerCase().substring(originalName.lastIndexOf('.'));
  return `${timestamp}_${randomString}${extension}`;
};

/**
 * 获取文件扩展名
 * @param {string} fileName - 文件名
 * @returns {string} - 文件扩展名（包含点）
 */
export const getFileExtension = (fileName) => {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex !== -1 ? fileName.substring(lastDotIndex).toLowerCase() : '';
};

/**
 * 格式化文件大小
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} - 格式化后的文件大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 验证文件
 * @param {File} file - 要验证的文件
 * @param {number} maxSize - 最大文件大小（字节）
 * @param {string[]} acceptedFormats - 接受的文件格式
 * @returns {Object} - 验证结果 { isValid: boolean, error: string }
 */
export const validateFile = (file, maxSize, acceptedFormats) => {
  // 验证文件大小
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `文件大小超过限制（最大 ${formatFileSize(maxSize)}）`
    };
  }

  // 验证文件格式
  const fileExtension = getFileExtension(file.name);
  if (!acceptedFormats.includes(fileExtension)) {
    return {
      isValid: false,
      error: `不支持的文件格式（支持格式：${acceptedFormats.join(', ')}）`
    };
  }

  return { isValid: true };
};