import {useEffect, useState} from "react";
import {Alert} from "react-bootstrap";
import {WebsocketState} from "./createWebsocketReducer.ts";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTriangleExclamation} from "@fortawesome/free-solid-svg-icons";

type Props<Action, Selection> = {
    state: WebsocketState<Action, Selection>
}
export default function WebsocketConnectionAlert<Action, Selection>({state}: Props<Action, Selection>) {
    const connected = state['@websocket'].connected;
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!connected) {
            setTimeout(() => {
                setShow(true);
            }, 500);
        } else {
            setShow(false);
        }
    }, [connected]);

    if (!connected) {
        return <Alert show={show} variant="danger"><FontAwesomeIcon icon={faTriangleExclamation}/> Not connected</Alert>
    }

    return null;
}