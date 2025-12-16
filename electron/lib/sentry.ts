const { init } =
  process.type === 'browser'
    ? require('@sentry/electron/main')
    : require('@sentry/electron/renderer')

const SENTRY_DSN =
  'https://0539cab17aad2d05a72775f6c593957d@o4510544206823424.ingest.us.sentry.io/4510544209313792'

let release = null

if (process.type === 'browser') {
  release = require('electron').app.getVersion()
} else {
  release = require('@electron/remote/main').app?.getVersion() || null
}

if (process.env.NODE_ENV !== 'development') {
  init({
    dsn: SENTRY_DSN,
    release,
    enableNative: true,
    beforeSend(event: any) {
      if (event.request?.data?.includes('password')) {
        return null
      }
      return event
    },
  })
}
