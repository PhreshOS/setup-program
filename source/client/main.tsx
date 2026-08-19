import client from "react-dom/client"
import { StrictMode } from "react"
import { current, host } from "@phreshos/client"
import logo from "../../icon.png"
import App from "./app"
import "./style.css"

const image = new Image()
image.src = logo

const [theme] = await Promise.all([

    host.theme.snapshot(),

    current.localWindow.surface.set({ radius: "medium" }, { duration: 240, easing: "ease-out" }),

    image.decode()
])

const style = document.documentElement.style

style.setProperty("--theme-background", theme.background)
style.setProperty("--theme-foreground", theme.foreground)
style.setProperty("--theme-accent", theme.accent)

const root = client.createRoot(document.body)

root.render(<StrictMode><App logo={logo} /></StrictMode>)
