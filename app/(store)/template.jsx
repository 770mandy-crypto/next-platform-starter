/*
A template re-mounts on every navigation (unlike a layout), which is exactly the
hook a route transition needs: the gold blade wipes across and lifts while the
incoming page rises into place.
*/
export default function StoreTemplate({ children }) {
    return (
        <>
            <div className="page-wipe" aria-hidden="true" />
            <div className="page-in">{children}</div>
        </>
    );
}
