import express from 'express'
import expressWs from 'express-ws'
import {todoWebsocketHandler} from "./packages/todo-server";
import {fileURLToPath} from 'url';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

const app = expressWs(express()).app;

if (isProduction) {
    app.use(express.static('dist'));
}

app.ws('/websocket/todo', todoWebsocketHandler);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('*', (_req, res) => {
    res.sendFile('index.html', {root: path.join(__dirname, '../dist/')});
});
app.listen(isProduction ? 80 : 8080);