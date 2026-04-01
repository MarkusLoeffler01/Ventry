"use client";

import { useEffect, useState } from "react";
import { Chip } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { isLastUsedLoginMethod } from "@/lib/auth/client";

interface LastUsedIndicatorProps {
  loginMethod: string;
  className?: string;
}

export default function LastUsedIndicator({
  loginMethod,
  className,
}: LastUsedIndicatorProps) {
  const [isLastUsed, setIsLastUsed] = useState(false);

  useEffect(() => {
    setIsLastUsed(isLastUsedLoginMethod(loginMethod));
  }, [loginMethod]);

  if (!isLastUsed) {
    return null;
  }

  return (
    <Chip
      icon={<CheckCircle sx={{ fontSize: "14px !important" }} />}
      label="Last used"
      size="small"
      variant="filled"
      color="success"
      className={className}
      sx={{
        height: 20,
        fontSize: "0.7rem",
        fontWeight: 500,
        "& .MuiChip-icon": {
          fontSize: "14px !important",
        },
      }}
    />
  );
}

export type { LastUsedIndicatorProps };
