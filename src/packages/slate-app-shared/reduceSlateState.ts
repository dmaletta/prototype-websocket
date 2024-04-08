import {
    BaseEditor,
    BaseOperation,
    createEditor,
    Editor,
    NodeOperation,
    Operation,
    Selection,
    SelectionOperation,
    TextOperation,
    Transforms,
} from 'slate'
import {ReactEditor} from "slate-react";

export type Paragraph = { type: 'paragraph'; children: (CustomText | InsertTagElement)[] }

export type CustomElement = Paragraph | InsertTagElement
export type CustomText = { text: string, bold?: boolean, italic?: boolean, underline?: boolean };
export type CustomEditor = BaseEditor & ReactEditor & {
    insertInsertTag: (insertTag: string) => void
};

declare module 'slate' {
    interface CustomTypes {
        Editor: CustomEditor
        Element: CustomElement
        Text: CustomText
    }
}

export type SlateSelection = Selection;

export type InsertTagElement = {
    type: 'insert-tag',
    insertTag: string,
    children: CustomText[]
}

export type SlateState = {
    lastUpdated?: string
    nodes: CustomElement[]
};

export type SlateAction = {
    type: 'operation',
    operations: Exclude<BaseOperation, SelectionOperation>[],
    editorId?: string
}

export type SlateSelectionAction = {
    type: 'select',
    selection: Selection
};

export function createSlateSelection(): SlateSelection {
    return null;
}

export function createSlateState(): SlateState {
    return {
        nodes: [{
            type: 'paragraph',
            children: [
                {text: 'Write Your '},
                {type: 'insert-tag', insertTag: 'Tag', children: [{text: ''}]},
                {text: ' Text Here!'},
            ],
        }]
    };
}

export function isSlateSelectionAction(action: SlateAction | SlateSelectionAction): action is SlateSelectionAction {
    return action.type === 'select';
}

export function reduceSlateSelection(_selection: SlateSelection, action: SlateSelectionAction): SlateSelection {
    switch (action.type) {
        case 'select': {
            return action.selection;
        }
    }
}

export default function reduceSlateState(state: SlateState, action: SlateAction): SlateState {
    switch (action.type) {
        case 'operation': {
            const editor = createSlateEditor();
            editor.children = state.nodes;

            Editor.withoutNormalizing(editor, () => {
                action.operations.forEach(operation => {
                    editor.apply(operation);
                })
            });

            Editor.normalize(editor);

            return {
                lastUpdated: action.editorId,
                nodes: editor.children as CustomElement[],
            };
        }
    }
}

export function revertSlateAction(_state: SlateState, action: SlateAction): SlateAction {
    switch (action.type) {
        case "operation": {
            const operations = action.operations.map(operation => Operation.inverse(operation) as NodeOperation | TextOperation).reverse();

            return {type: 'operation', operations};
        }
    }
}

export function createSlateEditor(): CustomEditor {
    const editor = createEditor();
    const {isInline, isElementReadOnly, isSelectable} = editor;

    editor.isInline = (element) => {
        return element.type === 'insert-tag' || isInline(element);
    }

    editor.isElementReadOnly = (element) => {
        return element.type === 'insert-tag' || isElementReadOnly(element);
    };

    editor.isSelectable = element =>
        element.type !== 'insert-tag' && isSelectable(element)

    editor.insertInsertTag = (insertTag) => {
        const {selection} = editor
        if (!selection) {
            return;
        }

        const insertTagElement: InsertTagElement = {
            type: 'insert-tag',
            insertTag,
            children: [{text: ''}],
        }

        Transforms.insertNodes(editor, insertTagElement, {at: selection});


        console.log(editor.selection);
    }

    return editor;
}