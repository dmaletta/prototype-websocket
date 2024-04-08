import {Dispatch, useEffect, useMemo, useRef, useState} from "react";
import {Editable, Slate, withReact,} from "slate-react";
import {BaseOperation, Descendant, Editor, Operation, Selection, SelectionOperation} from "slate";
import {generateUuid, useDebounce} from "../common-util";
import {ErrorBoundary} from "react-error-boundary";
import {createSlateEditor} from "../slate-app-shared";
import Leaf from "./Leaf.tsx";
import Toolbar from "./Toolbar.tsx";
import Element from "./Element.tsx";
import {HtmlDivElementProvider} from "./useHTMLDivElement.ts";
import RemoteSelection from "./RemoteSelection.tsx";

export type RteId = string;

export type RteState = {
    lastUpdated?: RteId,
    selection: Selection,
    nodes: Descendant[],
    remote?: { client: string, selection: Selection }[]
}

export type RteUpdateAction = {
    type: '@rte/update',
    by?: RteId,
    ops: Exclude<BaseOperation, SelectionOperation>[],
}

export type RteSelectAction = {
    type: '@rte/select',
    select: Selection
}

export type RteAction = RteUpdateAction | RteSelectAction;

type Props = {
    state: RteState,
    dispatch: Dispatch<RteAction>,
}

export default function RichTextEditor({state, dispatch}: Props) {
    const editor = useMemo(() => withReact(createSlateEditor()), []);
    const [editorId, setEditorId] = useState(generateUuid());
    const ref = useRef(false);
    const refOperations = useRef<BaseOperation[]>([]);
    const {nodes, lastUpdated} = state;

    useEffect(() => {
        if (lastUpdated !== editorId) {
            ref.current = true;
            resetNodes(editor, nodes, state.selection);
        }
    }, [editor, editorId, lastUpdated, nodes, state]);

    const flush = useDebounce(() => {
        const selectionOperations: SelectionOperation[] = [];
        const mutationOperations: Exclude<BaseOperation, SelectionOperation>[] = [];

        refOperations.current.forEach(operation => {
            if (Operation.isSelectionOperation(operation)) {
                selectionOperations.push(operation);
            } else {
                mutationOperations.push(operation);
            }
        })

        refOperations.current = [];
        if (mutationOperations.length) {
            dispatch({type: '@rte/update', by: editorId, ops: mutationOperations});
        }
        if (selectionOperations.length || mutationOperations.length) {
            dispatch({type: '@rte/select', select: editor.selection})
        }
    }, 150);

    const handleSelectionError = (e: Error) => {
        if (editor.selection && e.message.includes('Cannot resolve a DOM point from Slate point')) {
            dispatch({type: '@rte/select', select: null});
            setTimeout(() => {
                setEditorId(generateUuid());
            })
        } else {
            throw e;
        }
    };
    return (
        <Slate key={editorId} editor={editor} initialValue={state.nodes} onChange={() => {
            if (ref.current) {
                ref.current = false;
                return;
            }
            refOperations.current.push(...editor.operations);
            flush();
        }}>
            <HtmlDivElementProvider onClickOutside={() => {
                dispatch({type: '@rte/select', select: null});
            }}>
                <Toolbar/>
                {state.remote ? state.remote.map(({client, selection}) => {
                    return <RemoteSelection key={client} client={client} selection={selection}/>;
                }) : null}
                <ErrorBoundary onError={handleSelectionError} fallback={null}>
                    <Editable renderLeaf={Leaf} renderElement={Element}/>
                </ErrorBoundary>
            </HtmlDivElementProvider>
        </Slate>
    );
}


function resetNodes(editor: Editor, nodes: Descendant[], selection: Selection): void {
    const children = [...editor.children];
    Editor.withoutNormalizing(editor, () => {
        children.forEach((node) => editor.apply({type: 'remove_node', path: [0], node}))
        nodes.forEach((node, i) => editor.apply({type: 'insert_node', path: [i], node: node}))
    });

    editor.selection = selection;
    Editor.normalize(editor);
}