import {Button, ButtonGroup, ButtonGroupProps, ButtonProps} from "react-bootstrap";
import {hasRedo, hasUndo, HistoryAction, HistoryState, redo, undo} from "./createHistoryReducer.ts";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faRotateLeft, faRotateRight} from "@fortawesome/free-solid-svg-icons";
import {Dispatch} from "react";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {classNames} from "../common-util";

type Props<Action, Selection> = {
    state: HistoryState<Action, Selection>,
    dispatch: Dispatch<HistoryAction>
} & ButtonGroupProps

export default function HistoryButtonGroup<Action, Selection>({state, dispatch, ...props}: Props<Action, Selection>) {
    return (
        <ButtonGroup {...props}>
            <ActionButton className="me-2" active={hasUndo(state)} onHandle={() => undo(dispatch)} icon={faRotateLeft}/>
            <ActionButton active={hasRedo(state)} onHandle={() => redo(dispatch)} icon={faRotateRight}/>
        </ButtonGroup>
    )
}

function ActionButton({active, onHandle, icon, ...props}: {
    active: boolean,
    onHandle: () => void,
    icon: IconProp
} & ButtonProps) {
    return (
        <Button {...props} className={classNames(props.className, {'disabled': !active})} onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (active) {
                onHandle();
            }
        }}>
            <FontAwesomeIcon icon={icon}/>
        </Button>
    );
}