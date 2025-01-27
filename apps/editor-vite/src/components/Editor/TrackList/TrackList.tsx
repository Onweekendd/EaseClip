import { useContext } from "react";

import type { Track } from "@video-editor/core";

import { EditorContext } from "../index";
import { TimeLine } from "./components/TimeLine";
import { TrackControls } from "./components/TrackControls";

const TrackList = () => {
  const editor = useContext(EditorContext)!;
  const tracks = editor.state.getTracks();

  const onTrackLockChange = (trackId: string) => {
    const tracksWithUpdatedLock = tracks.map((track) => {
      if (track.id === trackId) {
        track.locked = !track.locked;
      }
      return track;
    });
    editor.state.setTracks(tracksWithUpdatedLock);
  };

  const onTrackVisibilityChange = (trackId: string) => {
    const tracksWithUpdatedVisibility = tracks.map((track) => {
      if (track.id === trackId) {
        track.visible = !track.visible;
      }
      return track;
    });
    editor.state.setTracks(tracksWithUpdatedVisibility);
  };

  const onTrackDelete = (trackId: string) => {
    const tracksWithoutDeleted = tracks.filter((track) => track.id !== trackId);
    editor.state.setTracks(tracksWithoutDeleted);
  };

  return (
    <div className="box-border flex h-full w-full items-center gap-2">
      <div className="flex h-full w-[8%] flex-col justify-center gap-2 border-r border-sky-200">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="box-border flex h-20 items-center justify-between px-2"
          >
            <TrackControls
              visible={track.visible}
              locked={track.locked}
              onVisibilityChange={() => onTrackVisibilityChange(track.id)}
              onLockChange={() => onTrackLockChange(track.id)}
              onDelete={() => onTrackDelete(track.id)}
            />
          </div>
        ))}
      </div>

      <div className="relative ml-4 flex h-full flex-1 flex-col justify-center gap-2">
        <div className="absolute left-0 top-0 h-[8%] w-full">
          <TimeLine fontSize={9} />
        </div>
        {tracks.map((track) =>
          track.renderElements.map((renderElement) => (
            <div key={renderElement.id} className="flex h-20 items-center">
              {renderElement.id}
            </div>
          )),
        )}
      </div>
    </div>
  );
};

export default TrackList;
