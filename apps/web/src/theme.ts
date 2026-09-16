"use client";

import { createTheme } from "@mui/material/styles";

/**
 * Brand colour sampled from the household icon: white gears on a blue field.
 */
export const BRAND_BLUE = "#003DB2";

export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: BRAND_BLUE, contrastText: "#FFFFFF" },
        background: { default: "#FAFAFA", paper: "#FFFFFF" },
      },
    },
    dark: {
      palette: {
        // Lifted for contrast against a dark background; the icon blue is too
        // deep to read well on dark surfaces.
        primary: { main: "#6E93E8", contrastText: "#06132B" },
        background: { default: "#0E1116", paper: "#161B22" },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "var(--font-sans, system-ui, sans-serif)",
    h1: { fontSize: "2.25rem", fontWeight: 700 },
    h2: { fontSize: "1.75rem", fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
});
