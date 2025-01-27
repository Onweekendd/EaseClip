"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { Editor as EditorSDK } from "@video-editor/core";

import ElementList from "./ElementList/ElementList";
import PropertyEditor from "./PropertyEditor";
import Renderer from "./Renderer/Renderer";
import TrackList from "./TrackList/TrackList";
import { EditorContext, ReducerEditorState, editorStateReducer } from "./index";

const Editor = () => {
  const [editor, setEditor] = useState<EditorSDK | null>(null);
  const [state, dispatch] = useReducer(editorStateReducer, {
    activeVideoId: "",
    videos: [],
    filesName: [],
    unitTime: 500,
    unitPixelOfTime: 50,
    tracks: [],
    fps: 24,
    currentTime: 0,
  });
  const storeRef = useRef(new ReducerEditorState(state, dispatch));

  useEffect(() => {
    const editor = new EditorSDK(storeRef.current);
    setEditor(editor);
  }, []);

  useEffect(() => {
    storeRef.current.syncState(state);
  }, [state]);

  if (!editor) return <div>Loading...</div>;

  return (
    <EditorContext.Provider value={editor}>
      <div className="flex h-full w-full flex-col gap-2 bg-neutral-200 p-2">
        <div className="flex h-[57%] w-full flex-row gap-2">
          <div className="h-full flex-1 rounded-md bg-white">
            <ElementList />
          </div>
          <div className="box-border h-full flex-1 rounded-md bg-white p-1">
            <Renderer />
          </div>
          <div className="h-full flex-1 rounded-md bg-white">
            <PropertyEditor />
          </div>
        </div>

        <div className="flex-1 rounded-md bg-white">
          <TrackList />
        </div>
      </div>
    </EditorContext.Provider>
  );
};

export default Editor;
