// 文件处理队列管理器

/**
 * 文件处理队列类
 * 用于管理和优化文件处理任务，避免同时处理多个大型文件
 */
class FileProcessingQueue {
  constructor() {
    this.queue = []; // 待处理的任务队列
    this.isProcessing = false; // 当前是否正在处理任务
    this.maxConcurrent = 1; // 最大并发任务数
    this.currentTasks = 0; // 当前正在处理的任务数
    this.priorityQueue = new Map(); // 优先级任务队列
  }

  /**
   * 添加任务到队列
   * @param {Function} task - 要执行的任务函数，必须返回Promise
   * @param {Object} options - 任务选项
   * @param {string} options.id - 任务唯一标识符
   * @param {string} options.fileName - 文件名
   * @param {number} options.priority - 优先级，数字越小优先级越高（默认为1）
   * @param {Function} options.onProgress - 进度回调函数
   * @returns {Promise} - 返回任务执行的Promise
   */
  addTask(task, options = {}) {
    const { id = Date.now().toString(), fileName = '未命名文件', priority = 1, onProgress = null } = options;
    
    return new Promise((resolve, reject) => {
      const taskItem = {
        id,
        fileName,
        priority,
        task,
        onProgress,
        resolve,
        reject,
        addedTime: Date.now()
      };

      // 根据优先级添加到队列
      if (!this.priorityQueue.has(priority)) {
        this.priorityQueue.set(priority, []);
      }
      this.priorityQueue.get(priority).push(taskItem);

      console.log(`任务添加到队列: ${fileName} (优先级: ${priority}, ID: ${id})`);

      // 开始处理队列
      this.processQueue();
    });
  }

  /**
   * 处理队列中的任务
   */
  processQueue() {
    // 如果当前正在处理的任务数已经达到最大值，则不再处理新任务
    if (this.currentTasks >= this.maxConcurrent) {
      console.log(`队列已达最大并发数(${this.maxConcurrent})，等待任务完成...`);
      return;
    }

    // 查找下一个要处理的任务（按优先级从低到高）
    let nextTask = null;
    
    // 遍历优先级Map，找到第一个非空的优先级队列
    for (let [, tasks] of this.priorityQueue.entries()) {
      if (tasks.length > 0) {
        nextTask = tasks.shift();
        break;
      }
    }

    // 如果没有找到任务，说明队列为空
    if (!nextTask) {
      this.isProcessing = false;
      console.log('文件处理队列为空');
      return;
    }

    this.isProcessing = true;
    this.currentTasks++;
    
    console.log(`开始处理任务: ${nextTask.fileName} (ID: ${nextTask.id})，当前并发数: ${this.currentTasks}`);

    // 执行任务
    Promise.resolve()
      .then(() => {
        // 包装任务，添加进度回调支持
        return this.wrapTaskWithProgress(nextTask.task, nextTask.onProgress);
      })
      .then(result => {
        nextTask.resolve(result);
        console.log(`任务处理完成: ${nextTask.fileName} (ID: ${nextTask.id})`);
      })
      .catch(error => {
        nextTask.reject(error);
        console.error(`任务处理失败: ${nextTask.fileName} (ID: ${nextTask.id})`, error);
      })
      .finally(() => {
        this.currentTasks--;
        console.log(`任务完成处理，当前并发数: ${this.currentTasks}`);
        
        // 继续处理下一个任务
        this.processQueue();
      });
  }

  /**
   * 包装任务函数，添加进度回调支持
   * @param {Function} task - 原始任务函数
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise} - 包装后的任务Promise
   */
  wrapTaskWithProgress(task, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        // 检查任务是否接受onProgress参数
        const taskResult = task(onProgress);
        
        // 确保返回的是Promise
        if (taskResult && typeof taskResult.then === 'function') {
          taskResult.then(resolve).catch(reject);
        } else {
          resolve(taskResult);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取队列状态信息
   * @returns {Object} - 队列状态信息
   */
  getQueueStatus() {
    let totalTasks = 0;
    const priorityStats = {};
    
    // 计算各优先级的任务数量
    for (let [priority, tasks] of this.priorityQueue.entries()) {
      priorityStats[priority] = tasks.length;
      totalTasks += tasks.length;
    }

    return {
      totalTasks,
      currentTasks: this.currentTasks,
      maxConcurrent: this.maxConcurrent,
      priorityStats,
      isProcessing: this.isProcessing
    };
  }

  /**
   * 清空队列
   * @returns {number} - 被清空的任务数量
   */
  clearQueue() {
    let totalCleared = 0;
    
    // 清空所有优先级队列
    for (let tasks of this.priorityQueue.values()) {
      totalCleared += tasks.length;
      tasks.length = 0;
    }

    console.log(`队列已清空，共清空 ${totalCleared} 个任务`);
    return totalCleared;
  }

  /**
   * 设置最大并发任务数
   * @param {number} max - 最大并发任务数
   */
  setMaxConcurrent(max) {
    if (typeof max === 'number' && max > 0 && max <= 5) { // 限制最大并发数为5，避免性能问题
      this.maxConcurrent = Math.floor(max);
      console.log(`最大并发任务数已设置为: ${this.maxConcurrent}`);
      
      // 如果有新的并发槽位可用，立即处理队列
      this.processQueue();
    } else {
      console.warn('无效的最大并发数，必须是1-5之间的数字');
    }
  }
}

// 创建全局单例实例
const fileQueue = new FileProcessingQueue();

export default fileQueue;