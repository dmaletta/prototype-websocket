import {Dispatch, Reducer, useEffect} from "react";

export type RedoAction = {
    type: '@history/redo'
}
export type UndoAction = {
    type: '@history/undo'
}

export type HistoryAction = RedoAction | UndoAction;

export type HistoryPoint<Action, Selection> = [Action, Selection];

export type HistoryState<Action, Selection> = {
    '@selection': Selection
    '@history': {
        future: HistoryPoint<Action, Selection>[]
        past: HistoryPoint<Action, Selection>[]
    }
}

export type ActionReverter<State, Action> = (prevState: State, action: Action) => Action | null

export function hasUndo<Action, Selection>(state: HistoryState<Action, Selection>): boolean {
    return state['@history'].past.length > 0
}

export function hasRedo<Action, Selection>(state: HistoryState<Action, Selection>): boolean {
    return state['@history'].future.length > 0
}

export function undo<Action>(dispatch: Dispatch<Action | HistoryAction>) {
    dispatch({type: '@history/undo'});
}

export function redo<Action>(dispatch: Dispatch<Action | HistoryAction>) {
    dispatch({type: '@history/redo'});
}

export function createHistoryState<State, Action, Selection>(state: State, selection: Selection): State & HistoryState<Action, Selection> {
    return {
        ...state,
        '@selection': selection,
        '@history': {
            future: [],
            past: [],
        }
    }
}

export function isHistoryAction(action: unknown): action is HistoryAction {
    return typeof action === 'object' && action !== null && ['@history/redo', '@history/undo'].includes((action as {
        type: string
    }).type);
}

export function useHistoryKeyPress<State, Action, Selection>(state: State & HistoryState<Action, Selection>, dispatch: Dispatch<Action | HistoryAction>) {
    const {past, future} = state["@history"];
    const hasPast = past.length > 0;
    const hasFuture = future.length > 0;

    useEffect(() => {
        if (!hasPast) {
            return;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'z' && event.metaKey && !event.shiftKey) {
                event.preventDefault();

                if (event.shiftKey) {
                    dispatch({'type': '@history/redo'});
                } else {
                    dispatch({'type': '@history/undo'});
                }
            }
        };

        //implement window key press for undo
        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [dispatch, hasPast]);

    useEffect(() => {
        if (!hasFuture) {
            return;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'z' && event.metaKey && event.shiftKey) {
                event.preventDefault();

                dispatch({'type': '@history/redo'});
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [dispatch, hasFuture]);
}

export type HistorySelectionConfig<State, Selection> = {
    select: (state: State) => Selection,
    update: (state: State, selection: Selection) => State
};

export type HistoryReducerConfig<State, Action, Selection, SelectionAction> = {
    createRevertAction: ActionReverter<State, Action>,
    selectionReducer: Reducer<Selection, SelectionAction>
    isSelectionAction: (action: Action | SelectionAction) => action is SelectionAction
}

export default function createHistoryReducer<State, Action, Selection, SelectionAction>(reducer: Reducer<State, Action>, config: HistoryReducerConfig<State, Action, Selection, SelectionAction>): Reducer<State & HistoryState<Action, Selection>, Action | HistoryAction | SelectionAction> {
    const {createRevertAction, selectionReducer, isSelectionAction} = config;

    return (state, action) => {
        const {past, future} = state["@history"];
        const selection = state['@selection'];

        if (isHistoryAction(action)) {
            switch (action.type) {
                case '@history/undo': {
                    if (!past.length) {
                        return state;
                    }

                    const [action, nextSelection] = past[past.length - 1];
                    const nextState = reducer(state, action);
                    const revertAction = createRevertAction(state, action);

                    return {
                        ...nextState,
                        '@selection': nextSelection,
                        '@history': {
                            past: past.slice(0, -1),
                            future: revertAction ? [...future, [revertAction, selection]] : future,
                        },
                    }
                }
                case '@history/redo': {
                    if (!future.length) {
                        return state;
                    }

                    const [action, nextSelection] = future[future.length - 1];
                    const nextState = reducer(state, action);
                    const revertAction = createRevertAction(state, action);

                    return {
                        ...nextState,
                        '@selection': nextSelection,
                        '@history': {
                            past: revertAction ? [...past, [revertAction, selection]] : past,
                            future: future.slice(0, -1),
                        },
                    }
                }
            }
        } else if (isSelectionAction(action)) {
            return {
                ...state,
                '@selection': selectionReducer(selection, action)
            }
        } else {
            const nextState = reducer(state, action);
            const revertAction = createRevertAction(state, action);

            return {
                ...nextState,
                '@selection': state['@selection'],
                '@history': {
                    past: revertAction ? [...past, [revertAction, selection]] : past,
                    future: revertAction ? [] : future,
                },
            }
        }
    }
}