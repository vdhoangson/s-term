import { app } from 'electron'
import '../lib/sentry'
import { Window } from '../lib/window.js'
import { createAppMenu } from './menu.js'

let application: Window | null = null

function createWindow() {
  application = new Window()

  application.browserWindow.on('closed', () => {
    application = null
  })
}

// ------------------------------
// App Events
// ------------------------------
app.whenReady().then(() => {
  createWindow()

  // Create application menu
  if (application) {
    createAppMenu(application.browserWindow)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!application) createWindow()
})
