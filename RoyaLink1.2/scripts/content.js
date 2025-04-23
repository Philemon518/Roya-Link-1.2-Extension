chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "pauseVideo") {
        document.querySelector("video")?.pause();
    } else if (message.action === "playVideo") {
        document.querySelector("video")?.play();
    }
});







