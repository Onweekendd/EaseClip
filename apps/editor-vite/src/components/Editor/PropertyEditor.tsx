import { useContext } from "react";

import { EditorContext } from ".";

const PropertyEditor = () => {
  const editor = useContext(EditorContext);

  const videos = editor?.state.getVideos();
  const activeVideo = videos?.find(
    (video) => video.id === editor?.state.getActiveVideoId(),
  );

  return (
    <div className="h-full w-full p-4">
      {activeVideo && (
        <div className="flex flex-col gap-4">
          <div className="text-sm font-medium">视频信息</div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <span className="w-20 text-sm text-gray-500">名称:</span>
              <span className="text-sm">{activeVideo.name}</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-sm text-gray-500">时长:</span>
              <span className="text-sm">{activeVideo.duration}秒</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-sm text-gray-500">宽度:</span>
              <span className="text-sm">{activeVideo.width}像素</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-sm text-gray-500">高度:</span>
              <span className="text-sm">{activeVideo.height}像素</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-sm text-gray-500">帧率:</span>
              <span className="text-sm">{activeVideo.frameRate}fps</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-sm text-gray-500">文件大小:</span>
              <span className="text-sm">
                {(activeVideo.fileSize / 1024 / 1024).toFixed(2)}MB
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyEditor;
