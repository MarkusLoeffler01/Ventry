import React from "react";
import {
    Box,
    Typography,
    Container,
    Paper,
    Alert,
} from "@mui/material";
import Link from "next/link";
import MuiLink from "@mui/material/Link";


export interface AuthTemplateProps {
    children: React.ReactNode;
    form: "login" | "register";
    title?: string;
    error: string | null;
}

const AuthTemplate = ({ 
    children, 
    form, 
    error 
}: AuthTemplateProps) => {
    return (
        <Container component="main" maxWidth="sm">
            <Paper 
                elevation={3} 
                sx={{ 
                    p: 4, 
                    mt: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}
            >                
                {error && (
                    <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                        {error}
                    </Alert>
                )}
                
                {children}
                
                {form === "login" ? <NotYetRegistered /> : <AlreadyRegistered />}
            </Paper>
        </Container>
    );
};

const AlreadyRegistered = () => {
    return (
        <Box sx={{ mt: 3, textAlign: 'center', width: '100%' }}>
            <Typography variant="body2">
                Already registered?{' '}
                <Link href="/login" passHref>
                    <MuiLink component="span" variant="body2">
                        Login here
                    </MuiLink>
                </Link>
            </Typography>
        </Box>
    );
};

const NotYetRegistered = () => {
    return (
        <Box sx={{ mt: 3, textAlign: 'center', width: '100%' }}>
            <Typography variant="body2">
                Not yet registered?{' '}
                <Link href="/register" passHref>
                    <MuiLink component="span" variant="body2">
                        Register here
                    </MuiLink>
                </Link>
            </Typography>
        </Box>
    );
};

export default AuthTemplate;