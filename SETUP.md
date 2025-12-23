# Setup Guide

This guide will help you get the markdown editor project up and running as a standalone project.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.0.0 or higher
- **pnpm**: Version 9.0.0 or higher (preferred package manager)

Check your versions:
```bash
node --version  # Should be >= 20.0.0
pnpm --version  # Should be >= 9.0.0
```

### Installing pnpm

If you don't have pnpm installed:

```bash
# Using npm
npm install -g pnpm

# Or using homebrew (macOS)
brew install pnpm

# Or using curl
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

## Initial Setup

1. **Navigate to the project directory**
   ```bash
   cd mdeditor
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

   This will install all required dependencies listed in `package.json`.

3. **Verify installation**
   ```bash
   pnpm typecheck
   ```

   If everything is set up correctly, you should see no errors.

## Running the Development Server

Start the development server with hot module replacement:

```bash
pnpm dev
```

The application will be available at `http://localhost:5200`

## Building for Production

Create an optimized production build:

```bash
pnpm build
```

The build output will be in the `dist/` directory.

### Preview the Production Build

After building, you can preview the production build locally:

```bash
pnpm preview
```

## Project Structure Overview

```
mdeditor/
├── src/
│   ├── components/markdown/    # Markdown renderer components
│   ├── styles/                 # CSS and Tailwind styles
│   ├── main.tsx               # Application entry point
│   └── index.d.ts             # TypeScript type definitions
├── index.html                  # HTML template
├── vite.config.ts             # Vite configuration
├── tsconfig*.json             # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Customizing the Entry Point

By default, the app uses the `EditorWithProview` component (split-pane editor).

To use a different component:

1. Open `src/main.tsx`
2. Change the import statement:

```tsx
// Current (Editor with preview)
import App from './components/markdown/EditorWithProview'

// Alternative 1: Demo with inline styles
import App from './App'

// Alternative 2: Demo with Tailwind styles
import App from './AppTW'
```

## Available Components

1. **EditorWithProview** - Full editor with live preview (default)
2. **MarkdownRenderer** - Tailwind-styled renderer (Mexican theme)
3. **MDRendererTW** - Alternative Tailwind renderer
4. **MarkdownRenderer_orig** - Clean renderer with inline styles

## Troubleshooting

### Port Already in Use

If port 5200 is already in use, you can:

1. Kill the process using the port:
   ```bash
   lsof -ti:5200 | xargs kill -9
   ```

2. Or change the port in `vite.config.ts`:
   ```ts
   server: {
     port: 3000,  // Change to your preferred port
   }
   ```

### TypeScript Errors

If you encounter TypeScript errors:

1. Ensure all dependencies are installed:
   ```bash
   pnpm install
   ```

2. Clear TypeScript cache:
   ```bash
   rm -rf node_modules/.vite
   pnpm typecheck
   ```

### Build Issues

If the build fails:

1. Clear the dist directory:
   ```bash
   rm -rf dist
   ```

2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   pnpm build
   ```

## Next Steps

- Read the [README.md](README.md) for detailed feature documentation
- Explore the component files in `src/components/markdown/`
- Customize the styles in `src/styles/index.css`
- Check out the demo apps in `src/App.tsx` and `src/AppTW.tsx`

## Getting Help

If you encounter issues:

1. Check the [README.md](README.md) for component usage examples
2. Review the TypeScript errors with `pnpm typecheck`
3. Check the browser console for runtime errors
4. Ensure all prerequisites are met (Node.js >= 20, pnpm >= 9)
