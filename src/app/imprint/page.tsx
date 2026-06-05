import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import LegalDocumentShell from "@/components/misc/LegalDocumentShell";

const owner = {
  address: ["Markus Löffler", "Fritz-Elsas-Straße 22", "70174 Stuttgart", "Germany"],
  email: "info@m-loeffler.de",
};

export const metadata: Metadata = {
  title: "Imprint | Ventry",
  description: "Legal notice and provider information for Ventry.",
};

export default function ImprintPage() {
  return (
    <LegalDocumentShell
      description="Provider identification and contact details for Ventry."
      title="Imprint"
      updatedAt="June 5, 2026"
    >
      <Stack spacing={4}>
        <Box>
          <Typography component="h2" variant="h4">
            Information according to Section 5 DDG
          </Typography>
          {owner.address.map((line) => (
            <Typography key={line}>{line}</Typography>
          ))}
        </Box>

        <Box>
          <Typography component="h2" variant="h4">
            Contact
          </Typography>
          <Typography>
            Email:{" "}
            <Link href={`mailto:${owner.email}`} underline="hover">
              {owner.email}
            </Link>
          </Typography>
        </Box>

        <Box>
          <Typography component="h2" variant="h4">
            Responsible for content
          </Typography>
          {owner.address.map((line) => (
            <Typography key={`content-${line}`}>{line}</Typography>
          ))}
        </Box>

        <Divider />

        <Box lang="de">
          <Typography component="h2" variant="h4">
            Impressum
          </Typography>
          <Typography>
            Angaben gemäß § 5 DDG
          </Typography>
          {owner.address.map((line) => (
            <Typography key={`de-${line}`}>{line}</Typography>
          ))}
          <Typography sx={{ mt: 2 }}>
            E-Mail:{" "}
            <Link href={`mailto:${owner.email}`} underline="hover">
              {owner.email}
            </Link>
          </Typography>
          <Typography component="h3" variant="h6">
            Verantwortlich für den Inhalt
          </Typography>
          {owner.address.map((line) => (
            <Typography key={`de-content-${line}`}>{line}</Typography>
          ))}
        </Box>
      </Stack>
    </LegalDocumentShell>
  );
}
