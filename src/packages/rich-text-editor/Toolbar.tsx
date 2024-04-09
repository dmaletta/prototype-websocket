import {useEffect, useState} from "react";
import {useFocused, useSlate, useSlateStatic} from "slate-react";
import {VirtualElement} from "@restart/ui/usePopper";
import {Button, ButtonGroup, ButtonToolbar, FormControl, Overlay, Popover} from "react-bootstrap";
import {faBold, faCommentDots, faItalic, faSquareCaretDown, faUnderline} from "@fortawesome/free-solid-svg-icons";
import {Editor, Range, Text} from "slate";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import useHTMLDivElement from "./useHTMLDivElement.ts";
import getDOMRects, {isDOMRectEqual} from "./getDOMRects.ts";

export default function Toolbar() {
    const divElement = useHTMLDivElement();
    const editor = useSlate();
    const {selection} = editor;
    const [target, setTarget] = useState<VirtualElement>();
    const [collapsed, setCollapsed] = useState(true);
    const focus = useFocused();

    useEffect(() => {
        setCollapsed(true);
    }, [selection]);

    useEffect(() => {
        if (focus && collapsed && selection && !Range.isCollapsed(selection)) {
            setCollapsed(false);
        }
    }, [collapsed, selection, focus]);

    useEffect(() => {
        const first = selection ? getDOMRects(editor, selection)[0] : undefined;
        if (!first || !selection) {
            setTarget(undefined);
            return;
        }
        setTarget(target => {
            if (target && isDOMRectEqual(target.getBoundingClientRect(), first)) {
                return target;
            }

            return {
                getBoundingClientRect: () => first
            }
        });
    }, [editor, selection]);


    if (!target || !divElement || !selection) {
        return null;
    }

    return (
        <Overlay target={target} show={!!target} placement="top" container={divElement}>
            {(props) => (
                collapsed ?
                    <span role="button" onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCollapsed(false)
                    }} {...props} ><span className="bg-body"><FontAwesomeIcon
                        icon={faSquareCaretDown}/></span></span> :
                    <Popover {...props}>
                        <Popover.Body>
                            <ButtonToolbar>
                                <ButtonGroup>
                                    <FormatButton format="bold" icon={faBold}/>
                                    <FormatButton format="italic" icon={faItalic}/>
                                    <FormatButton format="underline" icon={faUnderline}/>
                                    <InsertTagButton/>
                                </ButtonGroup>
                            </ButtonToolbar>
                        </Popover.Body>
                    </Popover>
            )}
        </Overlay>
    );
}


type Format = keyof Omit<Text, 'text'>;

const toggleMark = (editor: Editor, format: Format) => {
    const isActive = isMarkActive(editor, format)

    if (isActive) {
        Editor.removeMark(editor, format)
    } else {
        Editor.addMark(editor, format, true)
    }
}

const isMarkActive = (editor: Editor, format: Format) => {
    const marks = Editor.marks(editor);

    if (!marks) {
        return false;
    }

    return marks[format] === true;
}

const FormatButton = ({format, icon}: { format: Format, icon: IconProp }) => {
    const editor = useSlate();
    return (
        <Button
            active={isMarkActive(editor, format)}
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMark(editor, format)
            }}
        >
            <FontAwesomeIcon icon={icon}/>
        </Button>
    )
}


function InsertTagButton() {
    const editor = useSlateStatic();
    const [value, setValue] = useState('');

    return (
        <ButtonGroup>
            <FormControl type="text" value={value} onChange={e => setValue(e.target.value)}/>
            <Button onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                editor.insertInsertTag(value ? value : 'tag')
            }}><FontAwesomeIcon icon={faCommentDots}/></Button>
        </ButtonGroup>
    );
}