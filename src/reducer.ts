export type TodoAddAction = { type: 'todo-add', todo: Todo, position: number };
export type TodoRemoveAction = { type: 'todo-remove', id: string };
export type TodoUpdateAction = { type: 'todo-update', id: string, todo: string };
export type TodoSelectAction = { type: 'todo-select', todoId: string }
export type ClearSelectAction = { type: 'clear-select' }

export type Action = TodoAddAction | TodoRemoveAction | TodoUpdateAction

export type Selection = string|undefined
export type SelectionAction = TodoSelectAction | ClearSelectAction;

export type Todo = {
    id: string,
    todo: string
}
export type State = {
    ids: string[]
    map: { [key: string]: Todo }
};

export function createState(): State {
    return {
        ids: ['a', 'b', 'c'], map: {
            a: {
                id: 'a',
                todo: 'Task A'
            },
            b: {
                id: 'b',
                todo: 'Task B'
            },
            c: {
                id: 'c',
                todo: 'Task C'
            }
        }
    };
}

export function isSelectionAction(action: Action | SelectionAction): action is SelectionAction {
    return ['todo-select', 'clear-select'].includes(action.type);
}

export function actionReverter(state: State, action: Action): Action | null {
    switch (action.type) {
        case "todo-add":
            return {'type': "todo-remove", id: action.todo.id}
        case "todo-remove":
            return {'type': "todo-add", todo: state.map[action.id], position: state.ids.indexOf(action.id)}
        case "todo-update":
            return {'type': "todo-update", id: action.id, todo: state.map[action.id].todo}
    }
}

export function reduceSelection(_selection: Selection, action: SelectionAction): Selection {
    switch (action.type) {
        case "clear-select":
            return undefined;
        case "todo-select":
            return action.todoId;
    }
}

export default function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "todo-update": {
            const map = {...state.map, [action.id]: {...state.map[action.id], todo: action.todo}};
            return {...state, map};
        }
        case "todo-remove": {
            const map = {...state.map};
            delete map[action.id];
            return {...state, map, ids: state.ids.filter(id => id != action.id)}
        }
        case "todo-add": {
            const ids = [...state.ids];
            ids.splice(action.position, 0, action.todo.id);

            return {...state, map: {...state.map, [action.todo.id]: action.todo}, ids: ids}
        }
    }
}

