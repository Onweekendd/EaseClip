import { MP4Sample } from "@webav/mp4box.js";

import { Video } from "../elements/resource/Video";
import { DecodeTaskHandler, DecodedFrame } from "../workers/Decode.worker";
import { SampleTaskHandler } from "../workers/Sample.worker";
import {
  TaskDataMap,
  TaskManager,
  TaskResultMap,
  TaskType,
} from "./TaskManager";
import { TaskHandler } from "./TaskManager";

/**
 * 视频任务类型枚举
 */
export enum VideoTaskType {
  SAMPLE = "sample",
  DECODE = "decode",
}

/**
 * 视频任务类型接口
 */
export interface VideoTask extends TaskType {
  type: VideoTaskType;
}

/**
 * 视频任务数据映射
 */
export interface VideoTaskDataMap extends TaskDataMap<VideoTask> {
  [VideoTaskType.SAMPLE]:
    | ArrayBuffer
    | {
        buffer: ArrayBuffer;
        timeRange?: {
          start: number;
          end: number;
        };
      };
  [VideoTaskType.DECODE]: {
    samples: MP4Sample[];
    config: any;
    timescale: number;
  };
}

/**
 * 视频任务结果映射
 */
export interface VideoTaskResultMap extends TaskResultMap<VideoTask> {
  [VideoTaskType.SAMPLE]: MP4Sample[];
  [VideoTaskType.DECODE]: DecodedFrame[];
}

/**
 * 视频任务处理器映射
 */
export const videoTaskHandlers = new Map<VideoTaskType, TaskHandler<VideoTask>>(
  [
    [VideoTaskType.SAMPLE, new SampleTaskHandler()],
    [VideoTaskType.DECODE, new DecodeTaskHandler()],
  ],
);

/**
 * 视频任务管理器
 * 专门处理视频相关的采样和解码任务
 */
export class VideoTaskManager extends TaskManager<VideoTask> {
  private video: Video;

  /**
   * 创建视频任务管理器实例
   * @param video 视频对象
   */
  constructor(video: Video) {
    super({
      handlers: videoTaskHandlers,
      workerFactories: new Map([
        [
          VideoTaskType.SAMPLE,
          () =>
            new Worker(new URL("../workers/Sample.worker.ts", import.meta.url)),
        ],
        [
          VideoTaskType.DECODE,
          () =>
            new Worker(new URL("../workers/Decode.worker.ts", import.meta.url)),
        ],
      ]),
      maxWorkers: new Map([
        [VideoTaskType.SAMPLE, 2],
        [VideoTaskType.DECODE, 4],
      ]),
    });

    this.video = video;

    // 监听任务完成事件
    this.on("taskComplete", this.handleTaskComplete);
  }

  /**
   * 处理任务完成事件
   */
  private handleTaskComplete = (event: {
    type: VideoTaskType;
    data: any;
    result: any;
  }) => {
    if (event.type === VideoTaskType.DECODE) {
      const frames = event.result as DecodedFrame[];
      this.mergeFrames(frames);
    }
  };

  /**
   * 合并解码帧，使用时间戳去重
   * @param newFrames 新的解码帧数组
   */
  private mergeFrames(newFrames: DecodedFrame[]) {
    this.video.frameManager.addFrames(newFrames);
  }

  /**
   * 处理视频样本
   * @param sample 视频样本数据
   * @param timeRange 可选的时间范围
   * @returns 采样结果
   */
  async processSamples(
    sample: ArrayBuffer,
    timeRange?: { start: number; end: number },
  ): Promise<MP4Sample[]> {
    const result = await this.submitTask(
      VideoTaskType.SAMPLE,
      timeRange ? { buffer: sample, timeRange } : sample,
      2,
    );

    // // 自动提交解码任务
    // this.submitTask(
    //   VideoTaskType.DECODE,
    //   {
    //     samples: result,
    //     config: this.video.description,
    //     timescale: this.video.timescale,
    //   },
    //   3,
    // ).catch((error) => {
    //   console.error("解码任务失败:", error);
    // });

    return result;
  }

  /**
   * 解码视频帧
   * @param samples 样本数据
   * @param config 视频配置
   * @param timescale 时间刻度
   * @returns 解码后的帧
   */
  async decodeFrames(
    samples: MP4Sample[],
    config: any,
    timescale: number,
  ): Promise<DecodedFrame[]> {
    return this.submitTask(
      VideoTaskType.DECODE,
      { samples, config, timescale },
      3,
    );
  }

  /**
   * 类型守卫，验证任务数据是否合法
   */
  protected override isValidTaskData<K extends VideoTaskType>(
    type: K,
    data: unknown,
  ): data is VideoTaskDataMap[K] {
    switch (type) {
      case VideoTaskType.SAMPLE:
        return (
          data instanceof ArrayBuffer ||
          (typeof data === "object" &&
            data !== null &&
            "buffer" in data &&
            data.buffer instanceof ArrayBuffer &&
            (!("timeRange" in data) ||
              (typeof data.timeRange === "object" &&
                data.timeRange !== null &&
                "start" in data.timeRange &&
                "end" in data.timeRange)))
        );
      case VideoTaskType.DECODE:
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
