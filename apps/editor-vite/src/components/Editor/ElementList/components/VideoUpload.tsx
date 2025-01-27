import { FC } from "react";

interface VideoUploadProps {
  onChange: (file: File) => void;
}

const VideoUpload: FC<VideoUploadProps> = ({ onChange }) => {
  return (
    <div
      className="flex cursor-pointer items-center justify-center rounded-md bg-sky-500 px-2 py-1 text-white transition-colors hover:bg-sky-600"
      onClick={() => {
        document.getElementById("video-upload")?.click();
      }}
    >
      <input
        type="file"
        accept="video/*"
        className="hidden"
        id="video-upload"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            // 处理视频文件
            onChange(file);
          }
        }}
      />
      <span className="text-nowrap text-xs font-semibold">上传视频</span>
    </div>
  );
};

export default VideoUpload;
