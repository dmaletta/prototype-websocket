import {createWebsocketHandler} from "../history-websocket-server";
import {createSlateState, reduceSlateState, SlateAction, SlateSelection, SlateState} from "../slate-app-shared";

export default createWebsocketHandler<SlateState, SlateAction, SlateSelection>({
    reducer: reduceSlateState,
    initState: createSlateState(),
    initialSelection: null,
});