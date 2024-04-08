import {Range, Selection} from "slate";
import {useSlate} from "slate-react";
import getDOMRects from "./getDOMRects.ts";
import useHTMLDivElement from "./useHTMLDivElement.ts";
import {Overlay, Popover} from "react-bootstrap";
import {VirtualElement} from "@restart/ui/usePopper";
import {useLayoutEffect, useRef} from "react";

type Props = {
    client: string,
    selection: Selection
}

export default function RemoteSelection({selection, client}: Props) {
    const editor = useSlate();
    const rects = selection ? getDOMRects(editor, selection) : [];
    const htmlDivElement = useHTMLDivElement();
    const first = rects[0] ?? null;
    const isCollapsed = selection && Range.isCollapsed(selection);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const parent = htmlDivElement?.getBoundingClientRect();

    useLayoutEffect(() => {
        const tooltip = tooltipRef.current;
        if (!tooltip || !parent) {
            return;
        }

        const {style, clientWidth, clientHeight} = tooltip;

        if (!first) {
            style.display = 'none';
            return;
        }


        style.display = 'block';
        style.top = `${first.top - parent.top - clientHeight}px`;
        style.left = `${first.left - parent.left - clientWidth / 2 + first.width / 2}px`;
    }, [first, parent]);

    if (!first || !parent) {
        return null;
    }

    const target: VirtualElement = {
        getBoundingClientRect: () => {
            return first;
        }
    }

    return (
        <>
            <Overlay target={target} show={true} placement="top" container={htmlDivElement}>
                {(props) => (
                    <Popover {...props}>
                        <Popover.Body>
                            {client}
                        </Popover.Body>
                    </Popover>
                )}
            </Overlay>
            {isCollapsed ? <div
                key='collapsed'
                className="position-absolute pe-none"
                style={{
                    top: first.top - parent.top,
                    left: first.left - parent.left - 1,
                    width: 3,
                    height: first.height,
                    backgroundColor: 'rgba(0, 0, 255, 0.75)',
                }}
            /> : rects.map((rect, index) => {
                return (
                    <div
                        className="position-absolute pe-none"
                        key={index}
                        style={{
                            top: rect.top - parent.top,
                            left: rect.left - parent.left,
                            width: rect.width,
                            height: rect.height,
                            backgroundColor: 'rgba(0, 0, 255, 0.5)',
                        }}
                    />
                );
            })
            }
        </>
    )
};