import React, {
    Dispatch,
    ReactNode,
    ReducerAction,
    ReducerState,
    RefObject,
    useEffect,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState
} from "react";
import {
    Editable,
    RenderElementProps,
    RenderLeafProps,
    Slate,
    useFocused,
    useSlate,
    useSlateSelection,
    useSlateStatic,
    withReact,
} from "slate-react";
import {BaseOperation, BaseRange, Editor, Operation, Range, Selection, SelectionOperation, Text} from "slate";
import {generateUuid, getWebsocketUrl, useDebounce} from "../common-util";
import {
    createSlateEditor,
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
import {
    Alert,
    Badge,
    Button,
    ButtonGroup,
    ButtonToolbar,
    Card,
    Container,
    FormControl,
    Overlay,
    Popover
} from "react-bootstrap";
import {ErrorBoundary} from "react-error-boundary";
import getDOMRects, {isDOMRectEqual} from "./getDOMRects.ts";
import {ClientMap} from "../history-websocket-shared";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {faBold, faCommentDots, faItalic, faUnderline} from "@fortawesome/free-solid-svg-icons";
import {VirtualElement} from "@restart/ui/usePopper";

const Rte = ({dispatch, state}: {
    dispatch: Dispatch<ReducerAction<typeof slateReducer>>,
    state: ReducerState<typeof slateReducer>
}) => {
    const editor = useMemo(() => withReact(createSlateEditor()), []);
    const [editorId, setEditorId] = useState(generateUuid());
    const ref = useRef(false);
    const refOperations = useRef<BaseOperation[]>([]);
    const {nodes, lastUpdated} = state;
    const containerRef = useRef<HTMLDivElement>(null);

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
    }, 150);

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
            <div ref={containerRef}>
                <OverlayToolbar containerRef={containerRef}/>
                <Selections clientIds={clientIds} clientMap={clientMap} clientId={clientId} containerRef={containerRef}>
                    <ErrorBoundary onError={handleSelectionError} fallback={null}>
                        <Editable onBlur={() => dispatch({type: 'select', selection: null})} renderLeaf={Leaf}
                                  renderElement={Element}/>
                    </ErrorBoundary>
                </Selections>
            </div>
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
    children: ReactNode,
    containerRef: RefObject<HTMLDivElement>
}

function Selections({clientId, clientMap, clientIds, children, containerRef}: SelectionsProps) {
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
                                            parent={parent.getBoundingClientRect()} containerRef={containerRef}/>
                }) : null}
            </div>
        </div>
    );
}

type ClientSelectionProps = {
    clientId: string
    parent: DOMRect,
    selection: BaseRange,
    containerRef: RefObject<HTMLDivElement>
}

function ClientSelection({selection, parent, clientId, containerRef}: ClientSelectionProps) {
    const editor = useSlate();
    const rects = getDOMRects(editor, selection);
    const first = rects[0] ?? null;
    const isCollapsed = Range.isCollapsed(selection);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const tooltip = tooltipRef.current;
        if (!tooltip) {
            return;
        }

        const {style, clientWidth, clientHeight} = tooltip;

        if (!first) {
            style.display = 'none';
            return;
        }


        style.display = 'block';
        style.top = `${first.top - parent.top - clientHeight}px`;
        style.left = `${first.left - parent.left - clientWidth / 2 + first.width / 2}px`;
    }, [first, parent.left, parent.top]);

    if (!first) {
        return null;
    }

    const target: VirtualElement = {
        getBoundingClientRect: () => {
            return first;
        }
    }

    return (
        <>
            <Overlay target={target} show={true} placement="top" container={containerRef.current}>
                {(props) => (
                    <Popover {...props}>
                        <Popover.Body>
                            {clientId}
                        </Popover.Body>
                    </Popover>
                )}
            </Overlay>
            {isCollapsed ? <div
                key='collapsed'
                className="position-absolute pe-none"
                style={{
                    top: first.top - parent.top,
                    left: first.left - parent.left - 1,
                    width: 3,
                    height: first.height,
                    backgroundColor: 'rgba(0, 0, 255, 0.75)',
                }}
            /> : rects.map((rect, index) => {
                return (
                    <div
                        className="position-absolute pe-none"
                        key={index}
                        style={{
                            top: rect.top - parent.top,
                            left: rect.left - parent.left,
                            width: rect.width,
                            height: rect.height,
                            backgroundColor: 'rgba(0, 0, 255, 0.5)',
                        }}
                    />
                );
            })
            }
        </>
    )
}

type Format = keyof Omit<Text, 'text'>;

const toggleMark = (editor: Editor, format: Format) => {
    const isActive = isMarkActive(editor, format)

    if (isActive) {
        Editor.removeMark(editor, format)
    } else {
        Editor.addMark(editor, format, true)
    }
}

const isMarkActive = (editor: Editor, format: Format) => {
    const marks = Editor.marks(editor);

    if (!marks) {
        return false;
    }

    return marks[format] === true;
}

const Leaf = ({attributes, children, leaf}: RenderLeafProps) => {

    return (
        <span
            {...attributes}
            style={{
                paddingLeft: leaf.text === '' ? 0.1 : undefined,
                fontWeight: leaf.bold ? 'bold' : undefined,
                textDecoration: leaf.underline ? 'underline' : undefined,
                fontStyle: leaf.italic ? 'italic' : undefined,
            }}
        >
      {children}
    </span>
    );
}

const FormatButton = ({format, icon}: { format: Format, icon: IconProp }) => {
    const editor = useSlate();
    return (
        <Button
            active={isMarkActive(editor, format)}
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMark(editor, format)
            }}
        >
            <FontAwesomeIcon icon={icon}/>
        </Button>
    )
}

const OverlayToolbar = React.memo(({containerRef}: { containerRef: RefObject<HTMLDivElement> }) => {
    const editor = useSlate();
    const selection = useSlateSelection();
    const focus = useFocused();
    const [target, setTarget] = useState<VirtualElement>();

    useLayoutEffect(() => {
        const timeout = setTimeout(() => {
            const first = editor.selection ? getDOMRects(editor, editor.selection)[0] : undefined;
            if (!first || !editor.selection || !focus) {
                setTarget(undefined);
                return;
            }
            setTarget(target => {
                if (target && isDOMRectEqual(target.getBoundingClientRect(), first)) {
                    return target;
                }

                return {
                    getBoundingClientRect: () => first
                }
            });
        }, 150);

        return () => clearTimeout(timeout);
    }, [focus, editor, selection]);


    return useMemo(() => {
        if (!target) {
            return null;
        }

        return (
            <Overlay target={target} show={!!target}
                     placement="top" container={containerRef.current}>
                {(props) => (
                    <Popover {...props} onClick={e => {
                        console.log('wait');
                        e.preventDefault();
                        e.stopPropagation();
                    }}>
                        <Popover.Body>
                            <ButtonToolbar>
                                <ButtonGroup>
                                    <FormatButton format="bold" icon={faBold}/>
                                    <FormatButton format="italic" icon={faItalic}/>
                                    <FormatButton format="underline" icon={faUnderline}/>
                                    <InsertTagButton/>
                                </ButtonGroup>
                            </ButtonToolbar>
                        </Popover.Body>
                    </Popover>
                )}
            </Overlay>
        );
    }, [target])
});


const InlineChromiumBugfix = () => (
    <span
        contentEditable={false}
        style={{
            fontSize: 0
        }}
    >
    {String.fromCodePoint(160) /* Non-breaking space */}
  </span>
)

function InsertTagButton() {
    const editor = useSlateStatic();
    const [value, setValue] = useState('');

    return (
        <ButtonGroup>
            <FormControl type="text" value={value} onChange={e => setValue(e.target.value)}/>
            <Button onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                editor.insertInsertTag(value ? value : 'tag')
            }}><FontAwesomeIcon icon={faCommentDots}/></Button>
        </ButtonGroup>
    );
}


function Element({element, attributes, children}: RenderElementProps) {
    switch (element.type) {
        case 'insert-tag':
            return (
                <span  {...attributes} contentEditable={false}>
                    <InlineChromiumBugfix/>
                    {children}
                    <Badge bg="secondary" contentEditable={false}>
                    {element.insertTag}
                    </Badge>
                    <InlineChromiumBugfix/>
                </span>
            );
        default:
            return <p {...attributes}>{children}</p>
    }
}