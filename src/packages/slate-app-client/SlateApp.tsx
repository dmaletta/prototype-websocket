import React, {
    Dispatch,
    ReactNode,
    ReducerAction,
    ReducerState,
    useEffect,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState
} from "react";
import {Editable, Slate, useSlate, withReact,} from "slate-react";
import {BaseOperation, BaseRange, createEditor, Editor, Operation, Range, Selection, SelectionOperation} from "slate";
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
import {Alert, ButtonToolbar, Card, Container, Overlay, Tooltip, TooltipProps} from "react-bootstrap";
import {ErrorBoundary} from "react-error-boundary";
import getDomRects from "./getDomRects.ts";
import {ClientMap} from "../history-websocket-shared";

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

    const clientId = state["@websocket"].clientId;
    const clientIds = state["@websocket"].clientIds;
    const clientMap = state["@websocket"].clientMap;

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

    return (
        <Slate key={editorId} editor={editor} initialValue={state.nodes} onChange={() => {
            if (ref.current) {
                ref.current = false;
                return;
            }
            refOperations.current.push(...editor.operations);
            flush();
        }}>
            <Selections clientIds={clientIds} clientMap={clientMap} clientId={clientId}>
                <ErrorBoundary onError={handleSelectionError} fallback={null}>
                    <Editable onBlur={() => dispatch({type: 'select', selection: null})}/>
                </ErrorBoundary>
            </Selections>
        </Slate>
    );
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

type SelectionsProps = {
    clientId?: string,
    clientIds: string[],
    clientMap: ClientMap<Selection>,
    children: ReactNode
}

function Selections({clientId, clientMap, clientIds, children}: SelectionsProps) {
    const ref = useRef<HTMLDivElement>(null);
    const parent = ref.current;

    return (
        <div className="position-relative" ref={ref}>
            {children}
            <div>
                {parent ? clientIds.map(id => {
                    const selection = clientMap[id].selection;
                    if (!selection || id === clientId) {
                        return null;
                    }

                    return <ClientSelection clientId={id} key={id} selection={selection}
                                            parent={parent.getBoundingClientRect()}/>
                }) : null}
            </div>
        </div>
    );
}

type ClientSelectionProps = {
    clientId: string
    parent: DOMRect,
    selection: BaseRange
}

function ClientSelection({selection, parent, clientId}: ClientSelectionProps) {
    const editor = useSlate();
    const ref = useRef<HTMLDivElement>(null);

    const rects = getDomRects(editor, selection);
    let renderRects: ReactNode[] = []

    if (Range.isCollapsed(selection) && rects.length) {
        renderRects.push(
            <div
                ref={ref}
                style={{
                    position: 'absolute',
                    top: rects[0].top - parent.top,
                    left: rects[0].left - parent.left - 1,
                    width: 3,
                    height: rects[0].height,
                    backgroundColor: 'rgba(0, 0, 255, 0.75)',
                    pointerEvents: 'none',
                }}
            />
        );
    } else {
        renderRects = rects.map((rect, index) => (
            <div
                ref={index === 0 ? ref : undefined}
                key={index}
                style={{
                    position: 'absolute',
                    top: rect.top - parent.top,
                    left: rect.left - parent.left,
                    width: rect.width,
                    height: rect.height,
                    backgroundColor: 'rgba(0, 0, 255, 0.5)',
                    pointerEvents: 'none',
                }}
            />
        ));
    }

    return <>
        {renderRects}
        <Overlay target={ref.current} show={true} placement="top">
            <OverlayTooltip selection={selection}>{clientId}</OverlayTooltip>
        </Overlay>
    </>;
}

const OverlayTooltip = React.forwardRef<HTMLDivElement, TooltipProps & { selection: Selection }>(
    ({selection, children, popper, ...props}, ref) => {
        useLayoutEffect(() => {
            if (popper && popper.scheduleUpdate) {
                popper.scheduleUpdate();
            }
        }, [selection, popper]);

        return (
            <Tooltip ref={ref} {...props}>
                {children}
            </Tooltip>
        );
    }
);