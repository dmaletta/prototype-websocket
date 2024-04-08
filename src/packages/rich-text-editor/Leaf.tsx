import {RenderLeafProps} from "slate-react";

export default function Leaf({attributes, children, leaf}: RenderLeafProps) {
    return (
        <span
            {...attributes}
            style={{
                paddingLeft: leaf.text === '' ? 0.1 : undefined,
                fontWeight: leaf.bold ? 'bold' : undefined,
                textDecoration: leaf.underline ? 'underline' : undefined,
                fontStyle: leaf.italic ? 'italic' : undefined,
            }}>
          {children}
        </span>
    );
}