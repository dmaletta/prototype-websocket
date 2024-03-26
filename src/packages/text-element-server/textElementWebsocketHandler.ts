import {createWebsocketHandler} from "../history-websocket-server";
import {
    createTextElementState,
    isTextElementSelectionAction,
    reduceTextElement,
    reduceTextElementSelection,
    TextElementAction,
    TextElementSelection,
    TextElementState,
    TextSelectionAction
} from "../text-element-shared";

export default createWebsocketHandler<TextElementState, TextElementAction, TextElementSelection, TextSelectionAction>({
    reducer: reduceTextElement,
    initState: createTextElementState(),
    initialSelection: null,
    reduceSelection: reduceTextElementSelection,
    isSelectionAction: isTextElementSelectionAction
});