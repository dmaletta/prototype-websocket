export default function getWebsocketUrl(path: string) {
    const websocket = import.meta.env.PROD ? 'wss://' + window.location.host : 'ws://localhost:8080';
    return websocket + path;
}