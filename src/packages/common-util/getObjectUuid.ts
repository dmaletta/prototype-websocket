import generateUuid from "./generateUuid.ts";

const idMap = new WeakMap<object, string>();
export default function getObjectUuid(object: object): string {
    const objectId: string | undefined = idMap.get(object);
    if (objectId === undefined) {
        const id = generateUuid();
        idMap.set(object, id);

        return id;
    }

    return objectId;
}