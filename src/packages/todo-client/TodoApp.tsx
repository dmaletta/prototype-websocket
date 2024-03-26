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
} from "../todo-shared";
import {
    createHistoryWebsocketReducer,
    createHistoryWebsocketState,
    hasRedo,
    hasUndo,
    HistoryReducerConfig,
    redo,
    undo,
    useHistoryKeyPress,
    WebsocketClientList,
    WebsocketReducerConfig
} from "../history-websocket-client";
import {v4 as uuidv4} from "uuid";
import {Button, ButtonToolbar, Card, Container, Form, InputGroup, ListGroup} from "react-bootstrap";
import {BsPrefixRefForwardingComponent} from "react-bootstrap/helpers";
import {faRotateLeft, faRotateRight} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {createWebsocket} from "../common-util";

const historyConfig: HistoryReducerConfig<TodoState, TodoAction, TodoSelection, SelectionAction> = {
    createRevertAction: todoActionReverter,
    selectionReducer: todoSelectionReducer,
    isSelectionAction: isTodoSelectionAction
};

const websocketConfig: WebsocketReducerConfig<TodoAction, TodoSelection, SelectionAction> = {
    createWebsocket: () => {
        return createWebsocket('/websocket/todo');
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
                        dispatch({type: 'todo-add', todo: {id: uuidv4(), todo: text}, position: 0})
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
            <WebsocketClientList state={state}/>

            <Card>
                <Card.Header>Todos</Card.Header>
                <Card.Body>
                    <ButtonToolbar className="mb-2">
                        <Button disabled={!hasUndo(state)} className="me-2" onMouseDown={(e) => {
                            e.preventDefault();
                            undo(dispatch);
                        }}><FontAwesomeIcon icon={faRotateLeft}/>
                        </Button>
                        <Button disabled={!hasRedo(state)} onMouseDown={(e) => {
                            e.preventDefault();
                            {
                                redo(dispatch);
                            }
                        }}><FontAwesomeIcon icon={faRotateRight}/>
                        </Button>
                    </ButtonToolbar>

                    <hr/>

                    <TodoAdd dispatch={dispatch}/>
                    <ListGroup variant="flush" className="mt-3">
                        {state.ids.map(id => {
                            const locked = isLocked(id);
                            return <ListGroup.Item disabled={locked} active={state['@selection'] === id}
                                                   key={id}><TodoView dispatch={dispatch}
                                                                      selected={state['@selection'] === id}
                                                                      locked={locked}
                                                                      todo={state.map[id]}/></ListGroup.Item>
                        })}
                    </ListGroup>
                </Card.Body>
            </Card>
        </Container>
    );
}