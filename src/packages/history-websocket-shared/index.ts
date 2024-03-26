export type WebsocketInitMessage<State, Selection> = {
    type: 'init'
    clientId: string,
    clientIds: string[]
    selections: {[clientId: string]: Selection|undefined}
    state: State
}

export type WebsocketSelectionMessage<SelectionAction> = {
    type: 'selection',
    clientId: string,
    actionId: string,
    action: SelectionAction
}

export type WebsocketConnectedMessage = {
    type: 'connected',
    clientId: string
}

export type WebsocketCloseMessage = {
    type: 'close'
    clientId: string,
}

export type WebsocketActionMessage<Action> = {
    type: 'action',
    clientId: string,
    actionId: string,
    action: Action
}

export type WebsocketMessage<State, Action, Selection, SelectionAction> =
    WebsocketInitMessage<State, Selection>
    | WebsocketCloseMessage
    | WebsocketActionMessage<Action>
    | WebsocketConnectedMessage
    | WebsocketSelectionMessage<SelectionAction>;
