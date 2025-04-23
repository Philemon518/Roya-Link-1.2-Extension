document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const audioUrl = urlParams.get("audio");
    const logUrl = urlParams.get("log");
    const creditsUsed = urlParams.get("credits_used");
    let creditsRemaining = urlParams.get("credits_remaining");

    const creditUsedDisplay = document.getElementById("creditsUsed");
    const remainingCreditDisplay = document.getElementById("creditsRemaining");

    if (creditUsedDisplay) creditUsedDisplay.textContent = creditsUsed || "0";
    if (remainingCreditDisplay) remainingCreditDisplay.textContent = creditsRemaining || "error";

    document.getElementById("openPlayerBtn").addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const youtubeTabId = tabs[0]?.id;
    
            if (!youtubeTabId) {
                console.error("❌ Could not find YouTube tab ID");
                return;
            }
    
            const audioUrl = new URLSearchParams(window.location.search).get("audio");
            const logUrl = new URLSearchParams(window.location.search).get("log");
            const creditsUsed = new URLSearchParams(window.location.search).get("credits_used");
            const creditsRemaining = new URLSearchParams(window.location.search).get("credits_remaining");
    
            const fullUrl = chrome.runtime.getURL(
                `html/player.html?audio=${encodeURIComponent(audioUrl)}&log=${encodeURIComponent(logUrl)}&credits_used=${creditsUsed}&credits_remaining=${creditsRemaining}&yt=${youtubeTabId}`
            );
    
            window.open(fullUrl, "PlayerWindow", "popup,width=400,height=250,resizable=no");
        });
    });
    

    document.getElementById("homeButton").addEventListener("click", () => {
        window.location.href = "../html/home.html";
    });
});
