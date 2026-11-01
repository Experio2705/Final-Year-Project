
import { useState } from "react";
import "./App.css";

function App() {

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const scanPage = async () => {

        setLoading(true);
        setResult(null);

        try {

            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            if (!tab?.id || !tab.url?.startsWith("http")) {
                throw new Error("Cannot scan this page.");
            }

            const response = await chrome.tabs.sendMessage(
                tab.id,
                { action: "SCAN_FORM" }
            );

            setResult(response);

        } catch (error) {

            console.error(error);

            setResult({
                error: error.message || "Unable to scan this page."
            });

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container">

            <header className="app-header">

                <div className="logo">🛡️</div>

                <div className="header-content">
                    <h1>Fill Buddy</h1>
                    <p>Intelligent Form Protection</p>
                </div>

            </header>

            <div className="status-card">
                <span className="status-dot"></span>
                <span className="status-text">
                    Protection Active
                </span>
            </div>

            <button
                className="scan-button"
                onClick={scanPage}
                disabled={loading}
            >
                {loading ? "Scanning..." : "Scan Current Page"}
            </button>

            {result && !result.error && (

                <>

                    <h2 className="section-title">
                        Scan Results
                    </h2>

                    <div className="stats-container">

                        <div className="stat-card">
                            <h2>{result.formCount}</h2>
                            <p>Forms</p>
                        </div>

                        <div className="stat-card">
                            <h2>{result.fieldCount}</h2>
                            <p>Fields</p>
                        </div>

                        <div className={`stat-card ${
                            result.errorCount > 0 ? "error" : "success"
                        }`}>
                            <h2>{result.errorCount}</h2>
                            <p>Errors</p>
                        </div>

                    </div>

                    <h2 className="section-title">
                        Detected Issues
                    </h2>

                    {result.errors.length === 0 ? (

                        <div className="success-message">
                            ✓ No validation errors found!
                        </div>

                    ) : (

                        result.errors.map((item) => (

                            <div className="error-card" key={item.index}>

                                <h3>{item.label}</h3>

                                <p className="error-message">
                                    {item.error}
                                </p>

                                <p className="error-suggestion">
                                    {item.suggestion}
                                </p>

                            </div>

                        ))

                    )}

                </>

            )}

            {result?.error && (
                <div className="error-banner">
                    {result.error}
                </div>
            )}

            {!result && (
                <div className="empty-message">
                    Scan the current webpage to detect form errors.
                </div>
            )}

            <footer className="footer">
                Privacy Browser Assistant · On-device processing
            </footer>

        </div>
    );
}

export default App;
