const { cssVarNames } = require("@kinwoo/tokens/native");

// Key by the kebab-case CSS variable (`--muted-foreground` → `muted-foreground`), not the
// camelCase TS key, so class names match web: `text-muted-foreground`, not `text-mutedForeground`.
function toCssVarColors(names) {
  const out = {};
  for (const cssVar of Object.values(names)) out[cssVar.replace(/^--/, "")] = `var(${cssVar})`;
  return out;
}

const INTER_FACES = {
  300: "Inter_300Light",
  400: "Inter_400Regular",
  500: "Inter_500Medium",
  600: "Inter_600SemiBold",
  700: "Inter_700Bold",
};

const POPPINS_FACES = {
  400: "Poppins_400Regular",
  500: "Poppins_500Medium",
  600: "Poppins_600SemiBold",
  700: "Poppins_700Bold",
};

const WEIGHT_NAMES = { 300: "light", 400: "normal", 500: "medium", 600: "semibold", 700: "bold" };

// React Native cannot pick a weight from a single face, so each weight utility also selects
// its family. Do not combine `font-display` with `font-bold`: the later one switches to Inter.
function fontWeights({ addUtilities }) {
  const utilities = {};
  for (const [weight, face] of Object.entries(INTER_FACES)) {
    utilities[`.font-${WEIGHT_NAMES[weight]}`] = { fontFamily: face, fontWeight: weight };
  }
  for (const [weight, face] of Object.entries(POPPINS_FACES)) {
    if (weight === "700") continue;
    utilities[`.font-display-${WEIGHT_NAMES[weight]}`] = { fontFamily: face, fontWeight: weight };
  }
  // Italic is a separate face on native, so it gets its own utility rather than `italic`.
  utilities[".font-display-medium-italic"] = {
    fontFamily: "Poppins_500Medium_Italic",
    fontWeight: "500",
  };
  addUtilities(utilities);
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: toCssVarColors(cssVarNames),
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
        "4xl": "var(--radius-4xl)",
      },
      fontFamily: {
        sans: [INTER_FACES[500]],
        display: [POPPINS_FACES[700]],
      },
    },
  },
  plugins: [fontWeights],
};
