"use client";

import { useMemo, useState } from "react";
import { Box, Paper, Stack, TextField, Chip, Typography } from "@mui/material";
import {
    DataGrid,
    type GridColDef,
    type GridRenderCellParams,
    type GridFilterModel,
    type GridFilterItem,
} from "@mui/x-data-grid";

export interface PaymentRow {
    id: string;
    createdAt: string | Date;
    userName: string;
    userEmail: string;
    eventName: string;
    ownerName: string;
    amount: number;
    currency: string;
    paymentStatus: string;
}

const statusColor: Record<string, "success" | "warning" | "error" | "default"> = {
    COMPLETED: "success",
    PENDING: "warning",
    FAILED: "error",
    REFUNDED: "default",
};

const fmtAmount = (amount: number) =>
    `€ ${amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function uniqueSorted(values: string[]): string[] {
    return [...new Set(values)].sort();
}

export default function RecentPaymentsTable({ rows }: { rows: PaymentRow[] }) {
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });

    const parsedRows = useMemo(
        () => rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt) })),
        [rows],
    );

    const eventOptions = useMemo(() => uniqueSorted(rows.map((r) => r.eventName)), [rows]);
    const ownerOptions = useMemo(() => uniqueSorted(rows.map((r) => r.ownerName)), [rows]);
    const currencyOptions = useMemo(() => uniqueSorted(rows.map((r) => r.currency)), [rows]);
    const statusOptions = useMemo(() => uniqueSorted(rows.map((r) => r.paymentStatus)), [rows]);

    const filteredRows = useMemo(() => {
        if (!dateFrom && !dateTo) return parsedRows;
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
        return parsedRows.filter((r) => {
            if (from && r.createdAt < from) return false;
            if (to && r.createdAt > to) return false;
            return true;
        });
    }, [parsedRows, dateFrom, dateTo]);

    const columns: GridColDef[] = useMemo(
        () => [
            {
                field: "createdAt",
                headerName: "Date",
                type: "date",
                width: 130,
                valueFormatter: (value: Date) => value.toLocaleDateString("de-DE"),
            },
            {
                field: "userName",
                headerName: "User",
                minWidth: 220,
                flex: 1,
                valueGetter: (_, row) => `${row.userName} ${row.userEmail}`,
                renderCell: (params: GridRenderCellParams) => (
                    <Box sx={{ lineHeight: 1.3, py: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{params.row.userName}</Typography>
                        <Typography variant="caption" color="text.secondary">{params.row.userEmail}</Typography>
                    </Box>
                ),
            },
            {
                field: "eventName",
                headerName: "Event",
                type: "singleSelect",
                valueOptions: eventOptions,
                minWidth: 160,
            },
            {
                field: "ownerName",
                headerName: "Owner / Organization",
                type: "singleSelect",
                valueOptions: ownerOptions,
                minWidth: 190,
            },
            {
                field: "amount",
                headerName: "Amount",
                type: "number",
                width: 120,
                valueFormatter: (value: number) => fmtAmount(value),
            },
            {
                field: "currency",
                headerName: "Currency",
                type: "singleSelect",
                valueOptions: currencyOptions,
                width: 110,
            },
            {
                field: "paymentStatus",
                headerName: "Status",
                type: "singleSelect",
                valueOptions: statusOptions,
                width: 140,
                renderCell: (params: GridRenderCellParams) => (
                    <Chip
                        label={params.value}
                        size="small"
                        color={statusColor[params.value as string] ?? "default"}
                    />
                ),
            },
        ],
        [eventOptions, ownerOptions, currencyOptions, statusOptions],
    );

    const columnLabels = useMemo(
        () => Object.fromEntries(columns.map((c) => [c.field, c.headerName ?? c.field])),
        [columns],
    );

    const removeFilterItem = (item: GridFilterItem) => {
        setFilterModel((prev) => ({ ...prev, items: prev.items.filter((it) => it !== item) }));
    };

    const removeQuickFilterValue = (value: string) => {
        setFilterModel((prev) => ({
            ...prev,
            quickFilterValues: (prev.quickFilterValues ?? []).filter((v) => v !== value),
        }));
    };

    const hasActiveFilters = filterModel.items.length > 0 || (filterModel.quickFilterValues?.length ?? 0) > 0;

    return (
        <Paper variant="outlined">
            <Stack direction="row" spacing={2} sx={{ p: 2 }} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">Date range:</Typography>
                <TextField
                    label="From"
                    type="date"
                    size="small"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                    label="To"
                    type="date"
                    size="small"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                />
            </Stack>
            {hasActiveFilters && (
                <Stack direction="row" spacing={1} sx={{ px: 2, pb: 2 }} flexWrap="wrap" useFlexGap>
                    {filterModel.items.map((item) => (
                        <Chip
                            key={item.id ?? `${item.field}-${item.operator}-${String(item.value)}`}
                            label={`${columnLabels[item.field] ?? item.field} ${item.operator} ${item.value ?? ""}`.trim()}
                            onDelete={() => removeFilterItem(item)}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    ))}
                    {filterModel.quickFilterValues?.map((value) => (
                        <Chip
                            key={`quick-${value}`}
                            label={`Search: ${value}`}
                            onDelete={() => removeQuickFilterValue(String(value))}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    ))}
                </Stack>
            )}
            <Box sx={{ height: 600, width: "100%" }}>
                <DataGrid
                    rows={filteredRows}
                    columns={columns}
                    disableRowSelectionOnClick
                    showToolbar
                    filterModel={filterModel}
                    onFilterModelChange={setFilterModel}
                    pageSizeOptions={[10, 25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                        sorting: { sortModel: [{ field: "createdAt", sort: "desc" }] },
                    }}
                />
            </Box>
        </Paper>
    );
}
