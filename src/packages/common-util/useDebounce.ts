import {useEffect, useRef} from "react";

type Timer = ReturnType<typeof setTimeout>;
type SomeFunction = (...args: unknown[]) => void;

/**
 * Debounces the given function.
 *
 * @template Func - The type of the function to debounce.
 * @param {Func} func - The function to debounce.
 * @param {number} [delay=1000] - The delay in milliseconds before calling the debounced function.
 * @return {Func} - The debounced function.
 */
export default function useDebounce<Func extends SomeFunction>(
    func: Func,
    delay = 1000
) {
    const timer = useRef<Timer>();

    useEffect(() => {
        return () => {
            if (!timer.current) return;
            clearTimeout(timer.current);
        };
    }, []);

    return ((...args) => {
        const newTimer = setTimeout(() => {
            func(...args);
        }, delay);
        clearTimeout(timer.current);
        timer.current = newTimer;
    }) as Func;
}