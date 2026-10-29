import { createApp } from 'vue'
import App from './App.vue'
import PlatformIcon from './components/ui/PlatformIcon.vue'
import InputAssist from './components/ui/InputAssist.vue'
import ResultPlaceholder from './components/ui/ResultPlaceholder.vue'
import RiskDimensions from './components/ui/RiskDimensions.vue'
import CsvGuide from './components/ui/CsvGuide.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import './assets/main.css'
import './assets/interactions.css'
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus, { locale: zhCn })
app.component('PlatformIcon', PlatformIcon)
app.component('InputAssist', InputAssist)
app.component('ResultPlaceholder', ResultPlaceholder)
app.component('RiskDimensions', RiskDimensions)
app.component('CsvGuide', CsvGuide)
app.mount('#app')