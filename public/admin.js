document.addEventListener("DOMContentLoaded", () => {
  const createForm = document.getElementById("create-user-form");
  const createMessage = document.getElementById("create-message");
  const newUsernameInput = document.getElementById("new-username");
  const newPasswordInput = document.getElementById("new-password");
  const adminPasswordInput = document.getElementById("admin-password");
  const usersGrid = document.getElementById("users-grid");
  const usersMessage = document.getElementById("users-message");

  // Create user
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = newUsernameInput.value.trim();
    const password = newPasswordInput.value.trim();
    const adminPassword = adminPasswordInput.value.trim();

    if (!username || !password || !adminPassword) {
      showMessage(createMessage, "All fields required", "error");
      return;
    }

    createForm.classList.add("loading");

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, adminPassword })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.ok) {
        showMessage(createMessage, `✅ ${data.msg}`, "success");
        newUsernameInput.value = "";
        newPasswordInput.value = "";
        adminPasswordInput.value = "";

        // Reload users list after slight delay
        setTimeout(() => loadUsers(), 500);
      } else {
        showMessage(createMessage, `❌ ${data.msg}`, "error");
      }
    } catch (err) {
      showMessage(createMessage, `❌ Error: ${err.message}`, "error");
    } finally {
      createForm.classList.remove("loading");
    }
  });

  // Load users
  window.loadUsers = async function() {
    const adminPassword = adminPasswordInput.value.trim();

    if (!adminPassword) {
      showMessage(usersMessage, "Enter admin password first", "error");
      return;
    }

    usersGrid.innerHTML = '<p style="opacity: 0.6;">Loading...</p>';

    try {
      const res = await fetch(`/api/admin/users?adminPassword=${encodeURIComponent(adminPassword)}`);
      const data = await res.json();

      if (data.ok) {
        if (data.users.length === 0) {
          usersGrid.innerHTML = '<p style="opacity: 0.6;">No users yet</p>';
          return;
        }

        usersGrid.innerHTML = "";
        data.users.forEach(user => {
          const card = document.createElement("div");
          card.className = "user-card";
          card.innerHTML = `<strong>${user}</strong>`;
          usersGrid.appendChild(card);
        });

        showMessage(usersMessage, `✅ Loaded ${data.users.length} user(s)`, "success");
      } else {
        showMessage(usersMessage, `❌ ${data.msg}`, "error");
        usersGrid.innerHTML = '<p style="opacity: 0.6;">Failed to load users</p>';
      }
    } catch (err) {
      showMessage(usersMessage, `❌ Error: ${err.message}`, "error");
      usersGrid.innerHTML = '<p style="opacity: 0.6;">Error loading users</p>';
    }
  };

  function showMessage(el, msg, type) {
    el.textContent = msg;
    el.className = `message show ${type}`;

    setTimeout(() => {
      el.classList.remove("show");
    }, 5000);
  }
});
