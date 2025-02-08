import MP4Box from "@webav/mp4box.js";
import type { MP4ArrayBuffer, MP4Sample } from "@webav/mp4box.js";
import { expose } from "comlink";

import { TaskHandler, WorkResultMap, WorkType } from "./WorkManager";

export class SampleTaskHandler implements TaskHandler<WorkType.SAMPLE> {
  async handle(
    worker: Worker,
    data: ArrayBuffer,
  ): Promise<WorkResultMap[WorkType.SAMPLE]> {
    const sampleWorker = worker as unknown as SampleWorker;
    return sampleWorker.sample(data);
  }
}

/**
 * 采样工作进程
 * 负责从MP4文件中提取视频样本数据
 */
const worker = {
  async sample(buffer: ArrayBuffer): Promise<MP4Sample[]> {
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

        // 设置采样选项
        mp4File.setExtractionOptions(videoTrack.id, null, {
          nbSamples: videoTrack.nb_samples,
        });

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
