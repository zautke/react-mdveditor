import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    "tab-system": "src/components/tab-system/index.ts",
    "utils": "src/utils.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  treeshake: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "@radix-ui/react-tabs",
    "@dnd-kit/core",
    "@dnd-kit/sortable",
    "@dnd-kit/utilities",
    "motion",
    "motion/react",
    "lucide-react",
  ],
})
