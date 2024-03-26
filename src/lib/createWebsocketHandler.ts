import {WebSocket} from "ws";
import {v4 as uuidv4} from "uuid";
import {WebsocketMessage} from "./createWebsocketReducer.ts";
import {Reducer} from "react";

type HandlerConfig<State extends object, Action extends object, Selection, SelectionAction> = {
    reducer: Reducer<State, Action>,
    initState: State,
    reduceSelection: Reducer<Selection, SelectionAction>,
    initialSelection: Selection
    isSelectionAction: (action: Action | SelectionAction) => action is SelectionAction
}

export default function createWebsocketHandler<State extends object, Action extends object, Selection, SelectionAction>(config: HandlerConfig<State, Action, Selection, SelectionAction>): (ws: WebSocket) => void {
    const {reducer, initState, initialSelection, reduceSelection,} = config;

    const clients = new Map<string, WebSocket>();
    let state = initState;
    const selections: { [key: string]: Selection } = {};

    const broadcast = (message: WebsocketMessage<State, Action, Selection, SelectionAction>) => {
        clients.forEach(ws => {
            send(ws, message);
        });
    }
    const send = (ws: WebSocket, message: WebsocketMessage<State, Action, Selection, SelectionAction>) => {
        ws.send(JSON.stringify(message));
    }

    return (ws: WebSocket) => {
        ws.on('error', console.error);

        ws.on('message', (data) => {
            //todo needs validation
            const message: WebsocketMessage<State, Action, Selection, SelectionAction> = JSON.parse(data.toString());

            switch (message.type) {
                case "action": {
                    console.log('received message', message);
                    const nextState = reducer(state, message.action);

                    if (!nextState) {
                        console.error('reducer did not return a state', {message});
                        break;
                    }

                    state = nextState;
                    broadcast(message);
                    break;
                }
                case "selection": {
                    const selection = selections[message.clientId];
                    selections[message.clientId] = reduceSelection(selection, message.action);
                    broadcast(message);
                    break;
                }
            }
        });

        ws.on('close', () => {
            clients.forEach((w, clientId) => {
                if (w === ws) {
                    console.log('remove client id', clientId);
                    clients.delete(clientId);
                    delete selections[clientId];
                    broadcast({type: 'close', clientId});
                }
            })
        });

        const clientId = uuidv4();
        broadcast({type: 'connected', clientId});

        clients.set(clientId, ws);
        selections[clientId] = initialSelection;

        send(ws, {type: 'init', clientId, state, clientIds: Array.from(clients.keys()), selections});
    }
}