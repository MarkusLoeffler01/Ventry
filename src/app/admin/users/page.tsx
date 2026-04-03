import { checkAdminAuth } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import RegistrationManager from "@/components/admin/registrations/RegistrationManager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
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
