import {BaseRange, Editor, Node, Path, Range, Text} from 'slate';
import {ReactEditor} from 'slate-react';

export default function getDOMRects(
    editor: Editor,
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
        const domNode = getDomNode(editor, node);

        if (!domNode) {
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
    editor: Editor,
    range: BaseRange
) {
    try {
        return ReactEditor.toDOMRange(editor, range);
    } catch (e) {
        return null;
    }
}

function getDomNode(editor: Editor, node: Node) {
    try {
        return ReactEditor.toDOMNode(editor, node);
    } catch (e) {
        return null;
    }
}

export function isDOMRectEqual(a: DOMRect, b: DOMRect) {
    return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function isDOMRectsEqual(a: DOMRect[], b: DOMRect[]) {
    return a.length === b.length && a.every((rect, index) => isDOMRectEqual(rect, b[index]));
}