import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const rootElement = document.getElementById('root')!
const showRuntimeError = (message: string) => {
  rootElement.innerHTML = `<div style="min-height:100vh;padding:40px;box-sizing:border-box;background:#f5f5f7;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><h1 style="margin:0 0 12px;font-size:28px">学习库启动失败</h1><p style="line-height:1.7;color:#6e6e73">请把下面这段错误信息发给 Codex：</p><pre style="white-space:pre-wrap;padding:16px;border-radius:14px;background:#fff;border:1px solid #d2d2d7;color:#b42318">${message.replace(/[<>&]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[character] ?? character)}</pre></div>`
}

window.addEventListener('error', (event) => {
  showRuntimeError(event.error?.stack || event.message || '未知运行时错误')
})
window.addEventListener('unhandledrejection', (event) => {
  showRuntimeError(event.reason?.stack || event.reason?.message || String(event.reason))
})

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`),
  )
}

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  })
}
