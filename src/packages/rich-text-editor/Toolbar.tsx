import {useLayoutEffect, useMemo, useState} from "react";
import {useSlate, useSlateSelection, useSlateStatic} from "slate-react";
import {VirtualElement} from "@restart/ui/usePopper";
import {Button, ButtonGroup, ButtonToolbar, FormControl, Overlay, Popover} from "react-bootstrap";
import {faBold, faCommentDots, faItalic, faUnderline} from "@fortawesome/free-solid-svg-icons";
import {Editor, Text} from "slate";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import useHTMLDivElement from "./useHTMLDivElement.ts";
import getDOMRects, {isDOMRectEqual} from "./getDOMRects.ts";

export default function Toolbar() {
    const divElement = useHTMLDivElement();
    const editor = useSlate();
    const selection = useSlateSelection();
    const [target, setTarget] = useState<VirtualElement>();

    useLayoutEffect(() => {
        const timeout = setTimeout(() => {
            const first = editor.selection ? getDOMRects(editor, editor.selection)[0] : undefined;
            if (!first || !editor.selection) {
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
        }, 0);

        return () => clearTimeout(timeout);
    }, [editor, selection]);


    return useMemo(() => {
        if (!target || !divElement) {
            return null;
        }

        return (
            <Overlay target={target} show={!!target} placement="top" container={divElement}>
                {(props) => (
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
    }, [divElement, target])
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