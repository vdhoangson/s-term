# App Icons

Icons live here, at the paths set in `electron-builder.json`. The logo source is `src/assets/logo.svg`.

## Required Files

### macOS
- `icons/mac/icon.icns` - macOS icon bundle (512x512 recommended)

### Windows
- `icons/win/icon.ico` - Windows icon (256x256 recommended)

### Linux
- `icons/png/` directory with PNG icons in multiple sizes:
  - `16x16.png`
  - `32x32.png`
  - `48x48.png`
  - `64x64.png`
  - `128x128.png`
  - `256x256.png`
  - `512x512.png`

## Generate Icons

You can generate all required icons from a single PNG:

```bash
# Install icon generator
npm install -g electron-icon-maker

# Generate icons (from project root)
electron-icon-maker --input=your-icon.png --output=build
```

Or use online tools:
- https://www.electronjs.org/docs/latest/tutorial/icon-generation
- https://icon.kitchen/
