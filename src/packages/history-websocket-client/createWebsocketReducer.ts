import {Reducer} from "react";
import {getObjectUuid} from "./../common-util";
import {ActionEntry, ClientMap, WebsocketMessage} from "../history-websocket-shared";

export type WebsocketSentMessageAction<State extends object, Action, Selection> = {
    type: '@websocket/sent',
    message: WebsocketMessage<State, Action, Selection>
}

export type WebsocketReceivedMessageAction<State extends object, Action, Selection> = {
    type: '@websocket/received',
    message: WebsocketMessage<State, Action, Selection>
}

export type WebsocketCloseAction = {
    type: '@websocket/close'
}

export type WebsocketState<Action, Selection> = {
    '@selection': Selection,
    '@websocket': {
        queue: ActionEntry<Action>[],
        sending: ActionEntry<Action>[],
        connected: boolean
        clientId?: string
        clientIds: string[]
        clientMap: ClientMap<Selection>
    }
}

export type WebsocketAction<State extends object, Action, Selection> =
    WebsocketSentMessageAction<State, Action, Selection> |
    WebsocketReceivedMessageAction<State, Action, Selection>
    | WebsocketCloseAction;

export function createWebsocketState<State extends object, Action, Selection>(initState: State, initSelection: Selection): State & WebsocketState<Action, Selection> {
    return {
        ...initState,
        '@selection': initSelection,
        '@websocket': {
            queue: [],
            sending: [],
            connected: false,
            clientIds: [],
            clientMap: {}
        }
    }
}

export function isWebsocketAction<State extends object, Action, Selection>(action: Action | WebsocketAction<State, Action, Selection>): action is WebsocketAction<State, Action, Selection> {
    return typeof action === 'object' && ['@websocket/sent', '@websocket/received', '@websocket/close'].includes((action as {
        type: string
    }).type);
}

export type WebsocketReducerConfig<Action, Selection, SelectionAction> = {
    selectionReducer: Reducer<Selection, SelectionAction>
    isSelectionAction: (action: Action | SelectionAction) => action is SelectionAction
}

type MessageHandlerProps<State, Action, Selection> = {
    state: State & WebsocketState<Action, Selection>,
    message: WebsocketMessage<State, Action, Selection>,
    reducer: Reducer<State, Action>
}

function handleMessage<State, Action, Selection>(
    {state, message, reducer}: MessageHandlerProps<State, Action, Selection>) {

    const {clientId} = state['@websocket'];

    switch (message.type) {
        case "action": {
            const clientMap = state['@websocket'].clientMap;
            const nextClientMap = {
                ...clientMap,
                [message.clientId]: {...clientMap[message.clientId], selection: message.selection}
            };
            const nextState = {...state, '@websocket': {...state['@websocket'], clientMap: nextClientMap}}

            return message.entries.reduce((state, entry) => {
                const {action, id} = entry;

                //remove from sent list if message is from same client
                if (message.clientId === clientId) {
                    let {sending} = state['@websocket'];
                    sending = sending.filter(sent => id !== sent.id);
                    return {...state, ...reducer(state, action), '@websocket': {...state['@websocket'], sending}};
                } else {
                    return {...state, ...reducer(state, action)};
                }
            }, nextState);
        }
        case "init":
            return {
                ...state,
                ...message.state,
                '@websocket': {
                    ...state['@websocket'],
                    connected: true,
                    clientId: message.clientId,
                    clientIds: Array.from(Object.keys(message.clientMap)),
                    clientMap: message.clientMap
                }
            };
        case "connected": {
            const {clientMap, clientIds} = state['@websocket'];
            const nextClientMap = {...clientMap};
            nextClientMap[message.client.id] = message.client;

            return {
                ...state,
                '@websocket': {
                    ...state['@websocket'],
                    clientIds: [...clientIds, message.client.id],
                    clientMap: nextClientMap
                }
            }
        }
        case "close": {
            const {clientMap, clientIds} = state['@websocket'];
            const nextClientMap = {...clientMap};
            delete nextClientMap[message.clientId];

            return {
                ...state,
                '@websocket': {
                    ...state['@websocket'],
                    clientIds: clientIds.filter(id => id !== message.clientId),
                    clientMap: nextClientMap
                }
            }
        }
    }
}

export default function createWebsocketReducer<State extends object, Action extends object, Selection, SelectionAction>(
    reducer: Reducer<State, Action>,
    config: WebsocketReducerConfig<Action, Selection, SelectionAction>):
    Reducer<
        State & WebsocketState<Action, Selection>,
        Action | WebsocketAction<State, Action, Selection> | SelectionAction
    > {

    const {isSelectionAction, selectionReducer} = config;

    return (state: State & WebsocketState<Action, Selection>, action: Action | WebsocketAction<State, Action, Selection> | SelectionAction): State & WebsocketState<Action, Selection> => {
        console.log('action: ', action);

        if (isWebsocketAction(action)) {
            switch (action.type) {
                case "@websocket/received": {
                    const {message} = action;
                    return handleMessage({state, message, reducer});
                }
                case "@websocket/sent": {
                    const {message} = action;
                    if (message.type !== 'action') {
                        return state;
                    }

                    const sending = [...state['@websocket'].sending];
                    let queue = [...state['@websocket'].queue];

                    message.entries.forEach(entry => {
                        sending.push(entry);
                        queue = queue.filter(q => q.id !== entry.id);
                    })

                    return {...state, '@websocket': {...state['@websocket'], sending, queue}};
                }
                case "@websocket/close":
                    return {
                        ...state,
                        '@websocket': {...state['@websocket'], clientId: undefined, connected: false}
                    };
            }
        } else if (isSelectionAction(action)) {
            return {
                ...state, '@selection': selectionReducer(state['@selection'], action)
            };
        } else {
            return {
                ...reducer(state, action), '@selection': state['@selection'], '@websocket': {
                    ...state['@websocket'], queue: [...state['@websocket'].queue, {
                        action, id: getObjectUuid(action as object)
                    }]
                }
            };
        }
    }
}