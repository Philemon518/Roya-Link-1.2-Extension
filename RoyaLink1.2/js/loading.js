const SERVER_URL = "http://127.0.0.1:8000";
const WS_SERVER = "ws://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", async () => {
    // ✅ Retrieve stored parameters
    const youtubeUrl = sessionStorage.getItem("youtube_url");
    const languageCode = sessionStorage.getItem("language_code");
    const deviceToken = sessionStorage.getItem("device_token");

    if (!youtubeUrl || !languageCode || !deviceToken) {
        console.error("Missing parameters. Redirecting to home...");
        window.location.href = "../html/home.html";
        return;
    }

    console.log("🔄 Loading page initialized. Opening WebSocket connection...");

    // ✅ UI Elements
    const queueStatus = document.getElementById("queueStatus");
    const progressBar = document.getElementById("progressBar");
    const progressStatus = document.getElementById("progressStatus");

    const leftText = document.getElementById("leftText");
    const topText = document.getElementById("topText");
    const rightText = document.getElementById("rightText");

    let ws = null;
    let totalSentences = 0;
    let artificialRunning = false;

    // ✅ Open WebSocket for Progress Updates
    function connectWebSocket() {
        if (ws) {
            console.warn("⚠️ WebSocket already exists, preventing duplicate connections.");
            return;
        }

        ws = new WebSocket(`${WS_SERVER}/timing-log?device_token=${encodeURIComponent(deviceToken)}`);

        ws.onopen = () => {
            console.log("✅ WebSocket connected. Sending translation request...");
            progressStatus.textContent = "Initializing...";
            ws.send(JSON.stringify({ youtube_url: youtubeUrl, language_code: languageCode }));
        };

        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            console.log("📥 WebSocket response received:", data);

            // ✅ Handle queue status
            if (data.status.startsWith("In queue behind")) {
                queueStatus.textContent = data.status;
                progressBar.style.display = "none";
                return;
            }

            // ✅ Handle insufficient credits
            if (data.status === "insufficient_credits") {
                alert(data.message);
                window.location.href = "../html/home.html";
                return;
            }

            // ✅ Immediately transition if fetched within 24 hours
            if (data.fetched_within_24_hours) {
                transitionToTranslatedPage(data.audio_url, data.log_url, data.required_credits || "0 (Reusing within 24h)", data.remaining_credits || "N/A");
                return;
            }

            // ✅ Handle existing file (Outside 24h) - Run artificial loading & IGNORE backend progress
            if (data.outside_24h) {
                console.log("⚠️ File exists but is older than 24h. Ignoring backend 100% and starting artificial loading...");
                artificialRunning = true;
                runArtificialLoading(data.audio_url, data.log_url, data.required_credits || "0 (Reusing within 24h)", data.remaining_credits || "N/A");
                return;
            }

            // ✅ Handle real-time progress updates for new file generation
            if (data.status && data.status.includes("Generating audio for segment")) {
                const match = data.status.match(/segment (\d+)\/(\d+)/);
                if (match) {
                    let currentSentence = parseInt(match[1]);
                    totalSentences = parseInt(match[2]);
        
                    // ✅ Calculate percentage based on sentences
                    let calculatedProgress = Math.floor((currentSentence / totalSentences) * 100);
                    console.log(`🔄 Sentence Progress: ${currentSentence}/${totalSentences} → ${calculatedProgress}%`);
        
                    // ✅ Ensure artificial loading takes priority
                    if (artificialRunning) {
                        console.log("⚠️ Ignoring backend progress (Artificial Loading Active)");
                        return; 
                    }
        
                    // ✅ Loop: Update progress until 100%
                    while (realProgress < calculatedProgress) {
                        realProgress += 5; // Increment progress by 5% per update
                        updateProgress(realProgress);
                        await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for smooth updates
        
                        if (realProgress >= 100) {
                            console.log("✅ Audio Generation Complete! Transitioning...");
                            transitionToTranslatedPage(data.audio_url, data.log_url, data.required_credits || "0 (Reusing within 24h)", data.remaining_credits || "N/A");
                            break; // Exit loop after reaching 100%
                        }
                    }
                }
            }

            // ✅ Handle direct progress updates from backend (if provided)
            if (data.progress !== undefined && !artificialRunning) {
                console.log(`🟢 Backend progress update: ${data.progress}%`);
                updateProgress(data.progress);
            }

            // ✅ Transition when new file generation reaches 100%
            if (data.progress === 100) {
                console.log("✅ Generation Complete! Redirecting to translated page...");
                transitionToTranslatedPage(data.audio_url, data.log_url, data.required_credits || "0 (Reusing within 24h)", data.remaining_credits || "N/A");
        
                // ✅ Ensure WebSocket stays open long enough to receive final messages
                setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        console.log("🔄 Closing WebSocket before redirect...");
                        ws.close();
                    }

                }, 1000);
            }
        };

        ws.onerror = (error) => {
            console.error("❌ WebSocket error:", error);
        };

        ws.onclose = () => {
            if (!artificialRunning) {
                setTimeout(connectWebSocket, 1000);
            }
        };
    }

    // ✅ Ensure WebSocket stays open
    connectWebSocket();

    // ✅ Artificial Loading System (7 seconds total for outside 24-hour case)
    function runArtificialLoading(audio, log, creditsUsed, creditsRemaining) {
        console.log("🔧 Artificial Loading Started");

        let steps = [
            { progress: 25, time: 2000 },  // 2 sec → 25%
            { progress: 50, time: 2000 },  // 2 sec → 50%
            { progress: 75, time: 2000 },  // 2 sec → 75%
            { progress: 100, time: 1000 }  // 1 sec → 100%
        ];

        let stepIndex = 0;

        function nextStep() {
            if (stepIndex >= steps.length) return;
            let step = steps[stepIndex++];

            setTimeout(() => {
                console.log(`🟢 Artificial progress: ${step.progress}%`);
                updateProgress(step.progress);

                // ✅ Final transition to translated page at 100%
                if (step.progress === 100) {
                    console.log("✅ Artificial Loading Complete! Redirecting...");
                    transitionToTranslatedPage(audio, log, creditsUsed, creditsRemaining );
                } else {
                    nextStep();
                }
            }, step.time);
        }

        nextStep();
    }

    // ✅ Update UI with Progress
    function updateProgress(value) {
        progressBar.value = value;
        progressStatus.textContent = `Processing... ${value}%`;

        if (value >= 25) leftText.style.visibility = "visible";
        if (value >= 50) topText.style.visibility = "visible";
        if (value >= 75) rightText.style.visibility = "visible";
    }

    // ✅ Transition to Translated Page
    function transitionToTranslatedPage(audioUrl, logUrl, creditsUsed, creditsRemaining) {
    
        // ✅ Ensure WebSocket is properly closed before transitioning
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log("🔄 Closing WebSocket before redirect...");
            ws.close();
        }
    
        // ✅ Delay the redirect slightly to prevent race conditions
        setTimeout(() => {
            console.log("🚀 Redirecting now...");
    
            window.location.replace(`../html/translated.html?audio=${encodeURIComponent(audioUrl)}&log=${encodeURIComponent(logUrl)}&credits_used=${encodeURIComponent(creditsUsed)}&credits_remaining=${encodeURIComponent(creditsRemaining)}`);
        }, 500);
    }
    
    
});
