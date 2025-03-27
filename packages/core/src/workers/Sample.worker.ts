import MP4Box from "@webav/mp4box.js";
import type { MP4ArrayBuffer, MP4Sample } from "@webav/mp4box.js";
import { expose } from "comlink";

import { TaskHandler } from "../utils/TaskManager";
import {
  VideoTask,
  VideoTaskDataMap,
  VideoTaskResultMap,
  VideoTaskType,
} from "../utils/VideoTaskManager";

export class SampleTaskHandler implements TaskHandler<VideoTask> {
  async handle(
    worker: Worker,
    data: VideoTaskDataMap[VideoTaskType.SAMPLE],
  ): Promise<VideoTaskResultMap[VideoTaskType.SAMPLE]> {
    const sampleWorker = worker as unknown as SampleWorker;
    if (typeof data === "object" && "buffer" in data && "timeRange" in data) {
      const { buffer, timeRange } = data;
      return sampleWorker.sample(buffer, timeRange);
    }

    if (data instanceof ArrayBuffer) {
      const buffer = data as ArrayBuffer;
      return sampleWorker.sample(buffer);
    }
  }
}

/**
 * 采样工作进程
 * 负责从MP4文件中提取视频样本数据
 */
const worker = {
  async sample(
    buffer: ArrayBuffer,
    timeRange?: { start: number; end: number },
  ): Promise<MP4Sample[]> {
    return new Promise((resolve, reject) => {
      const samples: MP4Sample[] = [];

      // 创建MP4文件解析器
      const mp4File = MP4Box.createFile();

      // 错误处理
      mp4File.onError = (error) => {
        reject(new Error(error));
      };

      // 文件就绪后的处理
      mp4File.onReady = async (info) => {
        // 获取视频轨道
        const videoTrack = info.videoTracks[0];
        if (!videoTrack) {
          reject(new Error("No video track found"));
          return;
        }

        // 设置采样选项 - 根据时间范围参数
        if (timeRange) {
          // 将时间(秒)转换为媒体时间单位
          const startSample = Math.floor(
            timeRange.start * videoTrack.timescale,
          );
          const endSample = Math.ceil(timeRange.end * videoTrack.timescale);
          const sampleCount = endSample - startSample;

          // 设置提取选项，只提取指定范围的样本
          mp4File.setExtractionOptions(videoTrack.id, null, {
            nbSamples: sampleCount > 0 ? sampleCount : videoTrack.nb_samples,
          });
        } else {
          // 如果未指定时间范围，则提取全部样本
          mp4File.setExtractionOptions(videoTrack.id, null, {
            nbSamples: videoTrack.nb_samples,
          });
        }

        // 开始采样
        mp4File.start();
      };

      // 采样数据处理
      mp4File.onSamples = (id, user, newSamples) => {
        samples.push(...newSamples);

        // 获取视频轨道
        const videoTrack = mp4File.moov?.traks.find(
          (trak) => trak.tkhd.track_id === id,
        );

        // 检查是否采样完成
        if (videoTrack && samples.length === videoTrack.samples.length) {
          mp4File.stop();
          resolve(samples);
        }
      };

      const arrayBuffer = buffer as MP4ArrayBuffer;
      arrayBuffer.fileStart = 0;
      mp4File.appendBuffer(arrayBuffer);
      mp4File.flush();
    });
  },
};

export type SampleWorker = typeof worker;
expose(worker, self);
