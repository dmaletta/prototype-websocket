export default function createWebsocket(path: string) {
    const websocket = import.meta.env.PROD ? 'wss://' + window.location.host : 'ws://localhost:8080';
    return new window.WebSocket(websocket + path);
}