import {
    BaseEditor,
    BaseOperation,
    createEditor,
    Editor,
    NodeOperation,
    Operation,
    Selection,
    SelectionOperation,
    TextOperation
} from 'slate'
import {ReactEditor} from "slate-react";

export type CustomElement = { type: 'paragraph'; children: CustomText[] }
export type CustomText = { text: string, clientId?: string }

declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor
        Element: CustomElement
        Text: CustomText
    }
}

export type SlateSelection = Selection;

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
            children: [{text: 'Write Your Text Here!'}],
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
            const editor = createEditor();
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