const SERVER_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", async () => {
    const LANGUAGE_MAP = {
        "arb": { name: "Arabic", regions: ["Middle East", "Africa"] },
        "ben": { name: "Bengali", regions: ["Asia"] },
        "cat": { name: "Catalan", regions: ["Europe"] },
        "ces": { name: "Czech", regions: ["Europe"] },
        "dan": { name: "Danish", regions: ["Europe"] },
        "nld": { name: "Dutch", regions: ["Europe"] },
        "est": { name: "Estonian", regions: ["Europe"] },
        "fin": { name: "Finnish", regions: ["Europe"] },
        "fra": { name: "French", regions: ["Europe", "Africa"] },
        "deu": { name: "German", regions: ["Europe"] },
        "hin": { name: "Hindi", regions: ["Asia"] },
        "ind": { name: "Indonesian", regions: ["Asia"] },
        "ita": { name: "Italian", regions: ["Europe"] },
        "jpn": { name: "Japanese", regions: ["Asia"] },
        "kan": { name: "Kannada", regions: ["Asia"] },
        "kor": { name: "Korean", regions: ["Asia"] },
        "mlt": { name: "Maltese", regions: ["Europe"] },
        "cmn": { name: "Mandarin Chinese", regions: ["Asia"] },
        "pol": { name: "Polish", regions: ["Europe"] },
        "por": { name: "Portuguese", regions: ["Europe", "South America", "Africa"] },
        "ron": { name: "Romanian", regions: ["Europe"] },
        "rus": { name: "Russian", regions: ["Europe", "Asia"] },
        "slk": { name: "Slovak", regions: ["Europe"] },
        "spa": { name: "Spanish", regions: ["Europe", "South America"] },
        "swe": { name: "Swedish", regions: ["Europe"] },
        "swh": { name: "Swahili", regions: ["Africa"] },
        "tam": { name: "Tamil", regions: ["Asia"] },
        "tel": { name: "Telugu", regions: ["Asia"] },
        "tgl": { name: "Tagalog (Filipino)", regions: ["Asia"] },
        "tha": { name: "Thai", regions: ["Asia"] },
        "tur": { name: "Turkish", regions: ["Europe", "Middle East"] },
        "ukr": { name: "Ukrainian", regions: ["Europe"] },
        "urd": { name: "Urdu", regions: ["Asia", "Middle East"] },
        "uzn": { name: "Uzbek", regions: ["Asia"] },
        "vie": { name: "Vietnamese", regions: ["Asia"] },
        "cym": { name: "Welsh", regions: ["Europe"] },
        "pes": { name: "Western Persian (Farsi)", regions: ["Middle East"] },
    };
    
   

    // DOM Elements
    const languageList = document.getElementById("languageList");
    const translateButton = document.getElementById("translateButton");
    const videoTimeline = document.getElementById("videoTimeline");
    const playPauseButton = document.getElementById("playPauseButton");
    const videoTimeDisplay = document.getElementById("videoTime"); // Time Display
    const creditsDisplay = document.getElementById("creditsDisplay");
    const usernameDisplay = document.getElementById("username");
    const filterContainer = document.querySelector(".filters");
    const logoutButton = document.getElementById("logoutButton");

    let selectedFilters = [];
    let recentLanguages = JSON.parse(localStorage.getItem("recentLanguages")) || [];

    let selectedLanguage = null;
    let deviceToken = localStorage.getItem("deviceToken");
    let username = localStorage.getItem("username");

    // **FILTER HANDLING**
    const FILTERS = ["Recent", "Europe", "Asia", "Middle East", "Africa", "South America"];

    // Populate filters
    FILTERS.forEach(filter => {
        const filterSpan = document.createElement("span");
        filterSpan.className = "filter";
        filterSpan.textContent = filter;
        filterSpan.addEventListener("click", () => toggleFilter(filter, filterSpan));
        filterContainer.appendChild(filterSpan);
    });

    // Toggle filter selection and update list
    function toggleFilter(filter, element) {
        // Deselect all filters first
        document.querySelectorAll(".filter").forEach(el => {
            el.classList.remove("selected");
            el.innerHTML = el.textContent.replace(" ✖", ""); // Reset text
        });

        // If the clicked filter is already selected, deselect it
        if (selectedFilters.includes(filter)) {
            selectedFilters = [];
        } else {
            selectedFilters = [filter]; // Only allow one filter
            element.innerHTML = `${filter} ✖`;
            element.classList.add("selected");
        }

        populateLanguages();
    }


    // **LANGUAGE LIST POPULATION**
    function populateLanguages() {
        languageList.innerHTML = "";

        let filteredLanguages = Object.entries(LANGUAGE_MAP)
            .filter(([code, data]) => {
                if (selectedFilters.length === 0) return true;
                return selectedFilters.some(filter => data.regions.includes(filter));
            });

        // Handle "Recent" filter separately
        if (selectedFilters.includes("Recent")) {
            filteredLanguages = recentLanguages.map(code => [code, LANGUAGE_MAP[code]]);
        }

        filteredLanguages.forEach(([code, data]) => {
            const div = document.createElement("div");
            div.className = "language";
            div.textContent = data.name;
            div.dataset.code = code;

            div.addEventListener("click", () => {
                document.querySelectorAll(".language").forEach(el => el.classList.remove("selected"));
                div.classList.add("selected");
                selectedLanguage = code;

                // Update recent languages
                if (!recentLanguages.includes(code)) {
                    if (recentLanguages.length >= 3) recentLanguages.shift();
                    recentLanguages.push(code);
                    localStorage.setItem("recentLanguages", JSON.stringify(recentLanguages));
                }
            });

            languageList.appendChild(div);
        });
    }

    // ✅ Display Username from Backend Response
    if (username) {
        usernameDisplay.textContent = `${username}`;
    }

    // ✅ Fetch User Credits & Message
    const fetchCredits = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const video_url = tab.url;
            
            const response = await fetch(`${SERVER_URL}/validate-device`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ device_token: deviceToken, video_url }),
            });

            const data = await response.json();
            if (data.status === "authenticated") {
                creditsDisplay.textContent = `${data.credits} Credits`;
                usernameDisplay.textContent = data.message; // Display backend message
                localStorage.setItem("username", data.username);

                if (data.required_credits !== undefined) {
                    document.getElementById("requiredCreditsDisplay").textContent = `This video will cost: ${data.required_credits} credits`;
                }
            } else {
                console.warn("Device not recognized. Redirecting to login.");
                window.location.href = "../html/login.html";
            }
        } catch (error) {
            console.error("Error validating device:", error);
            window.location.href = "../html/login.html";
        }
    };
    await fetchCredits();

    // Initial population
    populateLanguages();

    // ✅ Fix YouTube Timeline Updates & Sync Time Display
    const updateYouTubeTimeline = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length || !tabs[0].id) return;

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    const video = document.querySelector("video");
                    if (!video) return null;
                    return { currentTime: video.currentTime, duration: video.duration };
                },
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error("Error accessing video:", chrome.runtime.lastError);
                    return;
                }

                if (results && results[0]?.result) {
                    const { currentTime, duration } = results[0].result;
                    if (duration && !isNaN(duration)) {
                        videoTimeline.max = 100;
                        videoTimeline.value = (currentTime / duration) * 100;
                        videoTimeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
                    }
                }
            });
        });
    };
    setInterval(updateYouTubeTimeline, 1000);

    // ✅ Enable Manual Seeking
    videoTimeline.addEventListener("input", (event) => {
        const seekPercentage = event.target.value;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length || !tabs[0].id) return;

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (seekPercentage) => {
                    const video = document.querySelector("video");
                    if (video) {
                        video.currentTime = (seekPercentage / 100) * video.duration;
                    }
                },
                args: [seekPercentage],
            });
        });
    });

    // ✅ Play/Pause YouTube Video & Update Button
    playPauseButton.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length || !tabs[0].id) return;

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    const video = document.querySelector("video");
                    if (!video) return;
                    if (video.paused) {
                        video.play();
                        return "playing";
                    } else {
                        video.pause();
                        return "paused";
                    }
                },
            }, (results) => {
                if (results && results[0]?.result) {
                    playPauseButton.innerHTML = results[0].result === "playing" ? "⏸️" : "▶️";
                }
            });
        });
    });

    // ✅ Handle Translation Request
    translateButton.addEventListener("click", async () => {
        if (!selectedLanguage) {
            alert("Please select a language.");
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length || !tabs[0].url) {
                alert("No active YouTube video detected.");
                return;
            }

            const youtubeUrl = tabs[0].url;
            console.log(`Redirecting to loading page for ${youtubeUrl} in ${selectedLanguage}`);

            // ✅ Store values in sessionStorage so `loading.js` can access them
            sessionStorage.setItem("youtube_url", youtubeUrl);
            sessionStorage.setItem("language_code", selectedLanguage);
            sessionStorage.setItem("device_token", deviceToken);

            // ✅ Redirect to loading page
            window.location.href = "../html/loading.html";
        });
    });


    

    // ✅ Helper Function to Format Time (MM:SS)
    const formatTime = (time) => {
        if (isNaN(time) || time < 0) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    document.getElementById("logoutLink").addEventListener("click", async () => {
        const deviceToken = localStorage.getItem("deviceToken");
    
        if (!deviceToken) {
            window.location.href = "../html/login.html"; // Redirect if not logged in
            return;
        }
    
        try {
            const response = await fetch(`${SERVER_URL}/logout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ device_token: deviceToken }),
            });
    
            const data = await response.json();
            if (data.status === "signed_out") {
                console.log("✅ Logged out successfully");
                localStorage.removeItem("deviceToken"); // Remove stored token
                window.location.href = "../html/login.html"; // Redirect to login page
            } else {
                console.error("❌ Logout failed:", data.message);
            }
        } catch (error) {
            console.error("❌ Error logging out:", error);
        }
    });
    
});
