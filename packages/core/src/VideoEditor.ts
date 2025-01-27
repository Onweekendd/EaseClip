import { CommandManager } from "./CommandManager.ts";
import { EditorState } from "./EditorState.js";
import { Renderer } from "./Renderer.ts";
import { TimeManager } from "./TimeManager.ts";
import { VideoProcess } from "./VideoProcess.ts";
import { VideoClip } from "./elements/clip/VideoClip.ts";

class Editor {
  timeManager: TimeManager;
  videoProcess: VideoProcess;
  commandManager: CommandManager;
  renderer?: Renderer;
  state: EditorState;

  constructor(state: EditorState) {
    this.state = state;

    this.videoProcess = new VideoProcess({
      state: this.state,
    });

    this.timeManager = new TimeManager(this.state, this.videoProcess);
    this.commandManager = new CommandManager();    
  }

  initRenderer({
    width,
    height,
    onVideoPlay,
  }: {
    width: number;
    height: number;
    onVideoPlay: (videoClip: VideoClip, currentTime: number) => void;
  }) {
    this.renderer = new Renderer({
      state: this.state,
      width,
      height,
      onVideoPlay,
    });

    this.timeManager.setRenderer(this.renderer);
  }
}

export { Editor };
