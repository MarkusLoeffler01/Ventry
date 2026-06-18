import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import type { Metadata } from "next";
import EnglishPrivacyNotice from "@/components/misc/EnglishPrivacyNotice";
import PrivacyStatement from "@/components/misc/Privacy";
import LegalDocumentShell from "@/components/misc/LegalDocumentShell";
import PrivacyPersonalDataSupplement from "@/components/misc/PrivacyPersonalDataSupplement";

export const metadata: Metadata = {
  title: "Privacy | Ventry",
  description: "GDPR privacy statement for Ventry.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentShell
      description="English and German GDPR privacy statement for Ventry."
      title="Privacy"
      updatedAt="June 9, 2026"
    >
      <Stack spacing={5}>
        <PrivacyPersonalDataSupplement language="en" />
        <EnglishPrivacyNotice />
        <Divider />
        <div lang="de">
          <PrivacyPersonalDataSupplement language="de" />
          <PrivacyStatement />
        </div>
      </Stack>
    </LegalDocumentShell>
  );
}
