import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8">{children}</div>
    </div>
  );
}
