# Hướng dẫn Build và Publish Snap

## Cài đặt snapcraft

```bash
sudo snap install snapcraft --classic
```

## Build Snap Package

### Cách 1: Sử dụng electron-builder (Khuyến nghị)

```bash
# Build snap package
npm run build:linux
```

File snap sẽ được tạo trong thư mục `release/`:

- `s-term_0.1.0_amd64.snap`

### Cách 2: Test local snap

```bash
# Cài đặt snap local để test
sudo snap install release/s-term_0.1.0_amd64.snap --dangerous --classic

# Chạy ứng dụng
s-term

# Gỡ cài đặt
sudo snap remove s-term
```

## Publish lên Snap Store

### Bước 1: Tạo tài khoản Snapcraft Developer

1. Truy cập: https://snapcraft.io/
2. Đăng ký tài khoản Ubuntu One nếu chưa có
3. Đăng nhập vào Snapcraft Dashboard

### Bước 2: Đăng ký tên ứng dụng

```bash
# Đăng nhập snapcraft
snapcraft login

# Đăng ký tên snap (chỉ làm 1 lần)
snapcraft register s-term
```

### Bước 3: Upload snap lên store

```bash
# Upload snap
snapcraft upload release/s-term_0.1.0_amd64.snap

# Hoặc upload và release luôn
snapcraft upload release/s-term_0.1.0_amd64.snap --release=stable
```

### Bước 4: Release snap

Nếu chưa release khi upload, bạn có thể release sau:

```bash
# Release vào channel stable
snapcraft release s-term <revision> stable

# Hoặc release vào các channel khác
snapcraft release s-term <revision> edge      # Development builds
snapcraft release s-term <revision> beta      # Beta testing
snapcraft release s-term <revision> candidate # Release candidate
snapcraft release s-term <revision> stable    # Production release
```

### Bước 5: Quản lý trên Dashboard

Truy cập: https://snapcraft.io/snaps để:

- Xem thống kê downloads
- Quản lý releases
- Cập nhật metadata (description, screenshots, etc.)
- Xem reviews và ratings

## Channels và Versioning

Snap Store có 4 channels:

- **stable**: Phiên bản ổn định cho người dùng cuối
- **candidate**: Release candidate, sắp lên stable
- **beta**: Beta testing
- **edge**: Development builds, cập nhật thường xuyên

Người dùng có thể cài đặt từ channel cụ thể:

```bash
sudo snap install s-term                    # Mặc định từ stable
sudo snap install s-term --channel=beta     # Từ beta channel
sudo snap install s-term --channel=edge     # Từ edge channel
```

## Cập nhật phiên bản mới

1. Cập nhật version trong `package.json`
2. Build snap mới: `npm run build:linux`
3. Upload: `snapcraft upload release/s-term_<version>_amd64.snap --release=stable`

## Lưu ý quan trọng

### Confinement Mode

Ứng dụng đang dùng `classic` confinement vì cần:

- Truy cập SSH keys (~/.ssh)
- Truy cập network không hạn chế
- Truy cập file system

**Classic confinement cần được review thủ công bởi Snapcraft team** trước khi publish lên stable channel.

### Yêu cầu cho Classic Confinement

Để được approve classic confinement, bạn cần:

1. Giải thích tại sao cần classic confinement trong forum: https://forum.snapcraft.io/
2. Chờ Snapcraft team review và approve
3. Thường mất 1-2 tuần

### Alternative: Strict Confinement

Nếu muốn publish nhanh hơn, có thể dùng `strict` confinement với các plugs phù hợp, nhưng sẽ có một số hạn chế về quyền truy cập.

## Troubleshooting

### Lỗi: "You need to login first"

```bash
snapcraft login
```

### Lỗi: "Name already registered"

Tên đã được người khác đăng ký, cần chọn tên khác hoặc request transfer.

### Lỗi: "Classic confinement requires approval"

Cần request approval trên forum như hướng dẫn ở trên.

## Resources

- Snapcraft Documentation: https://snapcraft.io/docs
- Electron Snap Guide: https://snapcraft.io/docs/electron-apps
- Forum: https://forum.snapcraft.io/
- Dashboard: https://snapcraft.io/snaps
