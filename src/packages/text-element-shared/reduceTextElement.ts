import {BaseEditor, createEditor, Editor, Operation, Selection, NodeOperation, TextOperation, SelectionOperation} from 'slate'
import {ReactEditor} from "slate-react";

export type CustomElement = { type: 'paragraph'; children: CustomText[] }
export type CustomText = { text: string }

declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor
        Element: CustomElement
        Text: CustomText
    }
}

export type TextElementSelection = Selection;

export type TextElementState = {
    lastUpdater: 'editor' | 'extern'
    nodes: CustomElement[]
};

export type TextElementAction = {
    type: 'operation',
    operations: (NodeOperation|TextOperation)[],
    byEditor?: true
}

export type TextSelectionAction = {
    type: 'select',
    operations: SelectionOperation[],
    byEditor?: true
};

export function createTextElementSelection(): TextElementSelection {
    return null;
}

export function createTextElementState(): TextElementState {
    return {
        lastUpdater: 'extern',
        nodes: [{
            type: 'paragraph',
            children: [{text: 'test'}],
        }]
    };
}

export function isTextElementSelectionAction(action: TextElementAction | TextSelectionAction): action is TextSelectionAction {
    return action.type === 'select';
}

export function reduceTextElementSelection(state: TextElementSelection, action: TextSelectionAction): TextElementSelection {
    switch (action.type) {
        case 'select': {
            const editor = createEditor();

            Editor.withoutNormalizing(editor, () => {
                editor.selection = state;
                action.operations.forEach(operation => {
                    editor.apply(operation);
                })
            });

            return editor.selection;
        }
    }
}

export default function reduceTextElement(state: TextElementState, action: TextElementAction): TextElementState {
    switch (action.type) {
        case 'operation': {
            const editor = createEditor();
            editor.children = state.nodes;

            Editor.withoutNormalizing(editor, () => {
                action.operations.forEach(operation => {
                    editor.apply(operation);
                })
            });

            Editor.normalize(editor);

            return {
                lastUpdater: action.byEditor ? 'editor' : 'extern',
                nodes: editor.children as CustomElement[],
            };
        }
    }
}

export function createRevertTextAction(_state: TextElementState, action: TextElementAction): TextElementAction {
    switch (action.type) {
        case "operation": {
            const operations= action.operations.map(operation => Operation.inverse(operation) as NodeOperation|TextOperation).reverse();

            return {type: 'operation', operations};
        }
    }
}