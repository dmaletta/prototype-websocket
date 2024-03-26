import {createWebsocketHandler} from "../history-websocket-server";
import {
    createTodoState,
    isTodoSelectionAction,
    SelectionAction,
    TodoAction,
    todoReducer,
    TodoSelection,
    todoSelectionReducer,
    TodoState
} from "./../todo-shared";

export default createWebsocketHandler<TodoState, TodoAction, TodoSelection, SelectionAction>({
    reducer: todoReducer,
    initState: createTodoState(),
    initialSelection: undefined,
    reduceSelection: todoSelectionReducer,
    isSelectionAction: isTodoSelectionAction
});