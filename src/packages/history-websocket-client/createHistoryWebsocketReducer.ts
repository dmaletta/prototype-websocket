import createWebsocketReducer, {
    createWebsocketState,
    isWebsocketAction,
    WebsocketAction,
    WebsocketReducerConfig,
    WebsocketState
} from "./createWebsocketReducer.ts";
import createHistoryReducer, {
    createHistoryState,
    HistoryReducerConfig,
    HistoryState,
    isHistoryAction,
} from "./createHistoryReducer.ts";
import {Reducer} from "react";

export function createHistoryWebsocketState<State extends object, Action extends object, Selection>(initState: State, selection: Selection): State & WebsocketState<Action, Selection> & HistoryState<Action, Selection> {
    return createHistoryState(createWebsocketState(initState), selection);
}

type HistoryWebsocketReducerConfig<State extends object, Action extends object, Selection, SelectionAction> =
    HistoryReducerConfig<State, Action, Selection, SelectionAction>
    & WebsocketReducerConfig<Action, Selection, SelectionAction>

export function isWebsocketConnected<Action, Selection>(state: WebsocketState<Action, Selection>) {
    return state['@websocket'].connected;
}

export default function createHistoryWebsocketReducer<State extends object, Action extends object, Selection, SelectionAction>
(reducer: Reducer<State, Action>, config: HistoryWebsocketReducerConfig<State, Action, Selection, SelectionAction>) {
    const websocketConfig: WebsocketReducerConfig<Action, Selection, SelectionAction> = {
        createWebsocket: config.createWebsocket,
        selectionReducer: config.selectionReducer,
        isSelectionAction: config.isSelectionAction
    };

    const historyConfig: HistoryReducerConfig<State & WebsocketState<Action, Selection>, Action | WebsocketAction<State, Action, Selection, SelectionAction>, Selection, SelectionAction> = {
        createRevertAction: (prevState, action) => {
            if (isWebsocketAction(action)) {
                return null;
            }

            return config.createRevertAction(prevState, action);
        },
        selectionReducer: config.selectionReducer,
        isSelectionAction: (action: Action | SelectionAction | WebsocketAction<State, Action, Selection, SelectionAction>): action is SelectionAction => {
            return !isWebsocketAction(action) && config.isSelectionAction(action);
        }
    };

    const websocketReducer = createWebsocketReducer<State, Action, Selection, SelectionAction>(reducer, websocketConfig);
    const historyReducer = createHistoryReducer<State & WebsocketState<Action, Selection>, Action | WebsocketAction<State, Action, Selection, SelectionAction>, Selection, SelectionAction>(websocketReducer, historyConfig);

    const combinedReducer: typeof historyReducer & {
        connect: (typeof websocketReducer)['connect']
    } = (state, action) => {
        if (!isHistoryAction(action) && !isWebsocketAction(action) && config.isSelectionAction(action)) {
            websocketReducer(state, action);
        }

        return historyReducer(state, action);
    }

    combinedReducer.connect = websocketReducer.connect;

    return combinedReducer;
}