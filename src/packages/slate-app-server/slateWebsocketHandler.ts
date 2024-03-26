import {createWebsocketHandler} from "../history-websocket-server";
import {
    createSlateState,
    isSlateSelectionAction,
    reduceSlateSelection,
    reduceSlateState,
    SlateAction,
    SlateSelection,
    SlateSelectionAction,
    SlateState
} from "../slate-app-shared";

export default createWebsocketHandler<SlateState, SlateAction, SlateSelection, SlateSelectionAction>({
    reducer: reduceSlateState,
    initState: createSlateState(),
    initialSelection: null,
    reduceSelection: reduceSlateSelection,
    isSelectionAction: isSlateSelectionAction
});