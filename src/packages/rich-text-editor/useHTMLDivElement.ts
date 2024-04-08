import {createContext, createElement, ReactNode, useContext, useEffect, useRef} from "react";

const context = createContext<HTMLDivElement | null>(null);

type Props = {
    children: ReactNode,
    onClickOutside?: () => void
}

export function HtmlDivElementProvider({children, onClickOutside}: Props) {
    const {Provider} = context;
    const divRef = useRef<HTMLDivElement>(null);
    const onClickOutsideRef = useRef(onClickOutside);

    useEffect(() => {
        onClickOutsideRef.current = onClickOutside;
    }, [onClickOutside]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (divRef.current && !divRef.current.contains(event.target as Node)) {
                onClickOutsideRef.current && onClickOutsideRef.current();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return createElement('div', {
        ref: divRef,
        className: 'position-relative',
        children: createElement(Provider, {children, value: divRef.current})
    });
}

export default function useHTMLDivElement() {
    return useContext(context);
}