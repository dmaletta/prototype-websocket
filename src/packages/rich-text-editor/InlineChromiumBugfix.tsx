export default function InlineChromiumBugfix() {
    return (
        <span contentEditable={false} style={{fontSize: 0}}>
            {String.fromCodePoint(160) /* Non-breaking space */}
        </span>
    )
}