import { proxy } from "comlink";
import type { ProxyResult } from "comlink";

import { EditorState } from "./EditorState.ts";
import { Video } from "./elements/resource/Video.ts";
import type { MetadataWorker } from "./workers/Metadata.worker.ts";

/**
 * 视频处理类，负责处理视频上传、解析元数据和生成预览等功能
 */
class VideoProcess {
  state: EditorState;
  private proxyWorker: ProxyResult<MetadataWorker>;

  /**
   * 创建视频处理实例
   * @param params 初始化参数
   * @param params.state 编辑器状态管理实例
   */
  constructor({ state }: { state: EditorState }) {
    this.state = state;

    this.proxyWorker = proxy<MetadataWorker>(
      new Worker(new URL("./workers/Metadata.worker.js", import.meta.url), {
        type: "module",
      }),
    );
  }

  /**
   * 获取视频封面
   * @param videoUrl 视频文件的 URL
   * @returns 返回视频封面的 base64 编码
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
   * 处理视频上传
   * @param params 上传参数
   * @param params.file 上传的视频文件
   * @throws 当视频处理失败时抛出错误
   */
  onVideoUpload = async ({ file }: { file: File }) => {
    const newVideo = new Video({
      name: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileUrl: URL.createObjectURL(file),
    });

    this.state.setVideos([...this.state.getVideos(), newVideo]);

    try {
      const {
        duration,
        width,
        height,
        codec,
        frameRate,
        description,
        createTime,
        timescale,
      } = await this.proxyWorker.parse(file);

      newVideo.width = width;
      newVideo.height = height;
      newVideo.frameRate = frameRate;
      newVideo.duration = Number(duration.toFixed(2));
      newVideo.createTime = createTime;
      newVideo.codec = codec;
      newVideo.status = "finished";
      newVideo.description = description;
      newVideo.timescale = timescale;

      newVideo.cover = await this.getVideoCover(newVideo.fileUrl);

      // 预解码 - 使用基于时间的采样方法
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = () => {
        const buffer = fileReader.result as ArrayBuffer;

        // 计算预览时间范围 - 例如处理前10秒或视频的前10%
        const previewDuration = 10; // 预览前10秒
        const endTime = Math.min(previewDuration, newVideo.duration);

        // 使用时间范围而非切分ArrayBuffer
        // 使用Video类的新方法
        newVideo.processSamples(buffer, {
          start: 0,
          end: endTime,
        });
      };
    } catch (error) {
      console.error("视频处理失败:", error);
      newVideo.status = "error";
    } finally {
      this.state.setVideos([
        ...this.state.getVideos().filter((v) => v.id !== newVideo.id),
        newVideo,
      ]);
    }
  };
}

export { VideoProcess };
