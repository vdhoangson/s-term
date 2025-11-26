# App Icons

Place your application icons here:

## Required Files

### macOS
- `icon.icns` - macOS icon bundle (512x512 recommended)

### Windows  
- `icon.ico` - Windows icon (256x256 recommended)

### Linux
- `icons/` directory with PNG icons in multiple sizes:
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

## Current Status

⚠️ **No icons configured yet**

Add your app icon to enable proper branding on all platforms.
