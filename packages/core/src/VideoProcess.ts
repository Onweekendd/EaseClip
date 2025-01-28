import { EditorState } from "./EditorState.ts";
import { Video } from "./elements/resource/Video.ts";
import { VideoProcessor } from "./utils/VideoProcessor.ts";


import { proxy } from "comlink";
import type { ProxyResult } from "comlink";

import type { MetadataWorker } from "./workers/Metadata.worker.ts";


class VideoProcess {
  state: EditorState;
  private videoProcessor: VideoProcessor;
  private proxyWorker: ProxyResult<MetadataWorker>;


  constructor({ state }: { state: EditorState }) {
    this.state = state;
    this.videoProcessor = new VideoProcessor();    

    this.proxyWorker = proxy<MetadataWorker>(new Worker(new URL("./workers/Metadata.worker.js", import.meta.url),{
      type: "module",
    }));
  }

  onVideoUpload = async ({ file }: { file: File }) => {    
    console.log(this.proxyWorker)

   this.proxyWorker.parse(file).then(({duration,width,height,codec})=>{
    console.log(duration,width,height,codec)
   })

    const newVideo = new Video({
      name: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileUrl: URL.createObjectURL(file),
    });

    this.state.setVideos([...this.state.getVideos(), newVideo]);

    try {
      const {
        width,
        height,
        frameRate,
        duration,
        createTime,
        codec,
        cover,
        videoFrames,
      } = await this.videoProcessor.processVideo(newVideo.fileUrl);

      newVideo.width = width;
      newVideo.height = height;
      newVideo.frameRate = frameRate;
      newVideo.duration = Number(duration.toFixed(2));
      newVideo.createTime = createTime;
      newVideo.cover = cover;
      newVideo.codec = codec;
      newVideo.status = "finished";
      newVideo.videoFrame = videoFrames;
    } catch (error) {
      console.error("Failed to process video:", error);
      newVideo.status = "error";
    }

    this.state.setVideos([
      ...this.state.getVideos().filter((v) => v.id !== newVideo.id),
      newVideo,
    ]);
  };

  public dispose() {
    if (this.videoProcessor) {
      this.videoProcessor.dispose();
    }
  }
}

export { VideoProcess };
