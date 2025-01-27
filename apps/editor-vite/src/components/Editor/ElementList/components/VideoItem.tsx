import { useContext } from "react";

import clsx from "clsx";
import { HiMiniPlus } from "react-icons/hi2";

import type { Video } from "@video-editor/core";

import { EditorContext } from "../..";

// 处理中状态组件
const ProcessingVideo = () => (
  <div className="group relative flex w-full flex-1 flex-col items-center justify-center rounded-md bg-gray-100">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-sky-500" />
  </div>
);

// 完成状态组件
const FinishedVideo: React.FC<{
  video: Video;
  onAddClick: (e: React.MouseEvent) => void;
  onViewDetail: (video: Video) => void;
}> = ({ video, onAddClick, onViewDetail }) => (
  <div className="group relative flex w-full flex-1 items-center overflow-hidden rounded-md bg-gray-200">
    <div className="relative h-4/5 w-full" onClick={() => onViewDetail(video)}>
      <img
        className="object-fit h-full w-full"
        src={video.cover}
        alt={video.name}
        fill
      />
    </div>

    <button
      onClick={onAddClick}
      className={clsx(
        "absolute bottom-1 right-2 flex h-5 w-5 items-center justify-center rounded-full",
        "bg-sky-500 text-white",
        "transition-all duration-200",
        "opacity-0 group-hover:opacity-100",
      )}
    >
      <HiMiniPlus className="h-4 w-4" />
    </button>

    <div className="absolute right-2 top-2">
      <span className="rounded bg-black/70 px-1 py-0.5 text-[10px] text-white">
        {video.duration}s
      </span>
    </div>
  </div>
);

// 错误状态组件
const ErrorVideo = () => (
  <div className="flex h-full w-full items-center justify-center rounded-md bg-gray-100">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-red-500" />
  </div>
);

interface VideoItemProps {
  video: Video;
  onViewDetail: (video: Video) => void;
}

const VideoItem: React.FC<VideoItemProps> = ({ video, onViewDetail }) => {
  const editor = useContext(EditorContext)!;

  const onAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    editor.timeManager.addVideoToTrack(video);
  };

  return (
    <div className="box-border flex h-full w-full flex-col">
      {video.status === "processing" && <ProcessingVideo />}
      {video.status === "finished" && (
        <FinishedVideo
          video={video}
          onAddClick={onAddClick}
          onViewDetail={onViewDetail}
        />
      )}
      {video.status === "error" && <ErrorVideo />}

      <div className="flex w-full">
        <span className="line-clamp-1 text-xs text-neutral-400">
          {video.name}
        </span>
      </div>
    </div>
  );
};

export default VideoItem;
