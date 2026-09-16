import { Box } from "@mui/material";

import { SignInPanel } from "@/components/SignInPanel";

export default function SignInPage() {
  return (
    <Box className="flex min-h-screen items-center justify-center p-6">
      <SignInPanel />
    </Box>
  );
}
