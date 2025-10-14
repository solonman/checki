// 文档解析工具函数

/**
 * 从docx文件中提取文本内容
 * 使用jszip库实现完整的docx解析功能
 * 
 * @param {File} file - 要解析的docx文件
 * @returns {Promise<string>} - 提取的文本内容
 */
export const extractTextFromDocx = async (file) => {
  try {
    // 导入jszip库
    const JSZip = (await import('jszip')).default;
    
    // 读取文件数据
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // 查找word/document.xml文件，这是docx文档的主要内容文件
    const contentFile = zip.file('word/document.xml');
    if (!contentFile) {
      throw new Error('无法找到文档内容');
    }
    
    // 读取并解析XML内容
    const xmlContent = await contentFile.async('text');
    
    // 创建一个DOM解析器
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // 提取所有文本节点
    const textNodes = xmlDoc.getElementsByTagName('w:t');
    let extractedText = '';
    
    // 遍历所有文本节点并提取文本内容
    for (let i = 0; i < textNodes.length; i++) {
      extractedText += textNodes[i].textContent + ' ';
    }
    
    // 移除多余的空格和换行符
    extractedText = extractedText.trim();
    
    // 如果没有提取到文本，返回默认信息
    if (!extractedText) {
      return `文档标题：${file.name}\n\n文档中未提取到文本内容。`;
    }
    
    return extractedText;
  } catch (error) {
    console.error('解析docx文件时出错:', error);
    throw new Error('文档解析失败');
  }
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