import express from 'express'
import expressWs from 'express-ws'
import {todoWebsocketHandler} from "./packages/todo-app-server";
import {fileURLToPath} from 'url';
import path from 'path';
import {slateWebsocketHandler} from "./packages/slate-app-server";

const app = expressWs(express()).app;

app.ws('/ws/todo', todoWebsocketHandler);
app.ws('/ws/slate', slateWebsocketHandler);

if (process.env.NODE_ENV === 'production') {
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);

    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
        res.sendFile('index.html', {root: path.join(dirname, '../dist/')});
    });
    app.listen(80);
} else {
    app.listen(8080);
}