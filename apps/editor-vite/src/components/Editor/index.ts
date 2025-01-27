import { createContext } from "react";
import { Editor as EditorSDK, EditorState, State } from "@video-editor/core";

type EditorStateAction = {
  type: "setState";
  payload: Partial<State>;
};
export function editorStateReducer(state: State, action: EditorStateAction) {
  switch (action.type) {
    case "setState":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export class ReducerEditorState extends EditorState {
  private dispatch: React.Dispatch<EditorStateAction>;
  private state: State;

  constructor(state: State, dispatch: React.Dispatch<EditorStateAction>) {
    super();
    this.state = state;
    this.dispatch = dispatch;
  }

  setState(data: Partial<State>): void {
    this.dispatch({
      type: "setState",
      payload: data,
    });
    this.state = {
      ...this.state,
      ...data,
    };
  }

  getState(): State {
    return this.state;
  }

  syncState(state: State) {
    this.state = state;
  }
}

export const EditorContext = createContext<EditorSDK | null>(null);
