import {Button, ButtonToolbar} from "react-bootstrap";
import {hasRedo, hasUndo, HistoryAction, HistoryState, redo, undo} from "./createHistoryReducer.ts";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faRotateLeft, faRotateRight} from "@fortawesome/free-solid-svg-icons";
import {Dispatch} from "react";

export default function HistoryToolbar<Action, Selection>({state, dispatch}: {state: HistoryState<Action, Selection>, dispatch: Dispatch<HistoryAction>}) {
    return (
        <ButtonToolbar className="mb-2">
            <Button className="me-2" disabled={!hasUndo(state)} onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                undo(dispatch);
            }}><FontAwesomeIcon icon={faRotateLeft}/>
            </Button>
            <Button disabled={!hasRedo(state)} onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                redo(dispatch)
            }}><FontAwesomeIcon icon={faRotateRight}/>
            </Button>
        </ButtonToolbar>
    )
}