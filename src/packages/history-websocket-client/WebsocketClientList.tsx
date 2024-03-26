import {Card, ListGroup} from "react-bootstrap";
import {WebsocketState} from "./createWebsocketReducer.ts";

export default function WebsocketClientList<Action, Selection>({state}: { state: WebsocketState<Action, Selection> }) {
    return (
        <Card>
            <Card.Header>Clients</Card.Header>
            <Card.Body>
                <ListGroup>
                    {state['@websocket'].clientIds.map(clientId =>
                        <ListGroup.Item
                            style={clientId === state['@websocket'].clientId ? {color: 'green'} : undefined}
                            key={clientId}>{clientId}</ListGroup.Item>
                    )}
                </ListGroup>
            </Card.Body>
        </Card>
    );
}