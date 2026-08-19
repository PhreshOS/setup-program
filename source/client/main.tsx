import client from "react-dom/client"
import { StrictMode } from "react"
import { current, host } from "@phreshos/client"
import App from "./app"
import "./style.css"

const [theme] = await Promise.all([

    host.theme.snapshot(),

    current.window.surface.set({
        radius: "medium",
        transaction: { duration: 240, easing: "ease-out" }
    })
])

const style = document.documentElement.style

style.setProperty("--theme-background", theme.background)
style.setProperty("--theme-foreground", theme.foreground)
style.setProperty("--theme-accent", theme.accent)

const root = client.createRoot(document.body)

root.render(<StrictMode><App /></StrictMode>)
