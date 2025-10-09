import { AddPasskeyButton } from "@/components/auth/AddPasskey";
import PasswordResetMail from "@/components/PasswordResetMail";

export default function Page() {
    return (
        <div>
            <h1>Add Passkey</h1>
            <AddPasskeyButton />
            <PasswordResetMail resetUrl="https://google.com" userName="Ven" expiryHours={2} />
        </div>
        
    );
}
