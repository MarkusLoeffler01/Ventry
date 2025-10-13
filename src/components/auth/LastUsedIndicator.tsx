"use client";

import { Chip } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";

interface LastUsedIndicatorProps {
  isLastUsed: boolean;
  className?: string;
}

export default function LastUsedIndicator({
  isLastUsed,
  className,
}: LastUsedIndicatorProps) {
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