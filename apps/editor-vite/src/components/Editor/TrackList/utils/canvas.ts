/**
 * 绘制主刻度线
 * @param ctx - Canvas 2D渲染上下文
 * @param x - 刻度线的x坐标
 * @param height - 画布高度
 */
export const drawMainScale = (
  ctx: CanvasRenderingContext2D,
  x: number,
  height: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x, height);
  ctx.lineTo(x, height / 2);
  ctx.stroke();
};

/**
 * 绘制时间刻度和标签
 * @param ctx - Canvas 2D渲染上下文
 * @param x - 刻度线的x坐标
 * @param time - 时间值（毫秒）
 * @param height - 画布高度
 */
export const drawTimeScale = (
  ctx: CanvasRenderingContext2D,
  x: number,
  time: number,
  height: number,
) => {
  drawMainScale(ctx, x, height);
  const label = formatTimeLabel(time);
  ctx.fillText(label, x, height / 7);
};

/**
 * 绘制小刻度线
 * @param ctx - Canvas 2D渲染上下文
 * @param x - 起始x坐标
 * @param unitPixel - 单位像素长度
 * @param height - 画布高度
 */
export const drawSubScales = (
  ctx: CanvasRenderingContext2D,
  x: number,
  unitPixel: number,
  height: number,
) => {
  const subUnitPixel = unitPixel / 5;
  for (let j = 1; j < 5; j++) {
    const subX = x + j * subUnitPixel;
    ctx.beginPath();
    ctx.moveTo(subX, height);
    ctx.lineTo(subX, (height * 2) / 3);
    ctx.stroke();
  }
};

/**
 * 格式化时间标签
 * @param time - 时间值（毫秒）
 * @returns 格式化后的时间字符串，例如："1s" 或 "1.5s"
 */
export const formatTimeLabel = (time: number): string => {
  const seconds = time / 1000;
  return Number.isInteger(seconds) ? `${seconds}s` : seconds.toFixed(1) + "s";
};

/**
 * 设置画布样式
 * @param ctx - Canvas 2D渲染上下文
 * @param fontSize - 字体大小（像素）
 */
export const setupCanvasStyle = (
  ctx: CanvasRenderingContext2D,
  fontSize: number,
) => {
  ctx.strokeStyle = "#94a3b8";
  ctx.fillStyle = "#000000";
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = 1;
};
