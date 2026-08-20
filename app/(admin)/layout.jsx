import { AdminHeader } from 'components/admin/admin-header';

export default function AdminLayout({ children }) {
    return (
        <div className="flex min-h-screen" style={{ background: 'var(--color-ink)' }}>
            <AdminHeader />
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
