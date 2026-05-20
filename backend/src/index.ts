import { createApp } from './app.js'

const PORT = parseInt(process.env.PORT ?? '3001')
const app = createApp()

app.listen(PORT, () => {
  console.log(`cknow backend running on :${PORT}`)
})
