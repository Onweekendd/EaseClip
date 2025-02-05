import { MP4Sample } from "@webav/mp4box.js";

import { Video } from "../elements/resource/Video";
import { DecodeTaskHandler, DecodedFrame } from "./Decode.worker";
import { SampleTaskHandler } from "./Sample.worker";

/**
 * 工作类型枚举，定义了支持的任务类型
 */
export enum WorkType {
  SAMPLE = "sample",
  DECODE = "decode",
}

/**
 * 工作数据类型映射，定义每种任务类型对应的输入数据结构
 */
export interface WorkDataMap {
  [WorkType.SAMPLE]: File;
  [WorkType.DECODE]: {
    samples: MP4Sample[];
    config: any;
    timescale: number;
  };
}

/**
 * Worker返回结果映射，定义每种任务类型对应的输出数据结构
 */
export interface WorkResultMap {
  [WorkType.SAMPLE]: MP4Sample[];
  [WorkType.DECODE]: DecodedFrame[];
}

/**
 * 工作任务接口，使用WorkResultMap约束resolve和reject的类型
 */
interface WorkTask<T extends WorkType = WorkType> {
  type: T;
  priority: number;
  data: WorkDataMap[T];
  resolve: (value: WorkResultMap[T]) => void;
  reject: (reason: Error) => void;
}

/**
 * 任务处理器接口
 */
export interface TaskHandler<T extends WorkType = WorkType> {
  handle(worker: Worker, data: WorkDataMap[T]): Promise<WorkResultMap[T]>;
}

/**
 * 工作管理器类，负责管理和调度不同类型的Worker任务
 */
export class WorkManager {
  /** 任务队列，按优先级排序 */
  private taskQueue: Array<WorkTask> = [];

  /** Worker池，使用Map存储不同类型的worker */
  private workerPool = new Map<
    WorkType,
    {
      workers: Array<Worker | null>;
      maxCount: number;
    }
  >([
    [WorkType.SAMPLE, { workers: [], maxCount: 2 }],
    [WorkType.DECODE, { workers: [], maxCount: 4 }],
  ]);

  /** 任务处理器映射 */
  private taskHandlers = new Map<WorkType, TaskHandler>([
    [WorkType.SAMPLE, new SampleTaskHandler()],
    [WorkType.DECODE, new DecodeTaskHandler()],
  ]);

  /**
   * 创建工作管理器实例
   * @param video 关联的视频实例
   */
  constructor(private video: Video) {
    this.initWorkers();
  }

  /**
   * 初始化Worker池
   */
  private initWorkers() {
    this.workerPool.forEach((config, type) => {
      for (let i = 0; i < config.maxCount; i++) {
        let worker: Worker | null = null;
        switch (type) {
          case WorkType.SAMPLE:
            worker = new Worker(new URL("./Sample.worker.ts", import.meta.url));
            break;
          case WorkType.DECODE:
            worker = new Worker(new URL("./Decode.worker.ts", import.meta.url));
            break;
        }
        config.workers.push(worker);
      }
    });
  }

  /**
   * 添加任务到队列
   * @param task 要添加的任务
   */
  private enqueueTask<T extends WorkType>(task: WorkTask<T>) {
    if (!this.isWorkDataType(task.type, task.data)) {
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
    for (const type of [WorkType.SAMPLE, WorkType.DECODE]) {
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

          if (type === WorkType.DECODE) {
            const frames = result as DecodedFrame[];
            this.mergeFrames(frames);
          }

          task.resolve(result);
        } catch (error) {
          task.reject(error);
        } finally {
          pool.workers[workerIndex] = availableWorker;
          this.processTasks();
        }
      }
    }
  }

  /**
   * 合并解码帧，使用时间戳去重
   * @param newFrames 新的解码帧数组
   */
  private mergeFrames(newFrames: DecodedFrame[]) {
    this.video.frameManager.addFrames(newFrames);
  }

  /**
   * 执行任务
   * @param worker 执行任务的Worker实例
   * @param type 任务类型
   * @param data 任务数据
   * @returns 任务执行结果
   */
  private async executeTask<T extends WorkType>(
    worker: Worker,
    type: T,
    data: WorkDataMap[T],
  ): Promise<WorkResultMap[T]> {
    const handler = this.taskHandlers.get(type);
    if (!handler) {
      throw new Error("Unsupported work type");
    }
    return handler.handle(worker, data) as Promise<WorkResultMap[T]>;
  }

  /**
   * 提交采样任务
   * @param file 要采样的文件
   * @returns 采样结果
   */
  async processSamples(file: File): Promise<WorkResultMap[WorkType.SAMPLE]> {
    return new Promise((resolve, reject) => {
      this.enqueueTask({
        type: WorkType.SAMPLE,
        priority: 2,
        data: file,
        resolve,
        reject,
      });
    });
  }

  /**
   * 提交解码任务
   * @param samples 要解码的样本数组
   * @param config 解码配置
   * @param timescale 时间刻度
   * @returns 解码后的帧数组
   */
  async decodeFrames(
    samples: MP4Sample[],
    config: any,
    timescale: number,
  ): Promise<DecodedFrame[]> {
    return new Promise<WorkResultMap[WorkType.DECODE]>((resolve, reject) => {
      this.enqueueTask({
        type: WorkType.DECODE,
        priority: 3,
        data: { samples, config, timescale },
        resolve,
        reject,
      });
    });
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
  }

  /**
   * 类型守卫，检查数据类型是否匹配任务类型
   * @param type 任务类型
   * @param data 要检查的数据
   * @returns 数据类型是否匹配
   */
  private isWorkDataType<T extends WorkType>(
    type: T,
    data: unknown,
  ): data is WorkDataMap[T] {
    switch (type) {
      case WorkType.SAMPLE:
        return data instanceof File;
      case WorkType.DECODE:
        return !!(
          data &&
          typeof data === "object" &&
          "samples" in data &&
          "config" in data &&
          "timescale" in data
        );
      default:
        return false;
    }
  }
}
