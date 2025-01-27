import { HiOutlinePause, HiOutlinePlay } from "react-icons/hi";

interface PlayControlProps {
  isPlaying: boolean;
  onPlayPause: () => void;
}

const PlayControl = ({ isPlaying, onPlayPause }: PlayControlProps) => {
  return (
    <div className="flex h-8 items-center justify-center border-t border-gray-200 bg-white pt-1">
      <button
        onClick={onPlayPause}
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
      >
        {isPlaying ? (
          <HiOutlinePause className="h-6 w-6 text-sky-500" />
        ) : (
          <HiOutlinePlay className="h-6 w-6 text-sky-500" />
        )}
      </button>
    </div>
  );
};

export default PlayControl;
