import {v4 as uuid} from "uuid";
const idMap = new WeakMap<object, string>();
export default function getObjectUuid(object: object): string {
    const objectId: string | undefined = idMap.get(object);
    if (objectId === undefined) {
        const id = uuid();
        idMap.set(object, id);

        return id;
    }

    return objectId;
}