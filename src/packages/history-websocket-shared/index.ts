export type Client<Selection> = {
    id: string,
    selection: Selection
}

export type ClientMap<Selection> = { [clientId: string]: Client<Selection> }

export type WebsocketInitMessage<State, Selection> = {
    type: 'init'
    clientId: string,
    clientMap: ClientMap<Selection>
    state: State
}

export type WebsocketConnectedMessage<Selection> = {
    type: 'connected',
    client: Client<Selection>
}

export type WebsocketCloseMessage = {
    type: 'close'
    clientId: string,
}

export type ActionWithId<Action> = Action & {
    '@id': string
}

export type WebsocketActionMessage<Action, Selection> = {
    type: 'action',
    clientId: string,
    selection: Selection,
    actions: ActionWithId<Action>[]
}

export type WebsocketMessage<State, Action, Selection> =
    WebsocketInitMessage<State, Selection>
    | WebsocketCloseMessage
    | WebsocketActionMessage<Action, Selection>
    | WebsocketConnectedMessage<Selection>
