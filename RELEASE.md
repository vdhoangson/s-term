# Release Guide

Hướng dẫn tạo release mới cho S-Term.

## Quy trình Release

### 1. Chuẩn bị Release

Đảm bảo tất cả thay đổi đã được commit và push lên `main` branch:

```bash
git checkout main
git pull origin main
```

### 2. Cập nhật Version

Cập nhật version trong `package.json`:

```bash
# Tăng patch version (0.1.0 -> 0.1.1)
npm version patch

# Hoặc tăng minor version (0.1.0 -> 0.2.0)
npm version minor

# Hoặc tăng major version (0.1.0 -> 1.0.0)
npm version major
```

Lệnh này sẽ tự động:

- Cập nhật version trong `package.json`
- Tạo git commit với message "v0.1.1"
- Tạo git tag `v0.1.1`

### 3. Push Tag để Trigger Build

```bash
# Push commit và tag
git push origin main --follow-tags
```

GitHub Actions sẽ tự động:

- Build ứng dụng cho Windows, macOS, và Linux
- Tạo GitHub Release với version tương ứng
- Upload tất cả artifacts vào Release

### 4. Monitor Build Progress

Theo dõi quá trình build tại:

```
https://github.com/vdhoangson/s-term/actions
```

Build thường mất khoảng 10-15 phút để hoàn thành.

### 5. Verify Release

Sau khi build hoàn thành:

1. Truy cập [Releases page](https://github.com/vdhoangson/s-term/releases)
2. Kiểm tra release mới nhất
3. Verify các artifacts:
   - **Windows**: `S-Term-{version}-x64.exe`, `S-Term-{version}-ia32.exe`, portable version
   - **macOS**: `S-Term-{version}-x64.dmg`, `S-Term-{version}-arm64.dmg`, `.zip` files
   - **Linux**: `.AppImage`, `.deb`, `.rpm`, `.snap`
4. Download và test ít nhất một artifact từ mỗi platform

## Manual Release (Nếu cần)

Nếu cần build và release thủ công:

### Build Local

```bash
# Build tất cả platforms (chỉ chạy được trên macOS)
npm run build:all

# Build specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### Upload Manual

1. Tạo GitHub Release thủ công
2. Upload các file từ thư mục `release/`

## Troubleshooting

### Build Failed

**Lỗi: "ENOENT: no such file or directory"**

- Kiểm tra `build/` directory có đầy đủ icons không
- Verify `resources/` directory exists

**Lỗi: "Application entry file not found"**

- Chạy `npm run build:renderer` và `npm run build:electron` trước
- Kiểm tra `dist/` và `dist-electron/` directories

**Lỗi: "Code signing failed" (macOS)**

- Workflow hiện tại build unsigned binaries
- Để sign, cần thêm Apple Developer Certificate vào GitHub Secrets

### Snap Build Failed (Linux)

Snap build có thể fail do permissions. Nếu không cần snap:

1. Mở `package.json`
2. Xóa `snap` target khỏi `build.linux.target`

## Code Signing (Optional)

### macOS Code Signing

Để sign macOS apps, thêm secrets vào GitHub repository:

```yaml
# .github/workflows/release.yml
- name: Build and Release (macOS)
  env:
    CSC_LINK: ${{ secrets.MAC_CERT_P12_BASE64 }}
    CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
```

**Required Secrets:**

- `MAC_CERT_P12_BASE64`: Base64 encoded .p12 certificate
- `MAC_CERT_PASSWORD`: Certificate password
- `APPLE_ID`: Apple ID email
- `APPLE_ID_PASSWORD`: App-specific password

### Windows Code Signing

```yaml
# .github/workflows/release.yml
- name: Build and Release (Windows)
  env:
    CSC_LINK: ${{ secrets.WIN_CERT_P12_BASE64 }}
    CSC_KEY_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
```

**Required Secrets:**

- `WIN_CERT_P12_BASE64`: Base64 encoded .p12 certificate
- `WIN_CERT_PASSWORD`: Certificate password

## Version Strategy

Sử dụng [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

## Release Checklist

- [ ] Tất cả tests pass
- [ ] CHANGELOG.md updated
- [ ] Version bumped trong package.json
- [ ] Tag created và pushed
- [ ] GitHub Actions build thành công
- [ ] Artifacts verified
- [ ] Release notes updated
- [ ] Announcement (nếu cần)
