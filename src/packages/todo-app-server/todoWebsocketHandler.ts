import {createWebsocketHandler} from "../history-websocket-server";
import {createTodoState, TodoAction, todoReducer, TodoSelection, TodoState} from "./../todo-app-shared";

export default createWebsocketHandler<TodoState, TodoAction, TodoSelection>({
    reducer: todoReducer,
    initState: createTodoState(),
    initialSelection: undefined
});