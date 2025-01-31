import MP4Box from "@webav/mp4box.js";
import type {
  MP4ArrayBuffer,
  MP4File,
  MP4Sample,
  TrakBoxParser,
} from "@webav/mp4box.js";


import type { DecodedFrame } from "../elements/resource/Video.js";

/**
 * 视频信息接口
 */
export interface VideoInfo {
  width: number;
  height: number;
  frameRate: number;
  duration: number;
  createTime: Date;
  codec: string;
  description: Uint8Array;
  samples: MP4Sample[];
  timescale: number;
}

/**
 * 视频处理器类
 * 负责视频的解封装、采样和解码等底层操作
 */
export class VideoProcessor {
  private file: MP4File | null = null;

  /**
   * 解析视频编解码器描述信息
   */
  private parseVideoCodecDesc(track: TrakBoxParser): Uint8Array {
    for (const entry of track.mdia.minf.stbl.stsd.entries) {
      // @ts-expect-error 类型错误
      const box = entry.avcC ?? entry.hvcC ?? entry.av1C ?? entry.vpcC;
      if (box != null) {
        const stream = new MP4Box.DataStream(
          undefined,
          0,
          MP4Box.DataStream.BIG_ENDIAN,
        );
        box.write(stream);
        return new Uint8Array(stream.buffer.slice(8));
      }
    }
    throw Error("avcC, hvcC, av1C or VPX not found");
  }

  /**
   * 采集视频样本数据
   */
  public async collectVideoSamples(fileUrl: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const mp4File = MP4Box.createFile();
      this.file = mp4File;
      const samples: MP4Sample[] = [];

      mp4File.onError = (error) => {
        reject(new Error(error));
      };

      mp4File.onReady = async (info) => {
        const videoTrack = info.videoTracks[0];
        if (!videoTrack) {
          reject(new Error("No video track found"));
          return;
        }

        const width = videoTrack.track_width;
        const height = videoTrack.track_height;
        const totalSeconds = videoTrack.duration / videoTrack.timescale;
        const frameRate = Math.round(videoTrack.nb_samples / totalSeconds);
        const duration = videoTrack.duration / videoTrack.timescale;
        const createTime = new Date(videoTrack.created);
        const codec = videoTrack.codec;
        const description = this.parseVideoCodecDesc(
          mp4File.getTrackById(videoTrack.id),
        );
        const timescale = videoTrack.timescale;

        mp4File.setExtractionOptions(videoTrack.id, null, {
          nbSamples: videoTrack.nb_samples,
        });
        mp4File.start();

        mp4File.onSamples = (id, user, newSamples) => {
          samples.push(...newSamples);
          if (samples.length === videoTrack.nb_samples) {
            mp4File.stop();

            resolve({
              width,
              height,
              frameRate,
              duration,
              createTime,
              codec,
              description,
              samples,
              timescale,
            });
          }
        };
      };

      fetch(fileUrl)
        .then((response) => response.arrayBuffer())
        .then((buffer) => {
          const arrayBuffer = buffer as MP4ArrayBuffer;
          arrayBuffer.fileStart = 0;
          mp4File.appendBuffer(arrayBuffer);
          mp4File.flush();
        })
        .catch(reject);
    });
  }

  /**
   * 解码视频帧
   */
  public async decodeVideoFrames(
    videoInfo: VideoInfo,
  ): Promise<DecodedFrame[]> {
    return new Promise((resolve, reject) => {
      const decodedFrames: DecodedFrame[] = [];
      let isDecoderClosed = false;
      let lastDecodeTime = 0;
      let noNewFrameCount = 0;

      // 检查解码是否完成
      const checkDecodeComplete = () => {
        const currentTime = Date.now();

        if (decodedFrames.length > 0) {
          if (currentTime - lastDecodeTime > 500) {
            noNewFrameCount++;
          } else {
            noNewFrameCount = 0;
          }

          if (noNewFrameCount >= 3) {
            if (!isDecoderClosed) {
              isDecoderClosed = true;
              decoder.close();
              decodedFrames.sort((a, b) => a.timestamp - b.timestamp);
              resolve(decodedFrames);
            }
            return;
          }
        }

        setTimeout(checkDecodeComplete, 200);
      };

      const decoder = new VideoDecoder({
        output: async (frame) => {
          try {
            const imageBitmap = await createImageBitmap(frame);
            decodedFrames.push({
              imageBitmap,
              duration: frame.duration / 1000000, // 将微秒转换为秒
              timestamp: frame.timestamp / 1000000, // 将微秒转换为秒
            });

            frame.close();
            lastDecodeTime = Date.now();
          } catch (error) {
            console.warn("Failed to create bitmap:", error);
            frame.close();
          }
        },
        
        error: (error) => {
          if (!isDecoderClosed) {
            isDecoderClosed = true;
            decoder.close();
            reject(new Error(error.message));
          }
        },
      });

      decoder.configure({
        codec: videoInfo.codec,
        description: videoInfo.description,
        codedHeight: videoInfo.height,
        codedWidth: videoInfo.width,
      });

      const BATCH_SIZE = 30;
      let currentBatch = 0;

      const processBatch = () => {
        const start = currentBatch * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, videoInfo.samples.length);

        if (start >= videoInfo.samples.length) {
          return;
        }

        for (let i = start; i < end; i++) {
          const sample = videoInfo.samples[i];
          try {
            // 将sample的时间从timescale单位转换为微秒
            const microsPerTimeScale = 1000000 / videoInfo.timescale;
            decoder.decode(
              new EncodedVideoChunk({
                type: sample.is_sync ? "key" : "delta",
                timestamp: sample.cts * microsPerTimeScale,
                duration: sample.duration * microsPerTimeScale,
                data: sample.data,
              }),
            );
          } catch (error) {
            console.warn(`Failed to decode frame ${i}:`, error);
          }
        }

        currentBatch++;

        if (decoder.state === "configured" && !isDecoderClosed) {
          setTimeout(processBatch, 0);
        }
      };

      processBatch();
      checkDecodeComplete();
    });
  }

  /**
   * 获取视频封面
   */
  public async getVideoCover(videoUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = videoUrl;
      video.currentTime = 0;
      video.addEventListener("loadeddata", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg"));
      });
    });
  }

  /**
   * 处理视频文件
   * @param fileUrl 视频文件URL
   * @returns 视频处理结果
   */
  public async processVideo(fileUrl: string): Promise<{
    width: number;
    height: number;
    frameRate: number;
    duration: number;
    createTime: Date;
    codec: string;
    cover: string;
    videoFrames: DecodedFrame[];
  }> {
    try {
      // 1. 采集视频样本
      const videoInfo = await this.collectVideoSamples(fileUrl);

      // 2. 解码视频帧
      const videoFrames = await this.decodeVideoFrames(videoInfo);

      // 3. 获取视频封面
      const cover = await this.getVideoCover(fileUrl);

      return {
        width: videoInfo.width,
        height: videoInfo.height,
        frameRate: videoInfo.frameRate,
        duration: videoInfo.duration,
        createTime: videoInfo.createTime,
        codec: videoInfo.codec,
        cover,
        videoFrames,
      };
    } catch (error) {
      console.error("Failed to process video:", error);
      throw error;
    }
  }

  /**
   * 释放资源
   */
  public dispose() {
    if (this.file) {
      this.file.flush();
      this.file = null;
    }
  }
}
