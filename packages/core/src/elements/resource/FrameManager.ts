import { DecodedFrame } from "./Video.js";

// 新增帧管理类，实现关注点分离
export class FrameManager {
  // 使用Map实现O(1)时间复杂度的帧查找
  private frameMap = new Map<number, DecodedFrame>();
  // 维护有序时间戳数组实现快速范围查询
  private timestamps: number[] = [];

  // 添加帧（线程安全）
  addFrames(frames: DecodedFrame[]) {
    frames.forEach((frame) => {
      if (!this.frameMap.has(frame.timestamp)) {
        this.frameMap.set(frame.timestamp, frame);
        // 使用二分查找插入位置，保持有序性
        const index = this.findInsertIndex(frame.timestamp);
        this.timestamps.splice(index, 0, frame.timestamp);
      }
    });
  }

  // 获取指定时间范围内的帧（用于播放/渲染）
  getFrames(start: number, end: number): DecodedFrame[] {
    const startIdx = this.findInsertIndex(start);
    const endIdx = this.findInsertIndex(end);
    return this.timestamps
      .slice(startIdx, endIdx)
      .map((ts) => this.frameMap.get(ts)!);
  }

  // 二分查找插入位置
  private findInsertIndex(timestamp: number): number {
    let low = 0,
      high = this.timestamps.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.timestamps[mid] < timestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  // 内存清理
  releaseFrames(start: number, end: number) {
    this.timestamps
      .filter((ts) => ts >= start && ts <= end)
      .forEach((ts) => {
        this.frameMap.get(ts)?.imageBitmap.close();
        this.frameMap.delete(ts);
      });
    this.timestamps = this.timestamps.filter((ts) => ts < start || ts > end);
  }
}
