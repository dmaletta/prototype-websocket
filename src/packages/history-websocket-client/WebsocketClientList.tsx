import {Alert, Card, CardProps, ListGroup} from "react-bootstrap";
import {WebsocketState} from "./createWebsocketReducer.ts";

type Props<Action, Selection> = {
    state: WebsocketState<Action, Selection>
} & CardProps

export default function WebsocketClientList<Action, Selection>({state, ...props}: Props<Action, Selection>) {
    return (
        <Card {...props}>
            <Card.Header>Clients</Card.Header>
            <ListGroup variant="flush">
                {state['@websocket'].clientIds.map(clientId =>
                    <ListGroup.Item
                        style={clientId === state['@websocket'].clientId ? {color: 'green'} : undefined}
                        key={clientId}>
                        {clientId}
                        <Alert className="mt-2">{JSON.stringify(state['@websocket'].selections[clientId])}</Alert>
                    </ListGroup.Item>
                )}
            </ListGroup>
        </Card>
    );
}