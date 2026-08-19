import client from "react-dom/client"
import { StrictMode } from "react"
import App from "./app"
import "./style.css"

const root = client.createRoot(document.body)

root.render(<StrictMode><App /></StrictMode>)