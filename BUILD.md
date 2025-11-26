# Cross-Platform Build Guide

## Build Scripts

### Development

```bash
npm run dev           # Run development mode
```

### Build for Current Platform

```bash
npm run build        # Build for current OS
npm run pack         # Build unpacked (for testing)
```

### Build for Specific Platform

```bash
npm run build:win    # Build for Windows (NSIS + Portable)
npm run build:mac    # Build for macOS (DMG + ZIP, x64 + arm64)
npm run build:linux  # Build for Linux (AppImage + deb + rpm)
npm run build:all    # Build for all platforms
```

## Platform-Specific Requirements

### Windows

**Build on**: Windows or Linux/macOS with Wine
**Output**:

- `S-Term-0.1.0-x64.exe` (NSIS installer)
- `S-Term-0.1.0-ia32.exe` (32-bit installer)
- `S-Term-0.1.0-x64.exe` (Portable)

**Requirements**:

- No special requirements for building
- For X11 forwarding: Install Xming or VcXsrv

### macOS

**Build on**: macOS only (for code signing)
**Output**:

- `S-Term-0.1.0-x64.dmg` (Intel)
- `S-Term-0.1.0-arm64.dmg` (Apple Silicon)
- `S-Term-0.1.0-x64.zip`
- `S-Term-0.1.0-arm64.zip`

**Requirements**:

- macOS for building
- For X11 forwarding: Install XQuartz

### Linux

**Build on**: Linux (recommended) or macOS/Windows with Docker
**Output**:

- `S-Term-0.1.0-x64.AppImage`
- `s-term_0.1.0_amd64.deb`
- `s-term-0.1.0.x86_64.rpm`

**Requirements**:

```bash
# Ubuntu/Debian
sudo apt-get install libsecret-1-dev

# Fedora/RHEL
sudo dnf install libsecret-devel

# Arch
sudo pacman -S libsecret
```

## Build Directory Structure

```
release/
├── win-unpacked/          # Windows unpacked
├── mac/                   # macOS unpacked
├── linux-unpacked/        # Linux unpacked
├── S-Term-0.1.0-x64.exe   # Windows installer
├── S-Term-0.1.0.dmg       # macOS installer
├── S-Term-0.1.0.AppImage  # Linux AppImage
├── s-term_0.1.0_amd64.deb # Debian package
└── s-term-0.1.0.x86_64.rpm # RPM package
```

## Icons

Place your app icons in the `build/` directory:

- `build/icon.icns` - macOS icon (512x512)
- `build/icon.ico` - Windows icon (256x256)
- `build/icons/` - Linux icons (PNG format, multiple sizes)

You can generate icons from a single PNG using:

```bash
# Install icon generator
npm install -g electron-icon-maker

# Generate all icons
electron-icon-maker --input=icon.png --output=build
```

## Code Signing

### macOS

Create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
</dict>
</plist>
```

Set environment variables:

```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
```

### Windows

Set environment variables:

```bash
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your_password
```

## Publishing

Update version in `package.json`, then:

```bash
npm run build:all
```

Artifacts will be in `release/` directory.

## Troubleshooting

**Error: "Cannot find module 'electron'"**

```bash
npm install
```

**Error: "node-pty rebuild failed"**

```bash
npm install node-pty --force
```

**Linux: "libsecret not found"**

```bash
sudo apt-get install libsecret-1-dev
```

**macOS: "Code signing failed"**

- Remove code signing or add valid certificate
- Or disable in package.json: `"mac": { "identity": null }`
