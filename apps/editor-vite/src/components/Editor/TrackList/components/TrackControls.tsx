import {
  HiEye,
  HiEyeSlash,
  HiLockClosed,
  HiLockOpen,
  HiOutlineTrash,
} from "react-icons/hi2";

interface TrackControlsProps {
  visible: boolean;
  locked: boolean;
  onVisibilityChange: () => void;
  onLockChange: () => void;
  onDelete: () => void;
}

export const TrackControls: React.FC<TrackControlsProps> = ({
  visible,
  locked,
  onVisibilityChange,
  onLockChange,
  onDelete,
}) => {
  return (
    <div className="flex h-full w-full items-center justify-center gap-1 rounded-md bg-neutral-100 p-2">
      <button
        onClick={onVisibilityChange}
        className="flex h-6 w-6 items-center justify-center hover:text-sky-500"
      >
        {visible ? <HiEye /> : <HiEyeSlash />}
      </button>

      <button
        onClick={onLockChange}
        className="flex h-6 w-6 items-center justify-center hover:text-sky-500"
      >
        {locked ? <HiLockClosed /> : <HiLockOpen />}
      </button>

      <button
        onClick={onDelete}
        className="flex h-6 w-6 items-center justify-center hover:text-sky-500"
      >
        <HiOutlineTrash />
      </button>
    </div>
  );
};
