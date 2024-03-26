import {Dispatch, useEffect, useMemo, useReducer, useRef} from "react";
import {Editable, Slate, withReact} from "slate-react";
import {createEditor, Editor, NodeOperation, Operation, TextOperation} from "slate";
import {createWebsocket, useDebounce} from "../common-util";
import {
    createRevertTextAction,
    createTextElementSelection,
    createTextElementState,
    CustomElement,
    isTextElementSelectionAction,
    reduceTextElementSelection,
    TextElementAction,
    TextElementSelection,
    TextElementState,
    TextSelectionAction
} from "../text-element-shared";
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
import reducerTextElement from "../text-element-shared/reduceTextElement.ts";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faRotateLeft, faRotateRight} from "@fortawesome/free-solid-svg-icons";
import {Alert, Button, ButtonToolbar, Card, CardBody, Container} from "react-bootstrap";

const Rte = ({dispatch, state}: { dispatch: Dispatch<TextElementAction>, state: TextElementState }) => {
    const editor = useMemo(() => withReact(createEditor()), []);
    const ref = useRef(false);
    const refOperations = useRef<(TextOperation | NodeOperation)[]>([]);

    const {lastUpdater} = state;
    if (lastUpdater !== 'editor') {
        ref.current = true;
        const {nodes} = state;
        resetNodes(editor, nodes);
    }

    const flush = useDebounce(() => {
        const operations = refOperations.current;
        refOperations.current = [];
        dispatch({type: 'operation', byEditor: true, operations});
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

const historyConfig: HistoryReducerConfig<TextElementState, TextElementAction, TextElementSelection, TextSelectionAction> = {
    createRevertAction: createRevertTextAction,
    selectionReducer: reduceTextElementSelection,
    isSelectionAction: isTextElementSelectionAction
};

const websocketConfig: WebsocketReducerConfig<TextElementAction, TextElementSelection, TextSelectionAction> = {
    createWebsocket: () => {
        return createWebsocket('/websocket/text-element');
    },
    selectionReducer: reduceTextElementSelection,
    isSelectionAction: isTextElementSelectionAction,
}


const reducer = createHistoryWebsocketReducer<TextElementState, TextElementAction, TextElementSelection, TextSelectionAction>(reducerTextElement, {
    history: historyConfig,
    websocket: websocketConfig
});

const initState = createHistoryWebsocketState<TextElementState, TextElementAction, TextElementSelection>(createTextElementState(), createTextElementSelection());


export default function TextElementApp() {
    const [state, dispatch] = useReducer(reducer, initState);

    useEffect(() => {
        return reducer.connect(dispatch);
    }, [dispatch]);

    useHistoryKeyPress(state, dispatch);

    if (!state['@websocket'].connected) {
        return <Alert variant="danger">Not connected</Alert>
    }

    return (
        <Container className="mt-2">
            <WebsocketClientList state={state}/>
            <Alert className="mt-2">{state.nodes[0].children[0].text}</Alert>

            <ButtonToolbar className="mb-2">
                <Button className="me-2" disabled={!hasUndo(state)} onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    undo(dispatch);
                }}><FontAwesomeIcon icon={faRotateLeft}/>
                </Button>
                <Button disabled={!hasRedo(state)} onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    redo(dispatch)
                }}><FontAwesomeIcon icon={faRotateRight}/>
                </Button>
            </ButtonToolbar>
            <Card>
                <CardBody>
                    <Rte dispatch={dispatch} state={state}/>
                </CardBody>
            </Card>
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

