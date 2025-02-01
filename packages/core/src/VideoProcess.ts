import { proxy } from "comlink";
import type { ProxyResult } from "comlink";

import { EditorState } from "./EditorState.ts";
import { Video } from "./elements/resource/Video.ts";
import { VideoProcessor } from "./utils/VideoProcessor.ts";
import type { MetadataWorker } from "./workers/Metadata.worker.ts";

class VideoProcess {
  state: EditorState;
  private videoProcessor: VideoProcessor;
  private proxyWorker: ProxyResult<MetadataWorker>;

  constructor({ state }: { state: EditorState }) {
    this.state = state;
    this.videoProcessor = new VideoProcessor();

    this.proxyWorker = proxy<MetadataWorker>(
      new Worker(new URL("./workers/Metadata.worker.js", import.meta.url), {
        type: "module",
      }),
    );
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
  

  onVideoUpload = async ({ file }: { file: File }) => {
    const newVideo = new Video({
      name: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileUrl: URL.createObjectURL(file),
    });

    this.state.setVideos([...this.state.getVideos(), newVideo]);

    this.proxyWorker
      .parse(file)
      .then(async ({ duration, width, height, codec, frameRate, description, createTime,timescale }) => {
        const videoFrames = [];

        newVideo.width = width;
        newVideo.height = height;
        newVideo.frameRate = frameRate;
        newVideo.duration = Number(duration.toFixed(2));
        newVideo.createTime = createTime;
        newVideo.codec = codec;
        newVideo.status = "finished";

        newVideo.cover = await this.getVideoCover(newVideo.fileUrl);
        newVideo.videoFrame = videoFrames;
      })
      .catch((error) => {
        console.error(error);
        newVideo.status = "error";
      })
      .finally(() => {
        this.state.setVideos([
          ...this.state.getVideos().filter((v) => v.id !== newVideo.id),
          newVideo,
        ]);
      });
  };

  public dispose() {
    if (this.videoProcessor) {
      this.videoProcessor.dispose();
    }
  }
}

export { VideoProcess };
