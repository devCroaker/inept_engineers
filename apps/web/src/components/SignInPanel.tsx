"use client";

import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { signIn } from "@/lib/auth-client";

type Provider = "google" | "discord";

export function SignInPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  async function social(provider: Provider) {
    setBusy(provider);
    setError(undefined);
    const { error: signInError } = await signIn.social({
      provider,
      callbackURL: "/",
    });
    if (signInError) {
      setError(signInError.message ?? `Could not sign in with ${provider}.`);
      setBusy(undefined);
    }
  }

  async function withPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    setError(undefined);
    const { error: signInError } = await signIn.email({
      email,
      password,
      callbackURL: "/",
    });
    if (signInError) {
      setError(signInError.message ?? "Could not sign in.");
    }
    setBusy(undefined);
  }

  return (
    <Stack spacing={3} className="w-full max-w-sm">
      <Box>
        <Typography variant="h2" gutterBottom>
          Sign in
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use whichever you prefer. They all land in the same account.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack spacing={1.5}>
        <Button
          variant="contained"
          size="large"
          disabled={Boolean(busy)}
          onClick={() => void social("google")}
        >
          {busy === "google" ? "Redirecting…" : "Continue with Google"}
        </Button>
        <Button
          variant="outlined"
          size="large"
          disabled={Boolean(busy)}
          onClick={() => void social("discord")}
        >
          {busy === "discord" ? "Redirecting…" : "Continue with Discord"}
        </Button>
      </Stack>

      <Divider>or</Divider>

      <form onSubmit={(event) => void withPassword(event)}>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
          <Button type="submit" variant="text" disabled={Boolean(busy)}>
            {busy === "email" ? "Signing in…" : "Sign in with email"}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
