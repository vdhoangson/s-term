# Resources Directory

This directory contains additional resources that will be bundled with the Electron application.

## Purpose

Files placed in this directory will be copied to the application's resources folder during the build process. These files will be accessible at runtime via `process.resourcesPath`.

## Usage

### Adding Resources

Place any static files you need in the application here:

- Configuration files
- Templates
- Static assets
- External binaries
- Documentation

### Accessing Resources at Runtime

```typescript
import path from 'path'

// In Electron main process
const resourcePath = path.join(process.resourcesPath, 'resources', 'your-file.txt')
```

## Examples

```
resources/
├── config/
│   └── default-settings.json
├── templates/
│   └── ssh-config.template
└── README.md
```

## Notes

- Files in this directory are **not** processed by Vite or webpack
- They are copied as-is to the final application bundle
- Keep file sizes reasonable to avoid bloating the application
- This directory is configured in `package.json` under `build.extraResources`
