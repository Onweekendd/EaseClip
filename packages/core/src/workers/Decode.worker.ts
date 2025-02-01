import { expose } from 'comlink'
import type { MP4Sample } from '@webav/mp4box.js'

/**
 * 解码后的视频帧接口
 */
export interface DecodedFrame {
  /** 帧的时间戳(秒) */
  timestamp: number
  /** 帧的持续时间(秒) */
  duration: number
  /** 帧的图像数据 */
  imageBitmap: ImageBitmap
}

/**
 * 解码配置接口
 */
interface DecodeConfig {
  codec: string
  codedWidth: number
  codedHeight: number
  description: Uint8Array
}

/**
 * 解码工作进程
 * 负责将视频样本解码为图像帧
 */
const worker = {
  async decode(
    samples: MP4Sample[],
    config: DecodeConfig,
    timescale: number
  ): Promise<DecodedFrame[]> {
    return new Promise((resolve, reject) => {
      const decodedFrames: DecodedFrame[] = []
      let isDecoderClosed = false
      let lastDecodeTime = 0
      let noNewFrameCount = 0

      // 检查解码是否完成
      const checkDecodeComplete = () => {
        const currentTime = Date.now()

        if (decodedFrames.length > 0) {
          if (currentTime - lastDecodeTime > 500) {
            noNewFrameCount++
          } else {
            noNewFrameCount = 0
          }

          // 如果超过3次检查都没有新帧,认为解码完成
          if (noNewFrameCount >= 3) {
            if (!isDecoderClosed) {
              isDecoderClosed = true
              decoder.close()
              // 按时间戳排序
              decodedFrames.sort((a, b) => a.timestamp - b.timestamp)
              resolve(decodedFrames)
            }
            return
          }
        }

        setTimeout(checkDecodeComplete, 200)
      }

      // 创建解码器
      const decoder = new VideoDecoder({
        // 输出解码后的帧
        output: async (frame) => {
          try {
            const imageBitmap = await createImageBitmap(frame)
            decodedFrames.push({
              imageBitmap,
              // 将微秒转换为秒
              duration: frame.duration / 1000000,
              timestamp: frame.timestamp / 1000000,
            })

            frame.close()
            lastDecodeTime = Date.now()
          } catch (error) {
            console.warn("Failed to create bitmap:", error)
            frame.close()
          }
        },
        
        // 错误处理
        error: (error) => {
          if (!isDecoderClosed) {
            isDecoderClosed = true
            decoder.close()
            reject(new Error(error.message))
          }
        },
      })

      // 配置解码器
      decoder.configure({
        codec: config.codec,
        codedWidth: config.codedWidth,
        codedHeight: config.codedHeight,
        description: config.description
      })

      // 分批处理样本
      const BATCH_SIZE = 30
      let currentBatch = 0

      const processBatch = () => {
        const start = currentBatch * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, samples.length)

        if (start >= samples.length) {
          return
        }

        for (let i = start; i < end; i++) {
          const sample = samples[i]
          try {
            // 将sample的时间从timescale单位转换为微秒
            const microsPerTimeScale = 1000000 / timescale
            decoder.decode(
              new EncodedVideoChunk({
                type: sample.is_sync ? "key" : "delta",
                timestamp: sample.cts * microsPerTimeScale,
                duration: sample.duration * microsPerTimeScale,
                data: sample.data,
              })
            )
          } catch (error) {
            console.warn(`Failed to decode frame ${i}:`, error)
          }
        }

        currentBatch++

        // 如果解码器还在运行,继续处理下一批
        if (decoder.state === "configured" && !isDecoderClosed) {
          setTimeout(processBatch, 0)
        }
      }

      // 开始处理
      processBatch()
      checkDecodeComplete()
    })
  }
}

export type DecodeWorker = typeof worker
expose(worker, self)
