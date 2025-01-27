import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Image } from "konva/lib/shapes/Image";
import { Image as KonvaImage, Layer, Stage } from "react-konva";

import { VideoClip } from "@video-editor/core";

import { EditorContext } from "..";
import PlayControl from "../components/PlayControl";

const Renderer = () => {
  const editor = useContext(EditorContext)!;

  const tracks = editor.state.getTracks();
  const currentTime = editor.state.getCurrentTime();

  const renderVideoClips = useMemo(
    () =>
      tracks
        .map((track) => track.getRenderElementsAtTime(currentTime))
        .flat()
        .filter((element) => element !== null && element instanceof VideoClip),
    [tracks, currentTime],
  );

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const videoToElement = useRef<
    Map<string, { canvas?: Image; imageBitmap?: ImageBitmap }>
  >(new Map());

  const onVideoPlay = useCallback(
    (videoClip: VideoClip, currentTime: number) => {
      const elements = videoToElement.current.get(videoClip.id);
      if (!elements?.canvas) return;

      const findFrameStartTime = performance.now();

      // 找到当前时间对应的帧
      const currentFrame = videoClip.resource?.videoFrame.find(
        (frame) =>
          frame.timestamp <= currentTime &&
          (frame.duration ?? 0) + frame.timestamp > currentTime,
      );

      const findFrameEndTime = performance.now();

      if (currentFrame) {
        // 获取帧的序号
        const frameIndex = videoClip.resource?.videoFrame.indexOf(currentFrame);

        const drawStartTime = performance.now();

        videoToElement.current.set(videoClip.id, {
          ...videoToElement.current.get(videoClip.id),
          imageBitmap: currentFrame.imageBitmap,
        });

        // 更新画布
        elements.canvas.getLayer()?.batchDraw();

        const drawEndTime = performance.now();

        console.log(
          `Current Time: ${currentTime.toFixed(3)}s\n`,
          `Frame ${frameIndex} (Duration: ${(currentFrame.duration ?? 0).toFixed(3)}s) Performance Metrics:\n`,
          `Find Frame Time: ${(findFrameEndTime - findFrameStartTime).toFixed(2)}ms\n`,
          `Draw Frame Time: ${(drawEndTime - drawStartTime).toFixed(2)}ms\n`,
          `Total Time: ${(drawEndTime - findFrameStartTime).toFixed(2)}ms`,
        );
      }
    },
    [],
  );

  useEffect(() => {
    editor.initRenderer({
      width: canvasContainerRef.current?.clientWidth ?? 0,
      height: canvasContainerRef.current?.clientHeight ?? 0,
      onVideoPlay,
    });
  }, [editor, onVideoPlay]);

  // useEffect(() => {
  //   const newMap = new Map<
  //     string,
  //     { canvas?: Image; imageBitmap?: ImageBitmap }
  //   >();

  //   const findFrameStartTime = performance.now();

  //   renderVideoClips.forEach((videoClip) => {
  //     if (!videoClip.resource?.videoFrame) return;

  //     // 直接使用解码阶段生成的ImageBitmap
  //     const currentFrame = videoClip.resource.videoFrame.find(
  //       (frame) =>
  //         frame.timestamp <= currentTime &&
  //         frame.timestamp + (frame.duration ?? 0) > currentTime,
  //     );

  //     const findFrameEndTime = performance.now();

  //     if (currentFrame) {
  //       const frameIndex = videoClip.resource.videoFrame.indexOf(currentFrame);

  //       const drawStartTime = performance.now();

  //       newMap.set(videoClip.id, {
  //         canvas: videoToElement.current.get(videoClip.id)?.canvas,
  //         imageBitmap: currentFrame.imageBitmap,
  //       });

  //       const drawEndTime = performance.now();

  //       console.log(
  //         `Frame ${frameIndex} Performance Metrics (useEffect):\n`,
  //         `Find Frame Time: ${(findFrameEndTime - findFrameStartTime).toFixed(2)}ms\n`,
  //         `Draw Frame Time: ${(drawEndTime - drawStartTime).toFixed(2)}ms\n`,
  //         `Total Time: ${(drawEndTime - findFrameStartTime).toFixed(2)}ms`,
  //       );
  //     }
  //   });

  //   videoToElement.current = newMap;
  // }, [currentTime, renderVideoClips]);

  const [isPlaying, setIsPlaying] = useState(false);
  const onPlayPause = useCallback(() => {
    if (!isPlaying) {
      editor.timeManager.startPlay();
      setIsPlaying(true);
    } else {
      editor.timeManager.stopPlay();
      setIsPlaying(false);
    }
  }, [isPlaying, editor.timeManager]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="w-full flex-1" ref={canvasContainerRef}>
        <Stage
          width={canvasContainerRef.current?.clientWidth ?? 0}
          height={canvasContainerRef.current?.clientHeight ?? 0}
        >
          <Layer>
            {renderVideoClips?.map(
              (videoClip) =>
                videoClip.resource && (
                  <KonvaImage
                    draggable
                    key={videoClip.id}
                    x={videoClip.x}
                    y={videoClip.y}
                    width={videoClip.renderWidth}
                    height={videoClip.renderHeight}
                    ref={(node) => {
                      if (node && videoClip.resource) {
                        videoToElement.current.set(videoClip.id, {
                          ...videoToElement.current.get(videoClip.id),
                          canvas: node,
                        });
                      }
                    }}
                    image={
                      videoToElement.current.get(videoClip.id)?.imageBitmap
                    }
                  />
                ),
            )}
          </Layer>
        </Stage>
      </div>

      <PlayControl isPlaying={isPlaying} onPlayPause={onPlayPause} />
    </div>
  );
};

export default Renderer;
