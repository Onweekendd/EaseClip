import { expose } from 'comlink'
import MP4Box from '@webav/mp4box.js'
import type { MP4ArrayBuffer,TrakBoxParser } from '@webav/mp4box.js'

/**
 * 解析视频编解码器描述信息
 */
function parseVideoCodecDesc(track: TrakBoxParser): Uint8Array {
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



const worker = {
  async parse(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    codec: string;
    description: Uint8Array;
    frameRate: number;
    createTime: Date;
    timescale: number;
  }> {
    const buffer = await file.arrayBuffer()
    const mp4File = MP4Box.createFile()
    
    return new Promise((resolve, reject) => {
      mp4File.onReady = async (info) => {

        const videoTrack = info.videoTracks[0];
        if (!videoTrack) {
          reject(new Error("No video track found"));
          return;
        }

        const description = parseVideoCodecDesc(
          mp4File.getTrackById(videoTrack.id),
        );


        const width = videoTrack.track_width;
        const height = videoTrack.track_height;
        const totalSeconds = videoTrack.duration / videoTrack.timescale;
        const frameRate = Math.round(videoTrack.nb_samples / totalSeconds);
        const duration = videoTrack.duration / videoTrack.timescale;
        const createTime = new Date(videoTrack.created);
        const codec = videoTrack.codec;
        const timescale = videoTrack.timescale;

        resolve({
          duration,
          width,
          height,
          codec,
          description,
          frameRate,
          createTime,
          timescale,
        })
      }
      mp4File.onError = reject
      
      const bufferWithOffset = buffer as MP4ArrayBuffer
      bufferWithOffset.fileStart = 0
      mp4File.appendBuffer(bufferWithOffset)
    })
  }
}

export type MetadataWorker = typeof worker
expose(worker,self)