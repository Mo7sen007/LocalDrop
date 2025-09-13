document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("error");

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password })
    });

    if (response.redirected) {
      window.location.href = response.url;
    } else if (!response.ok) {
      const text = await response.text();
      errorMsg.textContent = text || "Login failed";
    }
  } catch (err) {
    errorMsg.textContent = "Error connecting to server";
  }
});
