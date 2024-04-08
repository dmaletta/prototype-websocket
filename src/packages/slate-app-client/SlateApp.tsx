import {Dispatch, useReducer} from "react";
import {getWebsocketUrl} from "../common-util";
import {
    createSlateSelection,
    createSlateState,
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
import {Alert, ButtonToolbar, Card, Container,} from "react-bootstrap";
import RichTextEditor, {RteAction, RteState} from "../rich-text-editor/RichTextEditor.tsx";

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

    const rteState: RteState = {
        selection: state['@selection'],
        nodes: state.nodes, lastUpdated: state.lastUpdated,
        remote: state['@websocket'].clientIds.flatMap(clientId => {
            const selection = state['@websocket'].clientMap[clientId].selection;
            if (state['@websocket'].clientId === clientId) {
                return [];
            }

            return [{client: clientId, selection}];
        })
    };
    const rteDispatch: Dispatch<RteAction> = (action) => {
        switch (action.type) {
            case "@rte/select":
                dispatch({type: 'select', selection: action.select});
                break;
            case "@rte/update":
                dispatch({type: 'operation', editorId: action.by, operations: action.ops});
                break;
        }
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
                    <RichTextEditor state={rteState} dispatch={rteDispatch}/>
                </Card.Body>
            </Card>
            <Alert className="mt-2">{JSON.stringify(state.nodes)}</Alert>
        </Container>
    );
}