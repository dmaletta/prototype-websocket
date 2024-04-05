import {BaseRange, Editor, Node, Path, Range, Text} from 'slate';
import {ReactEditor} from 'slate-react';

export default function getDomRects(
    editor: ReactEditor,
    range: BaseRange
) {
    const [start, end] = Range.edges(range);

    const domRange = getDomRange(editor, range);
    if (!domRange) {
        return [];
    }

    const rects: DOMRect[] = [];
    const nodes = Editor.nodes(editor, {
        at: range,
        match: n => Text.isText(n),
    });

    for (const [node, path] of nodes) {
        const domNode =getDomNode(editor, node);

        if(!domNode) {
            continue;
        }

        const isStartNode = Path.equals(path, start.path);
        const isEndNode = Path.equals(path, end.path);

        if (isStartNode || isEndNode) {
            const nodeRange = document.createRange();
            nodeRange.selectNode(domNode);

            if (isStartNode) {
                nodeRange.setStart(domRange.startContainer, domRange.startOffset);
            }
            if (isEndNode) {
                nodeRange.setEnd(domRange.endContainer, domRange.endOffset);
            }

            rects.push(...nodeRange.getClientRects())
        } else {
            rects.push(...domNode.getClientRects())
        }
    }

    return rects;
}


function getDomRange(
    editor: ReactEditor,
    range: BaseRange
) {
    try {
        return ReactEditor.toDOMRange(editor, range);
    } catch (e) {
        return null;
    }
}

function getDomNode(editor: ReactEditor, node: Node) {
    try {
        return ReactEditor.toDOMNode(editor, node);
    } catch (e) {
        return null;
    }
}