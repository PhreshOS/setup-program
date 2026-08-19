import { current } from "@phreshos/client"
import client from "react-dom/client"
import { StrictMode } from "react"
import App from "./app"
import "./style.css"

await current.window.surface.set({ radius: "medium" })

const root = client.createRoot(document.body)

root.render(<StrictMode><App /></StrictMode>)
