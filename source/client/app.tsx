import { useState } from "react"

export default function App({ logo, close }: Readonly<{ logo: string, close: () => Promise<void> }>) {

    const [closing, setClosing] = useState(false)

    function closeSetup() {

        if (closing) return

        setClosing(true)

        close().catch(() => setClosing(false))
    }

    return <main className="welcome">

        <div className="welcome-mark" aria-hidden="true">

            <img src={logo} alt="" />

        </div>

        <div className="welcome-copy">

            <span className="eyebrow">Welcome to PhreshOS</span>

            <h1>Your space is ready.</h1>

            <p>Setup will guide the first decisions that make this system yours.</p>

        </div>

        <button className="close-setup" type="button" disabled={closing} onClick={closeSetup}>

            {closing ? "Closing…" : "Close Setup"}

        </button>

        <p className="continuation" role="status">

            <span aria-hidden="true" />

            Ready when you are.

        </p>

    </main>
}
