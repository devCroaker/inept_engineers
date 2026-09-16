"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Provider as JotaiProvider } from "jotai";
import type { ReactNode } from "react";

import { theme } from "@/theme";

/**
 * enableCssLayer is what puts every MUI style inside `@layer mui`. Combined
 * with the layer order declared in globals.css, it means Tailwind utilities
 * override MUI without !important. Removing it silently reverts to specificity
 * fights that only show up in certain component states.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme} defaultMode="system">
        <CssBaseline />
        <JotaiProvider>{children}</JotaiProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
