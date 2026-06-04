import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { SvgIconComponent } from "@mui/icons-material";

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    Icon?: SvgIconComponent;
    color?: string;
}

/**
 * A simple metric card for admin dashboards.
 * Shows a label, a large value, an optional subtitle and an optional icon.
 */
export default function StatCard({ label, value, sub, Icon, color = "primary.main" }: StatCardProps) {
    return (
        <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {label}
                    </Typography>
                    {Icon && <Icon sx={{ color, fontSize: 28 }} />}
                </Box>
                <Typography variant="h4" fontWeight={700} color={color}>
                    {value}
                </Typography>
                {sub && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {sub}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}
