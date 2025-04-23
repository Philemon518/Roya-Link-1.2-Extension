document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const audioUrl = urlParams.get("audio");
    const logUrl = urlParams.get("log");
    const creditsUsed = urlParams.get("credits_used");
    const creditsRemaining = urlParams.get("credits_remaining");
    const youtubeTabId = parseInt(urlParams.get("yt"));  // ✅ Correct tab ID

    console.log("✅ Player initialized:", {
        audioUrl, logUrl, creditsUsed, creditsRemaining, youtubeTabId
    });

    // Elements
    const creditUsedDisplay = document.getElementById("creditsUsed");
    const remainingCreditDisplay = document.getElementById("creditsRemaining");
    const youtubeTimeline = document.getElementById("youtubeTimeline");
    const audioTimeline = document.getElementById("audioTimeline");
    const youtubePlayButton = document.getElementById("youtubePlayPause");
    const audioPlayButton = document.getElementById("audioPlayPause");
    const closeButton = document.getElementById("closeButton");

    creditUsedDisplay.textContent = creditsUsed || "0";
    remainingCreditDisplay.textContent = creditsRemaining || "error";

    let translatedAudio = new Audio(audioUrl);
    let pauseInstructions = [];
    let isDraggingYoutube = false;
    let isDraggingAudio = false;

    async function fetchPauseInstructions() {
        try {
            const response = await fetch(logUrl);
            const logText = await response.text();

            pauseInstructions = logText
                .split("\n")
                .filter(line => line.includes("Pause at"))
                .map(line => {
                    const match = line.match(/Pause at (\d+\.\d+)s for (\d+\.\d+)s/);
                    if (match) {
                        return { time: parseFloat(match[1]), duration: parseFloat(match[2]) };
                    }
                })
                .filter(Boolean);

            console.log("✅ Parsed Pause Instructions:", pauseInstructions);
        } catch (error) {
            console.error("❌ Error fetching log file:", error);
        }
    }

    function syncTimelines() {
        if (!youtubeTabId) return;

        chrome.scripting.executeScript({
            target: { tabId: youtubeTabId },
            func: () => {
                const video = document.querySelector("video");
                return video ? { currentTime: video.currentTime, duration: video.duration } : null;
            }
        }, (results) => {
            if (results?.[0]?.result) {
                const { currentTime, duration } = results[0].result;
                youtubeTimeline.max = duration;
                youtubeTimeline.value = currentTime;
                document.getElementById("youtubeTime").textContent = formatTime(currentTime) + " / " + formatTime(duration);
            }
        });

        audioTimeline.max = translatedAudio.duration || 0;
        audioTimeline.value = translatedAudio.currentTime || 0;
        document.getElementById("audioTime").textContent = formatTime(translatedAudio.currentTime) + " / " + formatTime(translatedAudio.duration);
    }

    function checkForPause() {
        if (!youtubeTabId) return;

        chrome.scripting.executeScript({
            target: { tabId: youtubeTabId },
            func: () => document.querySelector("video")?.currentTime
        }, (results) => {
            const currentTime = results?.[0]?.result;
            if (!currentTime) return;

            const pauseEntry = pauseInstructions.find(p => Math.abs(p.time - currentTime) < 0.1);

            if (pauseEntry) {
                console.log(`⏸ Pausing video at ${pauseEntry.time}s for ${pauseEntry.duration}s`);

                chrome.scripting.executeScript({
                    target: { tabId: youtubeTabId },
                    func: () => {
                        const video = document.querySelector("video");
                        if (video) video.pause();
                    }
                });

                setTimeout(() => {
                    console.log(`▶ Resuming video after ${pauseEntry.duration}s`);
                    chrome.scripting.executeScript({
                        target: { tabId: youtubeTabId },
                        func: () => {
                            const video = document.querySelector("video");
                            if (video) video.play();
                        }
                    });
                }, pauseEntry.duration * 1000);

                pauseInstructions = pauseInstructions.filter(p => p.time !== pauseEntry.time);
            }
        });
    }

    youtubePlayButton.addEventListener("click", () => {
        if (!youtubeTabId || isNaN(youtubeTabId)) {
            console.error("❌ Invalid YouTube tab ID");
            return;
        }
    
        chrome.scripting.executeScript({
            target: { tabId: youtubeTabId },
            func: () => {
                const video = document.querySelector("video");
                if (!video) {
                    console.warn("⚠️ No video element found on the page.");
                    return "no-video";
                }
    
                if (video.paused) {
                    video.play();
                    return "playing";
                } else {
                    video.pause();
                    return "paused";
                }
            }
        }, (results) => {
            const result = results?.[0]?.result;
            console.log("▶️ YouTube play toggle result:", result);
    
            if (result === "playing") {
                translatedAudio.play();
                youtubePlayButton.textContent = "⏸️";
            } else if (result === "paused") {
                translatedAudio.pause();
                youtubePlayButton.textContent = "▶️";
            } else if (result === "no-video") {
                alert("No YouTube video detected in the tab.");
            } else {
                console.warn("⚠️ Unknown result or tab access failed.");
            }
        });
    });
    

    youtubeTimeline.addEventListener("mousedown", () => isDraggingYoutube = true);
    youtubeTimeline.addEventListener("mouseup", () => isDraggingYoutube = false);
    youtubeTimeline.addEventListener("input", (event) => {
        if (!isDraggingYoutube || !youtubeTabId) return;
        const newTime = parseFloat(event.target.value);

        chrome.scripting.executeScript({
            target: { tabId: youtubeTabId },
            func: (time) => {
                const video = document.querySelector("video");
                if (video) video.currentTime = time;
            },
            args: [newTime]
        });

        translatedAudio.currentTime = newTime;
        updateTimelineDisplays();
    });

    audioTimeline.addEventListener("mousedown", () => isDraggingAudio = true);
    audioTimeline.addEventListener("mouseup", () => isDraggingAudio = false);
    audioTimeline.addEventListener("input", (event) => {
        if (!isDraggingAudio) return;
        translatedAudio.currentTime = parseFloat(event.target.value);
        updateTimelineDisplays();
    });

    function updateTimelineDisplays() {
        document.getElementById("youtubeTime").textContent = formatTime(youtubeTimeline.value) + " / " + formatTime(youtubeTimeline.max);
        document.getElementById("audioTime").textContent = formatTime(audioTimeline.value) + " / " + formatTime(audioTimeline.max);
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return "00:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    audioPlayButton.addEventListener("click", () => {
        if (translatedAudio.paused) {
            translatedAudio.play();
            audioPlayButton.textContent = "⏸️";
        } else {
            translatedAudio.pause();
            audioPlayButton.textContent = "▶️";
        }
    });

    closeButton.addEventListener("click", () => {
        window.close();
    });

    await fetchPauseInstructions();

    setInterval(() => {
        syncTimelines();
        checkForPause();
    }, 500);
});
