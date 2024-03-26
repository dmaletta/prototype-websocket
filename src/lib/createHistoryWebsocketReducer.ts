import createWebsocketReducer, {
    createWebsocketState,
    isWebsocketAction,
    WebsocketAction,
    WebsocketReducerConfig,
    WebsocketState
} from "./createWebsocketReducer.ts";
import createHistoryReducer, {
    ActionReverter,
    createHistoryState,
    HistoryReducerConfig,
    HistoryState, isHistoryAction,
} from "./createHistoryReducer.ts";
import {Reducer} from "react";

export function createHistoryWebsocketState<State extends object, Action extends object, Selection>(initState: State, selection: Selection): State & WebsocketState<Action, Selection> & HistoryState<Action, Selection> {
    return createHistoryState(createWebsocketState(initState), selection);
}

type HistoryWebsocketReducerConfig<State extends object, Action extends object, Selection, SelectionAction> = {
    history: HistoryReducerConfig<State, Action, Selection, SelectionAction>
    websocket: WebsocketReducerConfig<Action, Selection, SelectionAction>
}

export default function createHistoryWebsocketReducer<State extends object, Action extends object, Selection, SelectionAction>
(reducer: Reducer<State, Action>, config: HistoryWebsocketReducerConfig<State, Action, Selection, SelectionAction>) {
    const {history: historyConfig, websocket: websocketConfig} = config

    const createRevertAction: ActionReverter<State & WebsocketState<Action, Selection>, Action | WebsocketAction<State, Action, Selection, SelectionAction>> = (prevState, action) => {
        if (isWebsocketAction(action)) {
            return null;
        }

        return historyConfig.createRevertAction(prevState, action);
    }

    const isSelectionAction = (action: Action | SelectionAction | WebsocketAction<State, Action, Selection, SelectionAction>): action is SelectionAction => {
        return !isWebsocketAction(action) && historyConfig.isSelectionAction(action);
    }

    const historyConfigWithWebsocket: HistoryReducerConfig<State & WebsocketState<Action, Selection>, Action | WebsocketAction<State, Action, Selection, SelectionAction>, Selection, SelectionAction> = {
        ...historyConfig,
        createRevertAction,
        isSelectionAction
    };

    const wsReducer = createWebsocketReducer<State, Action, Selection, SelectionAction>(reducer, websocketConfig);
    const historyReducer = createHistoryReducer<State & WebsocketState<Action, Selection>, Action | WebsocketAction<State, Action, Selection, SelectionAction>, Selection, SelectionAction>(wsReducer, historyConfigWithWebsocket);

    const combinedReducer: typeof historyReducer & { connect: (typeof wsReducer)['connect'] } = (state, action) => {
        if (!isHistoryAction(action) && !isWebsocketAction(action) && historyConfig.isSelectionAction(action)) {
            wsReducer(state, action);
        }

        return historyReducer(state, action);
    }

    combinedReducer.connect = wsReducer.connect;

    return combinedReducer;
}