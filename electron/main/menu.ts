import { Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron'

export function createAppMenu(mainWindow: BrowserWindow) {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            mainWindow?.webContents.send('menu:open-settings')
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            mainWindow?.webContents.send('menu:open-about')
          }
        }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
