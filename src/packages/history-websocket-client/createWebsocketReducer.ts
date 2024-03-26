import {Dispatch, Reducer} from "react";
import {getObjectUuid} from "./../common-util";
import {WebsocketMessage, WebsocketActionMessage} from "../history-websocket-shared";

export type WebsocketMessageAction<State extends object, Action, Selection, SelectionAction> = {
    type: '@websocket/message',
    message: WebsocketMessage<State, Action, Selection, SelectionAction>
}

export type WebsocketCloseAction = {
    type: '@websocket/close'
}

export type WebsocketState<Action, Selection> = {
    '@websocket': {
        sending: WebsocketActionMessage<Action>[],
        connected: boolean
        clientId?: string
        clientIds: string[]
        selections: {
            [clientId: string]: Selection | undefined
        }
    }
}

export type WebsocketAction<State extends object, Action, Selection, SelectionAction> =
    WebsocketMessageAction<State, Action, Selection, SelectionAction>
    | WebsocketCloseAction;

export function createWebsocketState<State extends object, Action, Selection>(state: State): State & WebsocketState<Action, Selection> {
    return {
        ...state,
        '@websocket': {
            sending: [],
            connected: false,
            clientIds: [],
            selections: {}
        }
    }
}

export function isWebsocketAction<State extends object, Action, Selection, SelectionAction>(action: Action | WebsocketAction<State, Action, Selection, SelectionAction>): action is WebsocketAction<State, Action, Selection, SelectionAction> {
    return typeof action === 'object' && ['@websocket/message', '@websocket/close'].includes((action as {
        type: string
    }).type);
}

export function createWebsocketMessageAction<S extends object, A, Selection, SelectionAction>(message: WebsocketMessage<S, A, Selection, SelectionAction>): WebsocketMessageAction<S, A, Selection, SelectionAction> {
    return {type: "@websocket/message", message};
}

export type WebsocketFactory = () => WebSocket;

export type WebsocketReducerConfig<Action, Selection, SelectionAction> = {
    createWebsocket: WebsocketFactory
    selectionReducer: Reducer<Selection, SelectionAction>
    isSelectionAction: (action: Action|SelectionAction) => action is SelectionAction
}

export type Connector<State extends object, Action, Selection, SelectionAction> = (dispatch: Dispatch<Action | WebsocketAction<State, Action, Selection, SelectionAction>>) => void

export default function createWebsocketReducer<State extends object, Action extends object, Selection, SelectionAction>(
    reducer: Reducer<State, Action>,
    config: WebsocketReducerConfig<Action, Selection, SelectionAction>):
    Reducer<
        State & WebsocketState<Action, Selection>,
        Action | WebsocketAction<State, Action, Selection, SelectionAction> | SelectionAction
    > & { connect: Connector<State, Action, Selection, SelectionAction> } {

    const {createWebsocket, selectionReducer, isSelectionAction} = config;
    let websocket: WebSocket
    let reconnectedTimeout: ReturnType<typeof setTimeout> | undefined;
    const sendActionIds = new Set<string>();
    const connect = (dispatch: Dispatch<Action | WebsocketAction<State, Action, Selection, SelectionAction>>): () => void => {
        websocket = createWebsocket();
        websocket.onclose = () => {
            if (!reconnectedTimeout) {
                dispatch({'type': '@websocket/close'});
            }

            reconnectedTimeout = setTimeout(() => {
                connect(dispatch);
            }, 1000);
        }
        websocket.onopen = () => {
            reconnectedTimeout = undefined;
        }

        websocket.onmessage = (event) => {
            //@todo needs validation
            const message: WebsocketMessage<State, Action, Selection, SelectionAction> = JSON.parse(event.data.toString());
            console.log('received message:', message);
            dispatch(createWebsocketMessageAction(message));
        }

        return () => {
            clearTimeout(reconnectedTimeout);
            reconnectedTimeout = undefined;
            websocket.onclose = () => {
            };

            websocket.close();
        }
    }

    const send = (sendId: string, message: WebsocketMessage<State, Action, Selection, SelectionAction>) => {
        if (!sendActionIds.has(sendId)) {
            sendActionIds.add(sendId);
            setTimeout(() => {
                websocket.send(JSON.stringify(message));
            });
        }
    }


    const websocketReducer = (
        state: State & WebsocketState<Action, Selection>,
        action: Action | WebsocketAction<State, Action, Selection, SelectionAction> | SelectionAction
    ): State & WebsocketState<Action, Selection> => {

        if (typeof websocket === 'undefined') {
            throw new Error('You need to call connect');
        }

        const {sending, clientId} = state['@websocket'];

        if (isWebsocketAction(action)) {
            if (action.type === "@websocket/message") {
                const {message} = action;

                switch (message.type) {
                    case "action":
                        if (typeof clientId === 'undefined') {
                            throw new Error('Init connection missing');
                        }

                        sendActionIds.delete(message.actionId);

                        if (message.clientId === clientId) {
                            const sendingNext = sending.filter(message => {
                                return message.actionId !== message.actionId;
                            });

                            return {...state, "@websocket": {...state['@websocket'], sending: sendingNext}};
                        } else {
                            return {...reducer(state, message.action), '@websocket': state['@websocket']};
                        }
                    case "init":
                        return {
                            ...message.state,
                            '@websocket': {...state['@websocket'], connected: true, clientId: message.clientId, clientIds: message.clientIds, selections: message.selections}
                        };

                    case "connected": {
                        const {selections, clientIds} = state['@websocket'];
                        const nextSelection = {...selections};
                        nextSelection[message.clientId] = undefined;

                        return {
                            ...state,
                            '@websocket': {
                                ...state['@websocket'],
                                clientIds: [...clientIds, message.clientId],
                                selections: nextSelection
                            }
                        }
                    }

                    case "close": {
                        const {selections, clientIds} = state['@websocket'];
                        const nextSelection = {...selections};
                        delete nextSelection[message.clientId];

                        return {
                            ...state,
                            '@websocket': {
                                ...state['@websocket'],
                                clientIds: clientIds.filter(id => id !== message.clientId),
                                selections: nextSelection
                            }
                        }
                    }

                    case "selection": {
                        const {selections, clientIds} = state['@websocket'];

                        return {
                            ...state,
                            '@websocket': {
                                ...state['@websocket'],
                                clientIds: clientIds,
                                selections: {...selections, [message.clientId]: selectionReducer(selections[message.clientId]!, message.action)}
                            }
                        }
                    }
                }
            } else {
                return {
                    ...state,
                    '@websocket': {...state['@websocket'], clientId: undefined, connected: false}
                };
            }
        } else if(isSelectionAction(action)) {
            if (typeof clientId === 'undefined') {
                throw new Error('Init connection missing');
            }

            if (typeof action !== 'object') {
                throw new Error('selection action must be an object');
            }


            const actionId = getObjectUuid(action as object);
            send(actionId, {type: 'selection', clientId, action, actionId: actionId});

            return state;
        } else {
            if (typeof clientId === 'undefined') {
                throw new Error('Init connection missing');
            }

            const actionId = getObjectUuid(action);
            const message: WebsocketActionMessage<Action> = {type: 'action', action, clientId, actionId};
            send(actionId, message);

            return {
                ...state, ...reducer(state, action), '@websocket': {
                    ...state['@websocket'], sending: [...state['@websocket'].sending, message]
                }
            };
        }
    };

    websocketReducer.connect = connect;

    return websocketReducer;
}


