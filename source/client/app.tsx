import { useRef, useState } from "react"

export default function App({ logo, close }: Readonly<{ logo: string, close: () => Promise<void> }>) {

    const welcome = useRef<HTMLElement>(null)

    const [closing, setClosing] = useState(false)

    async function closeSetup() {

        if (closing) return

        setClosing(true)

        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

        const animations = welcome.current?.getAnimations({ subtree: true }) ?? []

        await Promise.allSettled(animations.map(animation => animation.finished))

        try { await close() }

        catch { setClosing(false) }
    }

    return <main ref={welcome} className="welcome" data-closing={closing || undefined}>

        <div className="welcome-mark" aria-hidden="true">

            <img src={logo} alt="" />

        </div>

        <div className="welcome-copy">

            <span className="eyebrow">Welcome to PhreshOS</span>

            <h1>Your space is ready.</h1>

            <p>Setup will guide the first decisions that make this system yours.</p>

        </div>

        <button className="close-setup" type="button" disabled={closing} onClick={() => void closeSetup()}>

            {closing ? "Closing…" : "Close Setup"}

        </button>

        <p className="continuation" role="status">

            <span aria-hidden="true" />

            Ready when you are.

        </p>

    </main>
}
