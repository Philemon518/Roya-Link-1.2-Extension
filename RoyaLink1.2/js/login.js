const SERVER_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", async () => {
    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("errorMessage");

    let deviceToken = localStorage.getItem("deviceToken");

    // Generate and store a device token if not available
    if (!deviceToken) {
        deviceToken = crypto.randomUUID();
        localStorage.setItem("deviceToken", deviceToken);
        console.log("Generated new device token:", deviceToken);
    } else {
        console.log("Found existing device token:", deviceToken);
    }

    // 🔹 Function to validate device token with backend
    const validateDevice = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/validate-device`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ device_token: deviceToken }),
            });

            const validateData = await response.json();
            console.log("Device validation response:", validateData);

            if (validateData.status === "authenticated") {
                console.log("✅ Device authenticated. Redirecting to homepage.");
                window.location.href = "../html/home.html";
            } else if (validateData.status === "new_device") {
                console.log("Device not recognized. Showing login form.");
                document.getElementById("loginContainer").style.display = "block";
            } else {
                console.error("❌ Unexpected response:", validateData);
                document.getElementById("loginContainer").style.display = "block";
            }
        } catch (error) {
            console.error("❌ Error validating device:", error);
            document.getElementById("loginContainer").style.display = "block";
        }
    };

    // Call validateDevice when the page loads
    await validateDevice();

    // 🔹 Function to handle user login
    const handleLogin = async (username, password) => {
        try {
            console.log("Attempting login with:", username, password, deviceToken);

            const response = await fetch(`${SERVER_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    password,
                    device_token: deviceToken,
                }),
            });

            const data = await response.json();
            console.log("Login response:", data);

            if (data.status === "authenticated") {
                console.log("✅ Login successful. Redirecting to homepage.");
                localStorage.setItem("deviceToken", deviceToken); // Save device token
                window.location.href = "../html/home.html"; // Redirect to homepage
            } else {
                console.error("❌ Login failed:", data.message);
                errorMessage.textContent = "Invalid username or password.";
                errorMessage.style.display = "block";
            }
        } catch (error) {
            console.error("❌ Login error:", error);
            errorMessage.textContent = "Login failed. Please check your internet connection.";
            errorMessage.style.display = "block";
        }
    };

    // 🔹 Attach event listener to the login form
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault(); // Prevent page refresh

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            errorMessage.textContent = "Username and password are required.";
            errorMessage.style.display = "block";
            return;
        }

        handleLogin(username, password);
    });
});
