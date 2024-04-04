import {Dispatch, ReducerAction, ReducerState, useEffect, useMemo, useReducer, useRef} from "react";
import {Editable, Slate, withReact} from "slate-react";
import {BaseOperation, createEditor, Editor, Operation, Selection, SelectionOperation} from "slate";
import {generateUuid, getWebsocketUrl, useDebounce} from "../common-util";
import {
    createSlateSelection,
    createSlateState,
    CustomElement,
    isSlateSelectionAction,
    reduceSlateSelection,
    reduceSlateState,
    revertSlateAction,
    SlateAction,
    SlateSelection,
    SlateSelectionAction,
    SlateState
} from "../slate-app-shared";
import {
    createHistoryWebsocketReducer,
    createHistoryWebsocketState,
    HistoryButtonGroup,
    isWebsocketConnected,
    useHistoryKeyPress,
    useWebsocket,
    WebsocketClientList,
    WebsocketConnectionAlert,
} from "../history-websocket-client";
import {Alert, ButtonToolbar, Card, Container} from "react-bootstrap";

const Rte = ({dispatch, state}: {
    dispatch: Dispatch<ReducerAction<typeof slateReducer>>,
    state: ReducerState<typeof slateReducer>
}) => {
    const editor = useMemo(() => withReact(createEditor()), []);
    const editorId = useMemo(() => generateUuid(), []);
    const ref = useRef(false);
    const refOperations = useRef<BaseOperation[]>([]);
    const {nodes, lastUpdated} = state;

    useEffect(() => {
        if (lastUpdated !== editorId) {
            ref.current = true;
            resetNodes(editor, nodes, state['@selection']);
        }
    }, [editor, editorId, lastUpdated, nodes, state]);

    const flush = useDebounce(() => {
        const selectionOperations: SelectionOperation[] = [];
        const mutationOperations: Exclude<BaseOperation, SelectionOperation>[] = [];

        refOperations.current.forEach(operation => {
            if (Operation.isSelectionOperation(operation)) {
                selectionOperations.push(operation);
            } else {
                mutationOperations.push(operation);
            }
        })

        refOperations.current = [];
        if (mutationOperations.length) {
            dispatch({type: 'operation', editorId, operations: mutationOperations});
        }
        if (selectionOperations.length || mutationOperations.length) {
            dispatch({type: 'select', selection: editor.selection})
        }
    }, 300);

    return useMemo(() => (
        <Slate editor={editor} initialValue={state.nodes} onChange={() => {
            if (ref.current) {
                ref.current = false;
                return;
            }
            refOperations.current.push(...editor.operations);
            flush();
        }}>
            <Editable onBlur={() => dispatch({type: 'select', selection: null})}/>
        </Slate>
    ), [dispatch, editor, flush, state.nodes]);
};

const slateReducer = createHistoryWebsocketReducer<SlateState, SlateAction, SlateSelection, SlateSelectionAction>(reduceSlateState, {
    createRevertAction: revertSlateAction,
    selectionReducer: reduceSlateSelection,
    isSelectionAction: isSlateSelectionAction,
});

const initState = createHistoryWebsocketState<SlateState, SlateAction, SlateSelection>(createSlateState(), createSlateSelection());

export default function SlateApp() {
    const [state, dispatch] = useReducer(slateReducer, initState);
    useWebsocket({websocketUrl: getWebsocketUrl('/ws/slate'), state, dispatch});
    useHistoryKeyPress(state, dispatch);

    if (!isWebsocketConnected(state)) {
        return <WebsocketConnectionAlert state={state}/>
    }

    return (
        <Container>
            <WebsocketClientList className="mb-2" state={state}/>
            <Card>
                <Card.Header>
                    <ButtonToolbar>
                        <HistoryButtonGroup state={state} dispatch={dispatch}/>
                    </ButtonToolbar>
                </Card.Header>
                <Card.Body>
                    <Rte dispatch={dispatch} state={state}/>
                </Card.Body>
            </Card>
            <Alert className="mt-2">{JSON.stringify(state.nodes)}</Alert>
        </Container>
    );
}

function resetNodes(editor: Editor, nodes: CustomElement[], selection: Selection): void {
    const children = [...editor.children];
    Editor.withoutNormalizing(editor, () => {
        children.forEach((node) => editor.apply({type: 'remove_node', path: [0], node}))
        nodes.forEach((node, i) => editor.apply({type: 'insert_node', path: [i], node: node}))
    });

    editor.selection = selection;
    Editor.normalize(editor);
}

