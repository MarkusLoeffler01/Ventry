import { checkAdminAuth } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import RegistrationManager from "@/components/admin/registrations/RegistrationManager";
import { Suspense } from "react";
import PageLoadingState from "@/components/common/PageLoadingState";

export default function AdminUsersPage() {
    return (
        <Suspense fallback={<PageLoadingState />}>
            <AdminUsersPageContent />
        </Suspense>
    );
}

async function AdminUsersPageContent() {
    const authResult = await checkAdminAuth();
    
    if (!authResult.authorized) {
        if (authResult.error === "Not authenticated") {
            redirect("/login?callbackUrl=/admin/users");
        }
        return (
            <div style={{ padding: '20px', color: 'red' }}>
                {authResult.error || "Access Denied"}
            </div>
        );
    }

    return <RegistrationManager />;
}
