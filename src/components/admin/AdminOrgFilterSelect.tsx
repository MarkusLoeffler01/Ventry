"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";

type Org = { id: string; name: string };

function AdminOrgFilterSelectInner() {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgFilter = searchParams.get("orgFilter") ?? "all";

  useEffect(() => {
    fetch("/api/admin/organizations")
      .then((r) => r.json())
      .then((data) => setOrgs(data.organizations ?? []))
      .catch(() => setOrgs([]));
  }, []);

  if (!orgs || orgs.length === 0) return null;

  const knownValues = new Set(["all", "personal", ...orgs.map((o) => o.id)]);
  const selectValue = knownValues.has(orgFilter) ? orgFilter : "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("orgFilter");
    } else {
      params.set("orgFilter", value);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="org-filter-label">Organization</InputLabel>
        <Select
          labelId="org-filter-label"
          value={selectValue}
          label="Organization"
          onChange={(e) => handleChange(e.target.value as string)}
        >
          <MenuItem value="all">No filter</MenuItem>
          <MenuItem value="personal">Personal</MenuItem>
          {orgs.map((org) => (
            <MenuItem key={org.id} value={org.id}>
              {org.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}

import { Suspense } from "react";

export default function AdminOrgFilterSelect() {
  return (
    <Suspense fallback={null}>
      <AdminOrgFilterSelectInner />
    </Suspense>
  );
}
