import { useContext } from "react";

import type { Video } from "@video-editor/core";

import { EditorContext } from "../index";
import VideoItem from "./components/VideoItem";
import VideoUpload from "./components/VideoUpload";

const ElementList = () => {
  const editor = useContext(EditorContext);

  const onViewDetail = (video: Video) => {
    editor?.state.setActiveVideoId(video.id);
  };

  const onUpload = (file: File) => {
    editor?.videoProcess.onVideoUpload({
      file,
    });
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-4 border-b p-2">
        <div className="flex items-center gap-2">
          <VideoUpload onChange={onUpload} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-4">
          {editor?.state
            .getVideos()
            .map((video) => (
              <VideoItem
                key={video.id}
                video={video}
                onViewDetail={onViewDetail}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default ElementList;
