# S-Term

[![GitHub Sponsors](https://img.shields.io/github/sponsors/vdhoangson?style=for-the-badge&logo=github&label=Sponsor)](https://github.com/sponsors/vdhoangson)

**S-Term** is a modern, cross-platform SSH terminal application built with web technologies. It combines the power of a robust terminal emulator with a user-friendly interface, featuring built-in SFTP file management, session organization, and real-time system monitoring.

## 🚀 Key Features

- **Modern Terminal Emulator**: Built on `xterm.js`, supporting full terminal features, colors, and resizing.
- **SSH Client**: Connect to remote servers via SSH (password or private key).
- **SFTP Explorer**: Integrated file manager to browse, upload, and download files on remote servers.
- **Session Management**: Organize your connections with folders and drag-and-drop sorting.
- **Real-time Monitoring**: View CPU and RAM usage of your connected remote servers.
- **Customizable Interface**:
  - Dark/Light/System themes.
  - Collapsible sidebars.
  - Multi-tab support.
- **Internationalization (i18n)**: Support for multiple languages (English, Vietnamese).
- **Cross-Platform**: Available for Windows, macOS, and Linux.

## 🛠️ Tech Stack

- **Core**: [Electron](https://www.electronjs.org/)
- **Frontend**: [Vue 3](https://vuejs.org/), [Vuetify](https://vuetifyjs.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Terminal**: [xterm.js](https://xtermjs.org/)
- **SSH/SFTP**: [ssh2](https://github.com/mscdex/ssh2)

## 📦 Installation & Development

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn

### Setup

1.  Clone the repository:

    ```bash
    git clone https://github.com/vdhoangson/s-term.git
    cd s-term
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Development

Run the application in development mode with hot-reload:

```bash
npm run dev
```

This command concurrently starts the Vite renderer server and the Electron main process.

### Building

To build the application for production:

- **All Platforms**:

  ```bash
  npm run build
  ```

- **Specific Platform**:
  ```bash
  npm run build:win   # Windows (nsis, portable, appx)
  npm run build:mac   # macOS (dmg, zip)
  npm run build:linux # Linux (deb, rpm, AppImage)
  ```

The build artifacts will be output to the `release` directory.

## 💖 Support the Project

If you find S-Term useful, please consider supporting its development:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-💖-ff69b4?style=for-the-badge&logo=github)](https://github.com/sponsors/vdhoangson)

Your support helps maintain and improve S-Term. Thank you! 🙏

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 👤 Author

**vdhoangson**

- Email: vdhoangson@gmail.com
- GitHub: [vdhoangson](https://github.com/vdhoangson)
