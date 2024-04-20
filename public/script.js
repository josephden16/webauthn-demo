const { startRegistration, startAuthentication, browserSupportsWebAuthn } =
  SimpleWebAuthnBrowser;

document.addEventListener("DOMContentLoaded", function () {
  const usernameInput = document.getElementById("username");
  const registerBtn = document.getElementById("registerBtn");
  const loginBtn = document.getElementById("loginBtn");
  const errorDiv = document.getElementById("error");
  const loginForm = document.getElementById("loginForm");
  const welcomeMessage = document.getElementById("welcomeMessage");
  const usernameDisplay = document.getElementById("usernameDisplay");

  registerBtn.addEventListener("click", handleRegister);
  loginBtn.addEventListener("click", handleLogin);

  async function handleRegister(evt) {
    errorDiv.textContent = "";
    errorDiv.style.display = "none";

    const userName = usernameInput.value;

    if (!browserSupportsWebAuthn()) {
      return alert("This browser does not support WebAuthn");
    }

    const resp = await fetch(`/api/register/start?username=${userName}`, {
      credentials: "include",
      headers: {
        "ngrok-skip-browser-warning": "69420",
      },
    });
    const registrationOptions = await resp.json();
    let authResponse;
    try {
      authResponse = await startRegistration(registrationOptions);
    } catch (error) {
      if (error.name === "InvalidStateError") {
        errorDiv.textContent =
          "Error: Authenticator was probably already registered by user";
      } else {
        errorDiv.textContent = error.message;
      }
    }

    if (!authResponse) {
      errorDiv.textContent = "Failed to connect with your device";
      return;
    }

    const verificationResp = await fetch(
      `/api/register/verify?username=${userName}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "69420",
        },
        body: JSON.stringify(authResponse),
      }
    );

    if (!verificationResp.ok) {
      errorDiv.textContent = "Oh no, something went wrong!";
      return;
    }

    const verificationJSON = await verificationResp.json();

    if (verificationJSON && verificationJSON.verified) {
      alert("Registration successful! You can now login");
    } else {
      errorDiv.textContent = "Oh no, something went wrong!";
    }
  }
});
