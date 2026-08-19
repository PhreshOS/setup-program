import icon from "../../icon.png"

export default function App() {

    return <main className="welcome">

        <div className="welcome-mark" aria-hidden="true">

            <img src={icon} alt="" />

        </div>

        <div className="welcome-copy">

            <span className="eyebrow">Welcome to PhreshOS</span>

            <h1>Your space is ready.</h1>

            <p>Setup will guide the first decisions that make this system yours.</p>

        </div>

        <p className="continuation" role="status">

            <span aria-hidden="true" />

            Ready when you are.

        </p>

    </main>
}
