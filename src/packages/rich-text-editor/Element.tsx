import {RenderElementProps} from "slate-react";
import {Badge} from "react-bootstrap";
import InlineChromiumBugfix from "./InlineChromiumBugfix.tsx";

export default function Element({element, attributes, children}: RenderElementProps) {
    switch (element.type) {
        case 'insert-tag':
            return (
                <span  {...attributes} contentEditable={false}>
                    <InlineChromiumBugfix/>
                    {children}
                    <Badge bg="secondary" contentEditable={false}>
                    {element.insertTag}
                    </Badge>
                    <InlineChromiumBugfix/>
                </span>
            );
        default:
            return <p {...attributes}>{children}</p>
    }
}