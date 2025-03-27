import { EventEmitter } from "../interfaces/EventEmitter";

/**
 * 任务类型接口，用于Task系统的扩展
 */
export interface TaskType {
  readonly type: string;
}

/**
 * 任务数据映射接口
 */
export interface TaskDataMap<T extends TaskType> {
  [key: string]: any;
}

/**
 * 任务结果映射接口
 */
export interface TaskResultMap<T extends TaskType> {
  [key: string]: any;
}

/**
 * 任务接口
 */
export interface Task<T extends TaskType> {
  type: T["type"];
  priority: number;
  data: TaskDataMap<T>[T["type"]];
  resolve: (value: TaskResultMap<T>[T["type"]]) => void;
  reject: (reason: Error) => void;
}

/**
 * 任务处理器接口
 */
export interface TaskHandler<T extends TaskType> {
  handle(
    worker: Worker,
    data: TaskDataMap<T>[T["type"]],
  ): Promise<TaskResultMap<T>[T["type"]]>;
}

/**
 * 任务管理器配置
 */
export interface TaskManagerConfig<T extends TaskType> {
  handlers: Map<T["type"], TaskHandler<T>>;
  workerFactories: Map<T["type"], () => Worker>;
  maxWorkers: Map<T["type"], number>;
}

/**
 * 通用任务管理器类
 * 负责管理多种任务类型的调度和执行
 */
export class TaskManager<T extends TaskType> extends EventEmitter<{
  taskComplete: (event: { type: T["type"]; data: any; result: any }) => void;
  taskError: (event: { type: T["type"]; data: any; error: any }) => void;
}> {
  /** 任务队列，按优先级排序 */
  private taskQueue: Array<Task<T>> = [];

  /** Worker池，使用Map存储不同类型的worker */
  private workerPool = new Map<
    T["type"],
    {
      workers: Array<Worker | null>;
      maxCount: number;
    }
  >();

  /** 任务处理器映射 */
  private taskHandlers = new Map<T["type"], TaskHandler<T>>();

  /** 任务类型列表 */
  private taskTypes: T["type"][] = [];

  /** Worker工厂函数映射 */
  private workerFactories = new Map<T["type"], () => Worker>();

  /**
   * 创建任务管理器实例
   * @param config 任务管理器配置
   */
  constructor(config: TaskManagerConfig<T>) {
    super();
    this.taskHandlers = config.handlers;
    this.workerFactories = config.workerFactories;

    // 初始化Worker池
    config.maxWorkers.forEach((maxCount, type) => {
      this.workerPool.set(type, { workers: [], maxCount });
      this.taskTypes.push(type);
    });

    this.initWorkers();
  }

  /**
   * 初始化Worker池
   */
  private initWorkers() {
    this.workerPool.forEach((config, type) => {
      for (let i = 0; i < config.maxCount; i++) {
        const createWorker = this.workerFactories.get(type);
        if (createWorker) {
          const worker = createWorker();
          config.workers.push(worker);
        } else {
          config.workers.push(null);
        }
      }
    });
  }

  /**
   * 添加任务到队列
   * @param task 要添加的任务
   */
  private enqueueTask(task: Task<T>) {
    if (!this.isValidTaskData(task.type, task.data)) {
      task.reject(new Error(`Invalid data type for ${task.type} task`));
      return;
    }

    const index = this.taskQueue.findIndex((t) => t.priority < task.priority);
    if (index === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(index, 0, task);
    }

    this.processTasks();
  }

  /**
   * 处理任务队列中的任务
   */
  private async processTasks() {
    for (const type of this.taskTypes) {
      const pool = this.workerPool.get(type)!;
      const availableWorker = pool.workers.find((w) => w !== null);

      if (availableWorker && this.taskQueue.length > 0) {
        const taskIndex = this.taskQueue.findIndex((t) => t.type === type);
        if (taskIndex === -1) continue;

        const task = this.taskQueue.splice(taskIndex, 1)[0];
        const workerIndex = pool.workers.indexOf(availableWorker);
        pool.workers[workerIndex] = null;

        try {
          const result = await this.executeTask(
            availableWorker,
            type,
            task.data,
          );

          // 发出任务完成事件
          this.emit("taskComplete", {
            type,
            data: task.data,
            result,
          });

          task.resolve(result);
        } catch (error) {
          // 发出任务失败事件
          this.emit("taskError", {
            type,
            data: task.data,
            error,
          });

          task.reject(error);
        } finally {
          pool.workers[workerIndex] = availableWorker;
          this.processTasks();
        }
      }
    }
  }

  /**
   * 执行任务
   * @param worker 执行任务的Worker实例
   * @param type 任务类型
   * @param data 任务数据
   * @returns 任务执行结果
   */
  private async executeTask<K extends T["type"]>(
    worker: Worker,
    type: K,
    data: TaskDataMap<T>[K],
  ): Promise<TaskResultMap<T>[K]> {
    const handler = this.taskHandlers.get(type);
    if (!handler) {
      throw new Error(`Unsupported work type: ${type}`);
    }
    return handler.handle(worker, data) as Promise<TaskResultMap<T>[K]>;
  }

  /**
   * 提交任务
   * @param type 任务类型
   * @param data 任务数据
   * @param priority 任务优先级
   * @returns 任务结果
   */
  async submitTask<K extends T["type"]>(
    type: K,
    data: TaskDataMap<T>[K],
    priority: number = 1,
  ): Promise<TaskResultMap<T>[K]> {
    return new Promise((resolve, reject) => {
      this.enqueueTask({
        type,
        priority,
        data,
        resolve,
        reject,
      } as Task<T>);
    });
  }

  /**
   * 类型守卫，验证任务数据是否合法
   * 子类应覆盖此方法以提供具体验证逻辑
   */
  protected isValidTaskData<K extends T["type"]>(
    type: K,
    data: unknown,
  ): data is TaskDataMap<T>[K] {
    return true; // 默认实现总是返回true，子类应覆盖此方法
  }

  /**
   * 销毁所有worker实例
   */
  destroy() {
    this.workerPool.forEach((config) => {
      config.workers.forEach((worker) => {
        worker?.terminate();
      });
      config.workers = [];
    });

    this.off("taskComplete");
    this.off("taskError");
  }
}
