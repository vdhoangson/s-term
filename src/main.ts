import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createPinia } from 'pinia'
import vuetify from './plugins/vuetify'
import { i18n } from './locales'

const app = createApp(App)
const pinia = createPinia()

app.use(i18n)
app.use(vuetify)
app.use(pinia)
app.mount('#app')
