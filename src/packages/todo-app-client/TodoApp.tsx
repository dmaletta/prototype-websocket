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
    isWebsocketConnected,
    useHistoryKeyPress,
    WebsocketClientList,
    WebsocketConnectionAlert,
} from "../history-websocket-client";
import {Button, Card, Container, Form, InputGroup, ListGroup} from "react-bootstrap";
import {BsPrefixRefForwardingComponent} from "react-bootstrap/helpers";
import {createWebsocket, generateUuid} from "../common-util";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faMinus, faPlus} from "@fortawesome/free-solid-svg-icons";

const appReducer = createHistoryWebsocketReducer(todoReducer, {
    createWebsocket: () => {
        return createWebsocket('/ws/todo');
    },
    createRevertAction: todoActionReverter,
    selectionReducer: todoSelectionReducer,
    isSelectionAction: isTodoSelectionAction

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
            <Button disabled={locked} variant="danger" onClick={() => dispatch({type: 'todo-remove', id: todo.id})}>
                <FontAwesomeIcon icon={faMinus}/>
            </Button>
        </InputGroup>
    );
}

function TodoAdd({dispatch}: { dispatch: Dispatch<TodoAction> }) {
    const [text, setText] = useState('');

    const submit = () => {
        dispatch({type: 'todo-add', todo: {id: generateUuid(), todo: text}, position: 0})
        setText('');
    }

    return (
        <InputGroup>
            <Form.Control onKeyDown={e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                }
            }} value={text} onChange={(e => setText(e.target.value))}/>
            <Button variant="success" disabled={text === ''} onClick={submit}><FontAwesomeIcon icon={faPlus}/></Button>
        </InputGroup>
    );
}

export default function TodoApp() {
    const [state, dispatch] = useReducer(appReducer, appState);

    useEffect(() => {
        return appReducer.connect(dispatch);
    }, [dispatch]);

    useHistoryKeyPress(state, dispatch);

    if (!isWebsocketConnected(state)) {
        return <WebsocketConnectionAlert state={state}/>
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
                    <HistoryButtonGroup state={state} dispatch={dispatch}/>
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