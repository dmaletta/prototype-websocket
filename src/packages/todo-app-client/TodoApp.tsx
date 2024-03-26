import {Dispatch, useEffect, useReducer, useRef, useState} from 'react'
import {
    createTodoState,
    isTodoSelectionAction,
    SelectionAction,
    Todo,
    TodoAction,
    todoActionReverter,
    todoReducer,
    TodoSelection,
    todoSelectionReducer,
    TodoState
} from "../todo-app-shared";
import {
    createHistoryWebsocketReducer,
    createHistoryWebsocketState,
    HistoryButtonGroup,
    HistoryReducerConfig,
    useHistoryKeyPress,
    WebsocketClientList,
    WebsocketReducerConfig
} from "../history-websocket-client";
import {Button, Card, Container, Form, InputGroup, ListGroup} from "react-bootstrap";
import {BsPrefixRefForwardingComponent} from "react-bootstrap/helpers";
import {createWebsocket, generateUuid} from "../common-util";

const historyConfig: HistoryReducerConfig<TodoState, TodoAction, TodoSelection, SelectionAction> = {
    createRevertAction: todoActionReverter,
    selectionReducer: todoSelectionReducer,
    isSelectionAction: isTodoSelectionAction
};

const websocketConfig: WebsocketReducerConfig<TodoAction, TodoSelection, SelectionAction> = {
    createWebsocket: () => {
        return createWebsocket('/ws/todo');
    },
    selectionReducer: todoSelectionReducer,
    isSelectionAction: isTodoSelectionAction
}

const appReducer = createHistoryWebsocketReducer(todoReducer, {
    history: historyConfig,
    websocket: websocketConfig
});

const appState = createHistoryWebsocketState<TodoState, TodoAction, TodoSelection>(createTodoState(), undefined);

function TodoView({dispatch, todo, selected, locked}: {
    dispatch: Dispatch<TodoAction | SelectionAction>,
    todo: Todo,
    selected: boolean,
    locked: boolean
}) {
    const inputRef = useRef<HTMLInputElement & BsPrefixRefForwardingComponent<"input">>(null)

    useEffect(() => {
        const textarea = inputRef.current;

        if (!textarea) {
            return;
        }

        if (selected && document.activeElement !== textarea) {
            textarea.focus();
        }
        if (!selected && document.activeElement === textarea) {
            textarea.blur();
        }
    }, [selected]);

    const focus = () => {
        console.log('focus');
        if (!selected) {
            dispatch({type: 'todo-select', todoId: todo.id});
        }
    }

    const blur = () => {
        console.log('blur');
        if (selected) {
            dispatch({type: 'clear-select'});
        }
    }

    return (
        <InputGroup>
            <Form.Control<"input"> type="text" ref={inputRef} disabled={locked} onFocus={focus} onBlur={blur}
                                   value={todo.todo}
                                   onChange={(e => dispatch({
                                       type: 'todo-update',
                                       id: todo.id,
                                       todo: e.target.value
                                   }))}/>
            <Button disabled={locked} variant="danger"
                    onClick={() => dispatch({type: 'todo-remove', id: todo.id})}>Delete</Button>
        </InputGroup>
    );
}

function TodoAdd({dispatch}: { dispatch: Dispatch<TodoAction> }) {
    const [text, setText] = useState('');

    return (
        <InputGroup>
            <Form.Control value={text} onChange={(e => setText(e.target.value))}/>
            <Button variant="success" disabled={text === ''}
                    onClick={() => {
                        dispatch({type: 'todo-add', todo: {id: generateUuid(), todo: text}, position: 0})
                        setText('');
                    }}>Add
            </Button>
        </InputGroup>
    );
}

export default function TodoApp() {
    const [state, dispatch] = useReducer(appReducer, appState);

    useEffect(() => {
        return appReducer.connect(dispatch);
    }, [dispatch]);

    useHistoryKeyPress(state, dispatch);

    if (!state['@websocket'].connected) {
        return <div>not connected</div>
    }

    const isLocked = (todoId: string) => {
        return state['@websocket'].clientIds.some(clientId => {
            if (clientId === state['@websocket'].clientId) return false;

            return state['@websocket'].selections[clientId] === todoId;
        })
    }

    return (
        <Container>
            <WebsocketClientList className="mb-2" state={state}/>
            <Card>
                <Card.Header>
                    <HistoryButtonGroup className="mb-2" state={state} dispatch={dispatch}/>
                </Card.Header>
                <ListGroup variant="flush">
                    <ListGroup.Item>
                        <TodoAdd dispatch={dispatch}/>
                    </ListGroup.Item>
                    {state.ids.map(id => {
                        const locked = isLocked(id);
                        return <ListGroup.Item disabled={locked} active={state['@selection'] === id}
                                               key={id}><TodoView dispatch={dispatch}
                                                                  selected={state['@selection'] === id}
                                                                  locked={locked}
                                                                  todo={state.map[id]}/></ListGroup.Item>
                    })}
                </ListGroup>
            </Card>
        </Container>
    );
}