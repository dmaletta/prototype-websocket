import {Dispatch, useEffect, useState} from "react";
import {WebsocketActionMessage, WebsocketMessage} from "../history-websocket-shared";
import {WebsocketAction, WebsocketState} from "./createWebsocketReducer.ts";

export type WebsocketHookConfig<State extends object, Action, Selection> = {
    websocketUrl: string,
    state: State & WebsocketState<Action, Selection>,
    dispatch: Dispatch<Action | WebsocketAction<State, Action, Selection>>
}

export default function useWebsocket<State extends object, Action, Selection>({
                                                                                  websocketUrl,
                                                                                  state,
                                                                                  dispatch
                                                                              }: WebsocketHookConfig<State, Action, Selection>) {
    const [websocket, setWebsocket] = useState<WebSocket | undefined>()
    const {queue, clientId} = state["@websocket"];
    const selection = state['@selection'];

    useEffect(() => {
        const websocket = new window.WebSocket(websocketUrl);
        setWebsocket(websocket);
        return () => websocket.close();
    }, [websocketUrl]);

    useEffect(() => {
        if (!websocket) {
            return;
        }
        websocket.onmessage = (event) => {
            //@todo needs validation
            const message: WebsocketMessage<State, Action, Selection> = JSON.parse(event.data.toString());
            dispatch({type: '@websocket/received', message});
        }

        websocket.onclose = () => {
            dispatch({'type': '@websocket/close'});
        }

        return () => {
            websocket.onmessage = null;
            websocket.onclose = null;
        }
    }, [dispatch, websocket]);

    useEffect(() => {
        if (!websocket || !clientId || websocket.readyState !== 1) {
            return;
        }

        if (queue.length) {
            const message: WebsocketActionMessage<Action, Selection> = {
                type: 'action',
                clientId,
                actions: queue,
                selection
            };
            dispatch({type: '@websocket/sent', message})
        } else {
            const message: WebsocketActionMessage<Action, Selection> = {
                type: 'action',
                clientId,
                actions: [],
                selection
            };
            websocket.send(JSON.stringify(message));
        }
    }, [clientId, dispatch, queue, websocket, selection]);
}