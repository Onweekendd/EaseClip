import { expose } from 'comlink'
import MP4Box from '@webav/mp4box.js'
import type { MP4ArrayBuffer } from '@webav/mp4box.js'

const worker = {
  async parse(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    codec: string;
  }> {
    const buffer = await file.slice(0, 1_000_000).arrayBuffer()
    const mp4File = MP4Box.createFile()
    
    return new Promise((resolve, reject) => {
      mp4File.onReady = (info) => {
        resolve({
          duration: info.duration / info.timescale,
          width: info.videoTracks[0].video.width,
          height: info.videoTracks[0].video.height,
          codec: info.videoTracks[0].codec
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