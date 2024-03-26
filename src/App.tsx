import {Dispatch, useEffect, useReducer, useRef, useState} from 'react'
import reducer, {
    State,
    Action,
    actionReverter,
    createState,
    Todo, Selection, reduceSelection, SelectionAction, isSelectionAction
} from "./reducer.ts";
import {
    hasRedo,
    hasUndo, HistoryReducerConfig,
    redo,
    undo,
    useHistoryKeyPress
} from "./lib/createHistoryReducer.ts";
import "./index.css";
import {v4 as uuidv4} from "uuid";
import {WebsocketReducerConfig} from "./lib/createWebsocketReducer.ts";
import createHistoryWebsocketReducer, {createHistoryWebsocketState} from "./lib/createHistoryWebsocketReducer.ts";

const historyConfig: HistoryReducerConfig<State, Action, Selection, SelectionAction> = {
    createRevertAction: actionReverter,
    selectionReducer: reduceSelection,
    isSelectionAction: isSelectionAction

};

const websocket = import.meta.env.PROD ? 'ws://' + window.location.host : 'ws://localhost';

const websocketConfig: WebsocketReducerConfig<Action, Selection, SelectionAction> = {
    createWebsocket: () => {
        return new window.WebSocket(websocket + '/multi-user-action');
    },
    selectionReducer: reduceSelection,
    isSelectionAction: isSelectionAction
}

const appReducer = createHistoryWebsocketReducer(reducer, {
    history: historyConfig,
    websocket: websocketConfig
});

const appState = createHistoryWebsocketState<State, Action, Selection>(createState(), undefined);


function TodoView({dispatch, todo, selected, locked}: {
    dispatch: Dispatch<Action | SelectionAction>,
    todo: Todo,
    selected: boolean,
    locked: boolean
}) {
    const refTextarea = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const textarea = refTextarea.current;

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
        <div style={selected ? {outline: '1px solid green'} : (locked ? {outline: '1px solid red'} : undefined)}>
            <textarea ref={refTextarea} onFocus={focus} onBlur={blur} value={todo.todo}
                      onChange={(e => dispatch({type: 'todo-update', id: todo.id, todo: e.target.value}))}/>
            <button onClick={() => dispatch({type: 'todo-remove', id: todo.id})}>Delete</button>
        </div>
    );
}

function TodoAdd({dispatch}: { dispatch: Dispatch<Action> }) {
    const [text, setText] = useState('');


    return (
        <>
            <textarea value={text} onChange={(e => setText(e.target.value))}/>
            <button disabled={text === ''}
                    onClick={() => {
                        dispatch({type: 'todo-add', todo: {id: uuidv4(), todo: text}, position: 0})
                        setText('');
                    }}>Add
            </button>
        </>
    );
}

export default function App() {
    const [state, dispatch] = useReducer(appReducer, appState);

    useEffect(() => {
        return appReducer.connect(dispatch);
    }, []);

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
        <div>
            Clients:
            <ul>
                {state['@websocket'].clientIds.map(clientId =>
                    <li style={clientId === state['@websocket'].clientId ? {color: 'green'} : undefined}
                        key={clientId}>{clientId}</li>
                )}
            </ul>

            <hr/>
            <button onMouseDown={(e) => {
                e.preventDefault();
                if (hasUndo(state)) {
                    undo(dispatch);
                }
            }}>Undo
            </button>
            <button onMouseDown={(e) => {
                e.preventDefault();

                if (hasRedo(state)) {
                    redo(dispatch);
                }
            }}>Redo
            </button>
            <hr/>
            <TodoAdd dispatch={dispatch}/>
            <hr/>
            <ul>
                {state.ids.map(id => {
                    return <li key={id}><TodoView dispatch={dispatch} selected={state['@selection'] === id}
                                                  locked={isLocked(id)}
                                                  todo={state.map[id]}/></li>
                })}
            </ul>
        </div>
    );
}