import express from 'express'
import expressWs from 'express-ws'
import {todoWebsocketHandler} from "./packages/todo-server";

const isProduction = process.env.NODE_ENV === 'production';

const app = expressWs(express()).app;

if (isProduction) {
    app.use(express.static('dist'));
}

app.ws('/websocket/todo', todoWebsocketHandler);

app.listen(isProduction ? 80 : 8080);