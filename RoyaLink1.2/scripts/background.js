const SERVER_URL = "http://127.0.0.1:8000";
const WS_SERVER = "ws://127.0.0.1:8000";

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);

    if (message.action === "validateDevice") {
        console.log("Validating device token:", message.deviceToken);

        fetch(`${SERVER_URL}/validate-device`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device_token: message.deviceToken })
        })
        .then(response => response.json())
        .then(data => {
            console.log("Response from validate-device:", data);
            sendResponse(data);
        })
        .catch(error => {
            console.error("Error validating device:", error);
            sendResponse({ status: "error", message: error.message });
        });

        return true; // Required for async response
    } 
    
    else if (message.action === "loginUser") {
        console.log("Logging in user:", message.username);

        fetch(`${SERVER_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                username: message.username, 
                password: message.password, 
                device_token: message.deviceToken 
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("Response from login:", data);

            if (data.status === "authenticated") {
                // Save authenticated token
                chrome.storage.local.set({ deviceToken: message.deviceToken }, () => {
                    sendResponse(data);
                });
            } else {
                sendResponse(data);
            }
        })
        .catch(error => {
            console.error("Error logging in user:", error);
            sendResponse({ status: "error", message: error.message });
        });

        return true; // Required for async response
    }
});
