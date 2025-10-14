// 文档解析工具函数

/**
 * 从docx文件中提取文本内容
 * 使用jszip库实现完整的docx解析功能
 * 
 * @param {File} file - 要解析的docx文件
 * @returns {Promise<string>} - 提取的文本内容
 */
export const extractTextFromDocx = async (file) => {
  console.log('documentParser - 开始解析docx文件:', file.name);
  console.log('documentParser - 文件大小:', file.size, 'bytes');
  
  try {
    // 检查文件对象
    if (!file || typeof file.arrayBuffer !== 'function') {
      throw new Error('无效的文件对象，缺少arrayBuffer方法');
    }
    
    // 导入jszip库
    console.log('documentParser - 导入jszip库');
    const JSZip = (await import('jszip')).default;
    
    // 读取文件数据
    console.log('documentParser - 读取文件数据');
    const arrayBuffer = await file.arrayBuffer();
    console.log('documentParser - 成功读取文件数据，大小:', arrayBuffer.byteLength, 'bytes');
    
    // 加载zip文件
    console.log('documentParser - 加载zip文件');
    const zip = await JSZip.loadAsync(arrayBuffer);
    console.log('documentParser - 成功加载zip文件');
    
    // 首先尝试使用更直接的方法提取文本
    const result = await extractTextFromDocxDirect(zip, file.name);
    
    console.log('documentParser - 解析完成，提取文本长度:', result.length, 'chars');
    return result;
  } catch (error) {
    console.error('documentParser - 解析docx文件时出错:', error);
    
    // 提供更详细的错误信息
    let detailedError = `文档解析失败: ${error.message}\n\n`;
    detailedError += `文件名: ${file.name}\n`;
    detailedError += `文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n`;
    detailedError += `可能的原因:\n`;
    detailedError += `1. 文件格式不正确或已损坏\n`;
    detailedError += `2. 文件太大，解析超时\n`;
    detailedError += `3. 浏览器不支持某些功能\n\n`;
    detailedError += `请尝试下载文件并使用其他工具查看。`;
    
    return detailedError;
  }
};

/**
 * 直接从docx zip文件中提取文本的更可靠方法
 * @param {Object} zip - JSZip实例
 * @param {string} fileName - 文件名
 * @returns {Promise<string>} - 提取的文本内容
 */
const extractTextFromDocxDirect = async (zip, fileName) => {
  try {
    // 获取zip文件中的所有文件列表
    const allFiles = zip.files;
    console.log('documentParser - zip文件中的所有文件:', Object.keys(allFiles));
    
    // 查找document.xml文件
    const documentXmlPath = 'word/document.xml';
    const contentFile = zip.file(documentXmlPath);
    
    if (!contentFile) {
      // 如果找不到标准的document.xml，尝试查找其他可能包含文本的XML文件
      console.warn('documentParser - 未找到word/document.xml，尝试查找其他XML文件');
      return await findAndParseAlternativeXml(zip, fileName);
    }
    
    // 读取XML内容
    console.log('documentParser - 读取document.xml内容');
    const xmlContent = await contentFile.async('text');
    
    // 使用正则表达式直接提取文本内容（更简单直接的方法）
    let extractedText = extractTextWithRegex(xmlContent);
    
    // 如果正则提取失败，使用DOM解析
    if (!extractedText || extractedText.length < 10) {
      console.log('documentParser - 正则提取文本较少，尝试DOM解析');
      extractedText = parseXmlContent(xmlContent);
    }
    
    // 如果仍未提取到足够的文本，尝试读取其他可能包含内容的XML文件
    if (!extractedText || extractedText.length < 10) {
      console.warn('documentParser - 主文档提取文本较少，尝试其他XML文件');
      const additionalText = await findAndParseAlternativeXml(zip, fileName, true);
      extractedText = extractedText + '\n\n' + additionalText;
    }
    
    // 清理和格式化文本
    extractedText = cleanExtractedText(extractedText);
    
    // 如果最终没有提取到有效文本，返回默认信息
    if (!extractedText || extractedText.trim().length === 0) {
      return `文档标题：${fileName}\n\n文档中未提取到文本内容。\n\n可能是一个空文档或包含的是图片、表格等非文本内容。`;
    }
    
    return extractedText;
  } catch (error) {
    console.error('documentParser - 直接提取文本失败:', error);
    return `文档标题：${fileName}\n\n提取文本时发生错误: ${error.message}`;
  }
};

/**
 * 使用正则表达式从XML中提取文本
 * @param {string} xmlContent - XML内容
 * @returns {string} - 提取的文本
 */
const extractTextWithRegex = (xmlContent) => {
  try {
    console.log('documentParser - 使用正则表达式提取文本');
    
    // 方法1: 提取<w:t>标签内容（docx标准格式）
    const wtRegex = /<w:t[^>]*>(.*?)<\/w:t>/g;
    const wtMatches = xmlContent.match(wtRegex);
    
    if (wtMatches && wtMatches.length > 0) {
      console.log('documentParser - 找到的<w:t>标签数量:', wtMatches.length);
      return wtMatches
        .map(match => match.replace(/<w:t[^>]*>|<\/w:t>/g, ''))
        .join(' ');
    }
    
    // 方法2: 移除所有XML标签，获取纯文本
    const plainText = xmlContent.replace(/<[^>]+>/g, ' ');
    return plainText;
  } catch (error) {
    console.error('documentParser - 正则提取失败:', error);
    return '';
  }
};

/**
 * 使用DOM解析XML内容
 * @param {string} xmlContent - XML内容
 * @returns {string} - 提取的文本
 */
const parseXmlContent = (xmlContent) => {
  try {
    console.log('documentParser - 使用DOM解析XML内容');
    
    // 创建DOM解析器
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // 尝试多种方法提取文本
    let textContents = [];
    
    // 方法1: 使用getElementsByTagNameNS
    try {
      const textNodes = xmlDoc.getElementsByTagNameNS('*', 't');
      console.log('documentParser - 找到的命名空间t节点数量:', textNodes.length);
      for (let i = 0; i < textNodes.length; i++) {
        if (textNodes[i].textContent.trim()) {
          textContents.push(textNodes[i].textContent);
        }
      }
    } catch (e) {
      console.warn('documentParser - 命名空间方法失败:', e);
    }
    
    // 方法2: 使用w:t标签
    const wtElements = xmlDoc.getElementsByTagName('w:t');
    console.log('documentParser - 找到的w:t元素数量:', wtElements.length);
    for (let i = 0; i < wtElements.length; i++) {
      if (wtElements[i].textContent.trim()) {
        textContents.push(wtElements[i].textContent);
      }
    }
    
    // 方法3: 提取所有文本节点
    if (textContents.length === 0) {
      console.log('documentParser - 尝试提取所有文本节点');
      const allText = xmlDoc.documentElement.textContent;
      textContents.push(allText);
    }
    
    return textContents.join(' ');
  } catch (error) {
    console.error('documentParser - DOM解析失败:', error);
    return '';
  }
};

/**
 * 查找并解析替代的XML文件
 * @param {Object} zip - JSZip实例
 * @param {string} fileName - 文件名
 * @param {boolean} skipMain - 是否跳过主文档
 * @returns {Promise<string>} - 提取的文本
 */
const findAndParseAlternativeXml = async (zip, fileName, skipMain = false) => {
  try {
    const allFiles = zip.files;
    const xmlFiles = Object.keys(allFiles)
      .filter(filename => {
        // 跳过关系文件和主题文件
        if (filename.includes('_rels') || filename.includes('theme')) return false;
        // 如果skipMain为true，跳过主文档
        if (skipMain && filename === 'word/document.xml') return false;
        return filename.endsWith('.xml');
      });
    
    console.log('documentParser - 找到的替代XML文件:', xmlFiles);
    
    let allTexts = [];
    
    // 尝试解析每个XML文件
    for (const xmlPath of xmlFiles.slice(0, 5)) { // 限制解析数量，避免性能问题
      try {
        const xmlFile = zip.file(xmlPath);
        if (xmlFile) {
          const xmlContent = await xmlFile.async('text');
          const text = extractTextWithRegex(xmlContent);
          if (text.trim()) {
            allTexts.push(`[文件: ${xmlPath}]\n${text}`);
          }
        }
      } catch (e) {
        console.warn(`documentParser - 解析${xmlPath}失败:`, e);
      }
    }
    
    return allTexts.join('\n\n') || '未找到其他可解析的XML文件';
  } catch (error) {
    console.error('documentParser - 查找替代XML失败:', error);
    return '查找替代内容失败';
  }
};

/**
 * 清理提取的文本
 * @param {string} text - 原始文本
 * @returns {string} - 清理后的文本
 */
const cleanExtractedText = (text) => {
  // 移除多余的空格
  let cleaned = text.replace(/\s+/g, ' ');
  // 移除XML转义字符
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // 修剪并返回
  return cleaned.trim();
};

/**
 * 从图片中提取文本（OCR识别）
 * 使用tesseract.js库实现，并添加性能优化
 * 
 * @param {File} file - 要识别的图片文件
 * @returns {Promise<string>} - 识别的文本内容
 */
export const extractTextFromImage = async (file) => {
  try {
    // 导入tesseract.js库
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('chi_sim+eng'); // 中英文混合识别
    
    // 显示加载状态
    console.log('正在进行OCR识别...');
    
    // 对大型图片进行预处理以优化性能
    let processedImage = file;
    
    // 如果文件大小超过2MB，进行图片压缩和尺寸调整
    if (file.size > 2 * 1024 * 1024) {
      processedImage = await compressImage(file);
      console.log('图片已压缩，原始大小：', (file.size / 1024).toFixed(2), 'KB', 
                '压缩后大小：', (processedImage.size / 1024).toFixed(2), 'KB');
    }
    
    // 读取文件并进行识别
    const blob = processedImage instanceof Blob ? processedImage : new Blob([processedImage]);
    
    // 添加识别进度回调
    let startTime = Date.now();
    let lastProgressTime = startTime;
    
    const result = await worker.recognize(blob, {
      // 配置识别参数以提高性能
      tessedit_do_invert: 0,
      tessedit_pageseg_mode: 3, // 全自动页面分割，假设文本可能包含图像
    }, {
      // 进度回调
      progress: (info) => {
        const currentTime = Date.now();
        // 每500ms更新一次进度日志，避免日志过多
        if (currentTime - lastProgressTime > 500) {
          console.log(`OCR识别进度: ${Math.round(info.progress * 100)}%`);
          lastProgressTime = currentTime;
        }
      }
    });
    
    const endTime = Date.now();
    console.log(`OCR识别完成，耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
    
    // 终止worker
    await worker.terminate();
    
    // 返回识别结果
    return `图片名称：${file.name}
图片大小：${(file.size / 1024).toFixed(2)}KB
处理后大小：${(processedImage.size / 1024).toFixed(2)}KB

OCR识别结果：
${result.data.text || '未能识别到文本内容'}`;
  } catch (error) {
    console.error('识别图片文本时出错:', error);
    throw new Error('图片识别失败');
  }
};

/**
 * 压缩图片以优化OCR性能
 * @param {File} file - 要压缩的图片文件
 * @returns {Promise<Blob>} - 压缩后的图片数据
 */
const compressImage = async (file) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 设置图片最大宽度和高度
      const maxDimension = 1200;
      
      img.onload = () => {
        // 计算调整后的尺寸，保持宽高比
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }
        
        // 设置canvas尺寸
        canvas.width = width;
        canvas.height = height;
        
        // 绘制图片到canvas（进行压缩）
        ctx.drawImage(img, 0, 0, width, height);
        
        // 将canvas内容转换为Blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, file.type || 'image/jpeg', 0.8); // 0.8是压缩质量，可根据需要调整
      };
      
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      
      // 读取图片文件
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      // 如果压缩失败，返回原始文件
      console.warn('图片压缩失败，使用原始图片进行OCR识别:', error);
      resolve(file);
    }
  });
};

/**
 * 根据文件类型提取文本内容
 * @param {File} file - 要提取内容的文件
 * @returns {Promise<string>} - 提取的文本内容
 */
export const extractTextFromFile = async (file) => {
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (fileExtension === '.docx') {
    return extractTextFromDocx(file);
  } else if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
    return extractTextFromImage(file);
  } else {
    throw new Error('不支持的文件类型');
  }
};

/**
 * 保存文本内容为文件
 * @param {string} content - 要保存的文本内容
 * @param {string} filename - 文件名
 */
export const saveTextAsFile = (content, filename) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};