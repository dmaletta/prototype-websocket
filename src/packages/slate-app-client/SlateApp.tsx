import {
    Dispatch,
    ReducerAction,
    ReducerState,
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState
} from "react";
import {Editable, RenderLeafProps, Slate, withReact,} from "slate-react";
import {BaseOperation, createEditor, Editor, Operation, Selection, SelectionOperation, Range} from "slate";
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
import {ErrorBoundary} from "react-error-boundary";

const Rte = ({dispatch, state}: {
    dispatch: Dispatch<ReducerAction<typeof slateReducer>>,
    state: ReducerState<typeof slateReducer>
}) => {
    const editor = useMemo(() => withReact(createEditor()), []);
    const [editorId, setEditorId] = useState(generateUuid());
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

    const currentClientId = state["@websocket"].clientId;
    const clientIds = state["@websocket"].clientIds;
    const clientMap = state["@websocket"].clientMap;

    const decorate = useCallback((): Range[] => {
        return clientIds.flatMap(clientId => {
            const selection = clientMap[clientId].selection;

            if(!selection || currentClientId === clientId) {
                return [];
            }

            const range: Range & {clientId: string} = {
                anchor: selection.anchor,
                focus: selection.focus,
                clientId
            };

            return [range];
        })
    }, [currentClientId, clientIds, clientMap]);

    return useMemo(() => {
            const handleSelectionError = (e: Error) => {
                if (editor.selection && e.message.includes('Cannot resolve a DOM point from Slate point')) {
                    dispatch({type: 'select', selection: null});
                    setTimeout(() => {
                        setEditorId(generateUuid());
                    })
                } else {
                    throw e;
                }
            };

            return <Slate key={editorId} editor={editor} initialValue={state.nodes} onChange={() => {
                if (ref.current) {
                    ref.current = false;
                    return;
                }
                refOperations.current.push(...editor.operations);
                flush();
            }}>
                <ErrorBoundary onError={handleSelectionError} fallback={null}>
                    <Editable decorate={decorate} onBlur={() => dispatch({type: 'select', selection: null})} renderLeaf={RteLeaf} />
                </ErrorBoundary>
            </Slate>
        }
        , [decorate, editorId, dispatch, editor, flush, state.nodes]);
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

function RteLeaf({attributes, children, leaf}: RenderLeafProps) {
    const inside = leaf.clientId ? <span className="position-relative">
          <span
              contentEditable={false}
              className="position-absolute top-0 bottom-0"
              style={{backgroundColor: 'red', width: 1, opacity: 0.2}}
          />
          <span
              contentEditable={false}
              className="position-absolute text-white p-1 text-nowrap top-0 rounded"
              style={{
                  opacity: 0.2,
                  backgroundColor: 'red',
                  transform: 'translateY(-100%)',
              }}
          >
            {leaf.clientId}
          </span>
        {children}
        </span> : children


    return <span {...attributes}>{inside}</span>;
}