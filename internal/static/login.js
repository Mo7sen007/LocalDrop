document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("error");
  const submitButton = document.querySelector('.login-button');
  const buttonText = document.querySelector('.button-text');
  const spinner = document.querySelector('.spinner');

  // Clear any previous error messages
  errorMsg.classList.remove('show', 'success');
  
  // Validate inputs
  if (!username || !password) {
    showError("Please fill in all fields");
    return;
  }

  // Show loading state
  setLoadingState(true);

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ 
        username: username, 
        password: password 
      })
    });

    // Handle successful response
    if (response.ok) {
      // Check if server sent a redirect
      if (response.redirected) {
        showSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          window.location.href = response.url;
        }, 1000);
      } else {
        // Handle JSON response or direct redirect
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (data.redirect) {
            showSuccess("Login successful! Redirecting...");
            setTimeout(() => {
              window.location.href = data.redirect;
            }, 1000);
          } else if (data.success) {
            showSuccess("Login successful! Redirecting...");
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 1000);
          }
        } else {
          // Assume success and redirect to dashboard
          showSuccess("Login successful! Redirecting...");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1000);
        }
      }
    } else {
      // Handle error responses
      let errorMessage = "Login failed";
      
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
      } catch (parseError) {
        // If we can't parse the error response, use default message
        errorMessage = `Login failed (${response.status})`;
      }

      showError(errorMessage);
    }
  } catch (err) {
    console.error('Login error:', err);
    showError("Error connecting to server. Please try again.");
  } finally {
    // Always reset loading state
    setLoadingState(false);
  }

  function setLoadingState(isLoading) {
    if (isLoading) {
      submitButton.disabled = true;
      buttonText.style.display = 'none';
      spinner.style.display = 'inline-block';
    } else {
      submitButton.disabled = false;
      buttonText.style.display = 'inline';
      spinner.style.display = 'none';
    }
  }

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.remove('success');
    errorMsg.classList.add('show');
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      errorMsg.classList.remove('show');
    }, 5000);
  }

  function showSuccess(message) {
    errorMsg.textContent = message;
    errorMsg.classList.add('success', 'show');
  }
});

// Add input focus effects
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('focus', function() {
    this.parentElement.style.transform = 'translateY(-2px)';
  });
  
  input.addEventListener('blur', function() {
    this.parentElement.style.transform = 'translateY(0)';
  });
  
  // Clear error when user starts typing
  input.addEventListener('input', function() {
    const errorMsg = document.getElementById("error");
    if (errorMsg.classList.contains('show') && !errorMsg.classList.contains('success')) {
      errorMsg.classList.remove('show');
    }
  });
});

// Handle Enter key in password field
document.getElementById('password').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
  }
});