import {Dispatch, useEffect, useMemo, useReducer, useRef} from "react";
import {Editable, Slate, withReact} from "slate-react";
import {createEditor, Editor, NodeOperation, Operation, TextOperation} from "slate";
import {createWebsocket, generateUuid, useDebounce} from "../common-util";
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
    HistoryReducerConfig,
    isWebsocketConnected,
    useHistoryKeyPress,
    WebsocketClientList,
    WebsocketConnectionAlert,
    WebsocketReducerConfig
} from "../history-websocket-client";
import {Alert, ButtonToolbar, Card, Container} from "react-bootstrap";

const Rte = ({dispatch, state}: { dispatch: Dispatch<SlateAction>, state: SlateState }) => {
    const editor = useMemo(() => withReact(createEditor()), []);
    const editorId = useMemo(() => generateUuid(), []);
    const ref = useRef(false);
    const refOperations = useRef<(TextOperation | NodeOperation)[]>([]);

    const {lastUpdated} = state;
    if (editorId !== lastUpdated) {
        ref.current = true;
        const {nodes} = state;
        resetNodes(editor, nodes);
    }

    const flush = useDebounce(() => {
        const operations = refOperations.current;
        refOperations.current = [];
        dispatch({type: 'operation', editorId, operations});
    }, 300);

    return useMemo(() => (
        <Slate editor={editor} initialValue={state.nodes} onChange={() => {
            if (ref.current) {
                ref.current = false;
                return;
            }
            const operations = editor.operations.filter(operation => !Operation.isSelectionOperation(operation)) as (TextOperation | NodeOperation)[];
            refOperations.current.push(...operations);
            flush();
        }}>
            <Editable/>
        </Slate>
    ), [editor, flush, state.nodes]);
};

const historyConfig: HistoryReducerConfig<SlateState, SlateAction, SlateSelection, SlateSelectionAction> = {
    createRevertAction: revertSlateAction,
    selectionReducer: reduceSlateSelection,
    isSelectionAction: isSlateSelectionAction
};

const websocketConfig: WebsocketReducerConfig<SlateAction, SlateSelection, SlateSelectionAction> = {
    createWebsocket: () => {
        return createWebsocket('/ws/slate');
    },
    selectionReducer: reduceSlateSelection,
    isSelectionAction: isSlateSelectionAction,
}

const reducer = createHistoryWebsocketReducer<SlateState, SlateAction, SlateSelection, SlateSelectionAction>(reduceSlateState, {
    history: historyConfig,
    websocket: websocketConfig
});

const initState = createHistoryWebsocketState<SlateState, SlateAction, SlateSelection>(createSlateState(), createSlateSelection());

export default function SlateApp() {
    const [state, dispatch] = useReducer(reducer, initState);

    useEffect(() => {
        return reducer.connect(dispatch);
    }, [dispatch]);

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

function resetNodes(editor: Editor, nodes: CustomElement[]): void {
    const children = [...editor.children];
    Editor.withoutNormalizing(editor, () => {
        children.forEach((node) => editor.apply({type: 'remove_node', path: [0], node}))
        nodes.forEach((node, i) => editor.apply({type: 'insert_node', path: [i], node: node}))
    });

    // editor.selection = selection;
    Editor.normalize(editor);
}

