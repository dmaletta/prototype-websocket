export default function classNames(...args: (undefined | string | { [key: string]: boolean })[]): undefined | string {
    const classes: string[] = [];

    for (const arg of args) {
        if (!arg) continue;

        if (typeof arg === 'string') {
            classes.push(arg);
        } else {
            classes.push(...Object.keys(arg).filter(key => arg[key]));
        }
    }

    return classes.length ? classes.join(' ') : undefined;
}