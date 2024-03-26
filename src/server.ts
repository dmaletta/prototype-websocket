import express from 'express'
import expressWs from 'express-ws'
import reducer, {
    createState,
    State,
    Action,
    isSelectionAction,
    Selection,
    SelectionAction,
    reduceSelection
} from "./reducer.ts";
import {createWebsocketHandler} from "./packages/history-websocket-server";

const isProduction = process.env.NODE_ENV === 'production';

const app = expressWs(express()).app;

if (isProduction) {
    app.use(express.static('dist'));
}

app.ws('/multi-user-action', createWebsocketHandler<State, Action, Selection, SelectionAction>({
    reducer,
    initState: createState(),
    initialSelection: undefined,
    reduceSelection,
    isSelectionAction
}));

app.listen(isProduction ? 80 : 8080);