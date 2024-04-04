import {WebSocket} from "ws";
import {Reducer} from "react";
import {Client, ClientMap, WebsocketMessage} from "../history-websocket-shared";
import {generateUuid} from "../common-util";

type HandlerConfig<State extends object, Action extends object, Selection> = {
    reducer: Reducer<State, Action>,
    initState: State,
    initialSelection: Selection
}

export default function createWebsocketHandler<State extends object, Action extends object, Selection>(config: HandlerConfig<State, Action, Selection>): (ws: WebSocket) => void {
    const {reducer, initState, initialSelection} = config;

    const websocketMap = new Map<string, WebSocket>();
    let state = initState;
    const clientMap: ClientMap<Selection> = {};

    const broadcast = (message: WebsocketMessage<State, Action, Selection>) => {
        websocketMap.forEach(ws => {
            send(ws, message);
        });
    }
    const send = (ws: WebSocket, message: WebsocketMessage<State, Action, Selection>) => {
        ws.send(JSON.stringify(message));

    }

    return (ws: WebSocket) => {
        ws.on('error', console.error);

        ws.on('message', (data) => {
            //todo needs validation
            const message: WebsocketMessage<State, Action, Selection> = JSON.parse(data.toString());

            switch (message.type) {
                case "action": {
                    console.log('received message', message);
                    state = message.entries.reduce((state, entry) => {
                        const {action} = entry;
                        const nextState = reducer(state, action);

                        if (!nextState) {
                            console.error('reducer did not return a state', {message});
                            return state;
                        }

                        return nextState;
                    }, state)
                    clientMap[message.clientId].selection = message.selection;
                    broadcast(message);
                }
            }
        })

        ws.on('close', () => {
            websocketMap.forEach((w, clientId) => {
                if (w === ws) {
                    console.log('remove client id', clientId);
                    websocketMap.delete(clientId);
                    delete clientMap[clientId];
                    broadcast({type: 'close', clientId});
                }
            })
        });

        const client: Client<Selection> = {id: generateUuid(), selection: initialSelection};
        broadcast({type: 'connected', client});

        websocketMap.set(client.id, ws);
        clientMap[client.id] = client;

        send(ws, {type: 'init', clientId: client.id, state, clientMap});
    }
}