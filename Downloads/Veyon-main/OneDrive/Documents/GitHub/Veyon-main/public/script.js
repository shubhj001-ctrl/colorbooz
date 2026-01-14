document.addEventListener("DOMContentLoaded", () => {
  // Initialize Socket.IO with robust reconnection
  const socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling']
  });

  /* ========= LOADING SCREEN WATER FILL ========= */
  const loadingScreen = document.getElementById("loading-screen");
  const fillRect = document.getElementById("fillRect");
  const pingValue = document.getElementById("ping-value");
  
  let fillPercentage = 0;
  let loadingPhase = 0; // 0: init, 1: socket connect, 2: auth check, 3: users load, 4: complete
  const phaseProgression = [0, 25, 50, 75, 100];
  
  function updateLoadingFill() {
    // Smoothly interpolate fill to target
    const targetFill = phaseProgression[loadingPhase];
    fillPercentage += (targetFill - fillPercentage) * 0.08;
    
    if (fillPercentage < 0) fillPercentage = 0;
    if (fillPercentage > 100) fillPercentage = 100;
    
    // Width should be: 0 to 400 (based on SVG viewBox width of 500)
    const fillWidth = (fillPercentage / 100) * 400;
    fillRect.setAttribute("width", fillWidth);
    
    // Update ping display with loading phase
    const phases = ["Initializing", "Connecting", "Authenticating", "Loading", "Ready"];
    pingValue.textContent = phases[loadingPhase] || "Loading...";
    
    if (fillPercentage < 99 || loadingPhase < 4) {
      requestAnimationFrame(updateLoadingFill);
    }
  }
  
  // Start the fill animation
  updateLoadingFill();
  
  // Track loading progress
  socket.on("connect", () => {
    console.log("✅ Socket connected");
    loadingPhase = 1;
  });
  
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected");
  });

  /* ========= AUTHENTICATION ELEMENTS ========= */
  const authScreen = document.getElementById("auth-screen");
  const loginView = document.getElementById("login-view");
  const registerView = document.getElementById("register-view");
  
  const loginForm = document.getElementById("login-form");
  const loginUsername = document.getElementById("login-username");
  const loginPassword = document.getElementById("login-password");
  const loginBtn = document.getElementById("login-btn");
  const loginError = document.getElementById("login-error");
  
  const switchToRegisterBtn = document.getElementById("switch-to-register");
  const switchToLoginBtn = document.getElementById("switch-to-login");
  const coreLoginBtn = document.getElementById("core-login-btn");
  
  // Registration form (single form with all fields)
  const registrationForm = document.getElementById("registration-form");
  const registerFirstName = document.getElementById("register-firstName");
  const registerLastName = document.getElementById("register-lastName");
  const registerEmail = document.getElementById("register-email");
  const registerPhone = document.getElementById("register-phone");
  const registerPassword = document.getElementById("register-password");
  const registerPasswordConfirm = document.getElementById("register-password-confirm");
  const createAccountBtn = document.getElementById("create-account-btn");
  const registrationMessage = document.getElementById("registration-message");
  const passwordInputGroup = document.getElementById("password-input-group");
  const confirmPasswordInputGroup = document.getElementById("confirm-password-input-group");
  const passwordToggle1 = document.getElementById("password-toggle-1");
  const passwordToggle2 = document.getElementById("password-toggle-2");

  // Registration state (simplified)

  /* ========= APP ELEMENTS ========= */
  const app = document.getElementById("app");
  
  const sidebar = document.querySelector(".sidebar");
  const userList = document.getElementById("user-list");
  const userSearch = document.getElementById("user-search");
  const logoutBtn = document.getElementById("logout-btn");
  
  const chatArea = document.querySelector(".chat-area");
  const chatHeader = document.querySelector(".chat-header");
  const chatTitle = document.getElementById("chat-title");
  const chatAvatarLetter = document.getElementById("chat-avatar-letter");
  const chatBox = document.getElementById("chat-box");
  const emptyChat = document.getElementById("empty-chat");
  
  const chatFooter = document.getElementById("chat-footer");
  const messageInput = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const mediaBtn = document.getElementById("media-btn");
  const mediaInput = document.getElementById("media-input");
  const emojiBtn = document.getElementById("emoji-btn");
  const emojiPicker = document.getElementById("emoji-picker");
  
  const replyPreview = document.getElementById("reply-preview");
  const replyUser = document.getElementById("reply-user");
  const replyText = document.getElementById("reply-text");
  const cancelReplyBtn = document.getElementById("cancel-reply");
  
  const mediaPreview = document.getElementById("media-preview");
  const mediaPreviewImg = document.getElementById("media-preview-img");
  const removeMediaBtn = document.getElementById("remove-media");
  
  const typingBubble = document.getElementById("typing-bubble");
  const messageMenu = document.getElementById("message-menu");
  const reactionPicker = document.getElementById("reaction-picker");
  const imageOverlay = document.getElementById("image-preview-overlay");
  const imageOverlayImg = document.getElementById("image-preview-img");
  const imageOverlayClose = document.getElementById("image-preview-close");

  /* ========= NOTIFICATION HELPER ========= */
  function showNotification(title, message) {
    // Play notification sound (using Web Audio API)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.log("Audio notification not available");
    }

    // Browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message, icon: '/favicon.ico' });
    }
  }

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  /* ========= STATE ========= */
  let currentUser = null;
  let currentChat = null;
  let replyTarget = null;
  let allUsers = [];
  let unreadCounts = JSON.parse(localStorage.getItem("veyon_unread") || "{}");
  let selectedMedia = null;
  let reactionsMap = {};
  let typingTimeout = null;
  let registrationEmail = null;
  let selectedMessageTimestamp = null;

  /* ========= AUTH SCREEN FLOW ========= */
  function switchToLogin() {
    authScreen.classList.remove("hidden");
    loginView.classList.add("active");
    registerView.classList.remove("active");
    loginUsername.focus();
  }

  function switchToRegister() {
    authScreen.classList.remove("hidden");
    registerView.classList.remove("hidden");
    registerView.classList.add("active");
    loginView.classList.remove("active");
    registerFirstName.focus();
  }

  switchToRegisterBtn.addEventListener("click", switchToRegister);
  switchToLoginBtn.addEventListener("click", () => {
    switchToLogin();
    resetRegistration();
  });

  /* ========= LOGIN LOGIC ========= */
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    loginBtn.disabled = true;
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.value.trim(),
          password: loginPassword.value
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      
      currentUser = data.username;
      localStorage.setItem("veyon_user", data.username);
      localStorage.setItem("veyon_pass", loginPassword.value);
      
      // Progress loading phases
      loadingPhase = 2; // Authenticating
      await new Promise(r => setTimeout(r, 300));
      loadingPhase = 3; // Loading
      await new Promise(r => setTimeout(r, 300));
      loadingPhase = 4; // Ready
      
      // Wait for fill animation to complete, then show app
      setTimeout(async () => {
        loadingScreen.classList.add("hidden");
        await showApp();
        // If user arrived via invite, accept it now
        const token = localStorage.getItem('veyon_invite_token');
        if (token) {
          try {
            await fetch('/api/invite/accept', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, username: currentUser })
            });
          } catch (err) { console.error('Invite accept failed', err); }
          localStorage.removeItem('veyon_invite_token');
        }
      }, 800);
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove("hidden");
    } finally {
      loginBtn.disabled = false;
    }
  });

  /* ========= REGISTRATION LOGIC (Single Form) ========= */

  function resetRegistration() {
    registerFirstName.value = "";
    registerLastName.value = "";
    registerEmail.value = "";
    if (registerPhone) registerPhone.value = "";
    registerPassword.value = "";
    registerPasswordConfirm.value = "";
    registrationMessage.textContent = "";
    passwordInputGroup.classList.add("hidden");
    confirmPasswordInputGroup.classList.add("hidden");
    createAccountBtn.classList.remove("hidden");
  }


  // Password visibility toggle
  passwordToggle1.addEventListener("click", (e) => {
    e.preventDefault();
    const type = registerPassword.type === "password" ? "text" : "password";
    registerPassword.type = type;
    passwordToggle1.textContent = type === "password" ? "👁" : "👁‍🗨";
  });

  passwordToggle2.addEventListener("click", (e) => {
    e.preventDefault();
    const type = registerPasswordConfirm.type === "password" ? "text" : "password";
    registerPasswordConfirm.type = type;
    passwordToggle2.textContent = type === "password" ? "👁" : "👁‍🗨";
  });

  // Submit Registration Form
  registrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = registerFirstName.value.trim();
    const lastName = registerLastName.value.trim();
    const email = registerEmail.value.trim();
    const phone = registerPhone ? registerPhone.value.trim() : '';
    const password = registerPassword.value;
    const passwordConfirm = registerPasswordConfirm.value;

    if (!firstName || !lastName || !email || !password) {
      registrationMessage.textContent = "Please fill in all required fields.";
      registrationMessage.classList.add("show");
      return;
    }

    if (password.length < 6) {
      registrationMessage.textContent = "Password must be at least 6 characters.";
      return;
    }

    if (password !== passwordConfirm) {
      registrationMessage.textContent = "Passwords do not match.";
      return;
    }

    // Client-side basic disposable email check
    const bannedKeywords = ['test','spam','temp','mailinator','10minut','tempmail','disposable','example'];
    const lowerEmail = email.toLowerCase();
    for (const kw of bannedKeywords) {
      if (lowerEmail.includes(kw)) {
        registrationMessage.textContent = 'Please use a real email address (no disposable or test domains).';
        return;
      }
    }

    createAccountBtn.disabled = true;
    registrationMessage.textContent = "Creating your account...";
    registrationMessage.classList.add("show");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, phone })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.msg || "Registration failed");
      registrationMessage.textContent = "✅ Account created! Redirecting to login...";

      // Reset form and redirect to login after 1.5 seconds
      setTimeout(() => {
        resetRegistration();
        switchToLogin();
      }, 1500);
    } catch (err) {
      registrationMessage.textContent = err.message;
    } finally {
      createAccountBtn.disabled = false;
    }
  });

  // Password visibility toggles (keep previous behavior)

  /* ========= ADMIN LOGIN ========= */
  coreLoginBtn.addEventListener("click", () => {
    window.location.href = "/admin-login.html";
  });

  /* ========= EMOJI PICKER ========= */
  emojiBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle("hidden");
  });

  // Close emoji picker when clicking outside
  document.addEventListener("click", (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
      emojiPicker.classList.add("hidden");
    }
  });

  // Insert emoji into message input
  document.querySelectorAll(".emoji-item").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const emoji = btn.dataset.emoji;
      messageInput.value += emoji;
      messageInput.focus();
      emojiPicker.classList.add("hidden");
    });
  });

  /* ========= ENHANCEMENTS: ENTER TO SEND & MOBILE ACTIONS ========= */

  // Enter key to send message (without Shift)
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });


  /* ========= APP INITIALIZATION ========= */
  async function showApp() {
    authScreen.classList.add("hidden");
    app.classList.remove("hidden");
    socket.emit("user_online", currentUser);
    await loadUsers();
    loadCachedChat();
    messageInput.disabled = false;
    
    // Start system time update in chat header
    const chatSystemTime = document.getElementById("chat-system-time");
    setInterval(() => {
      const now = new Date();
      chatSystemTime.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }, 1000);
    
    // Add invite button to sidebar
    if (!document.getElementById('invite-btn')) {
      const btn = document.createElement('button');
      btn.id = 'invite-btn';
      btn.textContent = '🔗 Invite Friend';
      btn.style.margin = '8px 8px 8px 8px';
      btn.style.padding = '10px 12px';
      btn.style.borderRadius = '8px';
      btn.style.border = '1px solid rgba(59, 130, 246, 0.3)';
      btn.style.background = 'rgba(59, 130, 246, 0.1)';
      btn.style.color = '#3b82f6';
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = '600';
      btn.style.fontSize = '14px';
      btn.style.width = 'calc(100% - 16px)';
      btn.style.transition = 'all 0.2s';
      sidebar.insertBefore(btn, logoutBtn);

      btn.addEventListener('mouseover', () => btn.style.background = 'rgba(59, 130, 246, 0.2)');
      btn.addEventListener('mouseout', () => btn.style.background = 'rgba(59, 130, 246, 0.1)');

      btn.addEventListener('click', () => {
        showInviteModal();
      });
    }

    // Mobile invite shortcut in chat header
    if (!document.getElementById('mobile-invite-btn')) {
      const mbtn = document.createElement('button');
      mbtn.id = 'mobile-invite-btn';
      mbtn.className = 'mobile-only';
      mbtn.title = 'Invite';
      mbtn.style.cssText = 'background:none;border:none;color:var(--accent);font-size:20px;cursor:pointer;margin-right:8px;';
      mbtn.textContent = '🔗';
      chatHeader.insertBefore(mbtn, chatHeader.firstChild);
      mbtn.addEventListener('click', () => showInviteModal());
    }

    // Mobile logout button in chat header
    if (!document.getElementById('mobile-logout-btn')) {
      const lobtn = document.createElement('button');
      lobtn.id = 'mobile-logout-btn';
      lobtn.className = 'mobile-only';
      lobtn.title = 'Logout';
      lobtn.style.cssText = 'background:none;border:none;color:var(--danger);font-size:20px;cursor:pointer;margin-left:8px;';
      lobtn.textContent = '⏻';
      chatHeader.appendChild(lobtn);
      lobtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
          localStorage.removeItem('veyon_user');
          localStorage.removeItem('veyon_pass');
          localStorage.removeItem('veyon_admin');
          location.reload();
        }
      });
    }
  }

  function showInviteModal() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #1e293b;
      padding: 30px;
      border-radius: 12px;
      width: 90%;
      max-width: 400px;
      color: #f1f5f9;
      border: 1px solid #475569;
    `;

    content.innerHTML = `
      <h2 style="margin-bottom: 20px; text-align: center;">Invite Friend</h2>
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
        <button id="share-code-btn" style="padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Share Your Invite Code</button>
        <button id="enter-code-btn" style="padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Enter Friend's Code</button>
      </div>
      <button id="close-modal-btn" style="width: 100%; padding: 10px; background: #475569; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('close-modal-btn').addEventListener('click', () => {
      modal.remove();
    });

    document.getElementById('share-code-btn').addEventListener('click', async () => {
      try {
        const res = await fetch(`/api/users/${currentUser}/invite`);
        const data = await res.json();
        if (!data.ok) throw new Error('Failed to get invite code');
        
        await navigator.clipboard.writeText(data.inviteCode);
        alert(`Invite code copied: ${data.inviteCode}\n\nShare this code with your friend!`);
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });

    document.getElementById('enter-code-btn').addEventListener('click', () => {
      const code = prompt('Enter your friend\'s invite code:');
      if (code) {
        acceptInviteCode(code.trim().toUpperCase());
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  async function acceptInviteCode(code) {
    try {
      const res = await fetch('/api/invite/accept-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, inviteCode: code })
      });
      
      const data = await res.json();
      if (!data.ok) throw new Error(data.msg || 'Invalid code');
      
      alert('✅ Connected! You are now friends with ' + code);
      await loadUsers();
    } catch (err) {
      alert('❌ ' + err.message);
    }
  }

  async function loadUsers() {
    try {
      // Only load connections for current user
      const res = await fetch(`/api/users/${currentUser}/connections`);
      const data = await res.json();
      allUsers = (data.connections || []).filter(u => u !== currentUser);
      renderUserList(allUsers);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }

  async function removeFriend(friendUsername) {
    try {
      const res = await fetch(`/api/users/${currentUser}/remove-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend: friendUsername })
      });
      
      const data = await res.json();
      if (data.ok) {
        // Remove from local list
        allUsers = allUsers.filter(u => u !== friendUsername);
        renderUserList(allUsers);
        
        // Clear chat if currently viewing removed friend
        if (currentChat === friendUsername) {
          currentChat = null;
          chatBox.innerHTML = "";
          emptyChat.style.display = "flex";
          chatFooter.classList.add("hidden");
        }
        
        // Clear local messages
        localStorage.removeItem(`veyon_messages_${friendUsername}`);
        
        alert(`${friendUsername} has been removed from your friends`);
      } else {
        alert(data.msg || 'Failed to remove friend');
      }
    } catch (err) {
      console.error("Failed to remove friend:", err);
      alert('Error removing friend');
    }
  }

  function renderUserList(users) {
    userList.innerHTML = users.map(user => {
      const unread = unreadCounts[user] || 0;
      const lastMsgs = JSON.parse(localStorage.getItem(`veyon_messages_${user}`) || "[]");
      const lastMsgText = lastMsgs.length > 0 ? lastMsgs[lastMsgs.length - 1].text : "No messages yet";
      
      const letter = user[0].toUpperCase();
      return `
        <div class="user-item" data-user="${user}">
          <div class="user-avatar">${letter}</div>
          <div class="user-info">
            <div class="user-name">${user}</div>
            <div class="user-message">${lastMsgText.substring(0, 30)}</div>
          </div>
          ${unread > 0 ? `<div class="user-unread">${unread}</div>` : ''}
          <button class="remove-friend-btn" data-user="${user}" title="Remove friend">✕</button>
        </div>
      `;
    }).join("");
    
    document.querySelectorAll(".user-item").forEach(item => {
      item.addEventListener("click", (e) => {
        // Don't select user if clicking remove button
        if (!e.target.classList.contains('remove-friend-btn')) {
          selectUser(item.dataset.user);
        }
      });
    });
    
    // Add remove friend event listeners
    document.querySelectorAll(".remove-friend-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const friendToRemove = btn.dataset.user;
        if (confirm(`Remove ${friendToRemove} from your friends?`)) {
          await removeFriend(friendToRemove);
        }
      });
    });
  }

  function selectUser(user) {
    currentChat = user;
    document.querySelectorAll(".user-item").forEach(item => {
      item.classList.remove("active");
    });
    document.querySelector(`[data-user="${user}"]`).classList.add("active");
    
    chatTitle.textContent = user;
    chatAvatarLetter.textContent = user[0].toUpperCase();
    chatBox.innerHTML = "";
    emptyChat.style.display = "none";
    chatFooter.classList.remove("hidden");
    
    loadMessages(user);
    socket.emit("user_typing", { from: currentUser, to: user, typing: false });
  }

  function loadMessages(user) {
    try {
      const msgs = JSON.parse(localStorage.getItem(`veyon_messages_${user}`) || "[]");
      msgs.forEach(msg => renderMessage(msg));
      unreadCounts[user] = 0;
      localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
      renderUserList(allUsers);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }

  function loadCachedChat() {
    if (!currentChat) {
      emptyChat.style.display = "flex";
      chatFooter.classList.add("hidden");
    }
  }

  function renderMessage(msg) {
    const isOwn = msg.from === currentUser;
    const div = document.createElement("div");
    div.className = `message ${isOwn ? "own" : ""}`;
    div.dataset.ts = msg.timestamp;
    div.dataset.from = msg.from;
    div.dataset.to = msg.to;
    div.dataset.text = msg.text || '';
    div.innerHTML = `
      <div class="message-bubble">
        ${msg.reply ? `<div class="reply-indicator">Replying to ${msg.reply.from}</div>` : ''}
        ${msg.file ? `<img class="message-image" src="${msg.file}" alt="image">` : ''}
        <div>${escapeHtml(msg.text)}</div>
        <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        <div class="message-reactions"></div>
      </div>
    `;
    // Context menu for message actions (react/reply/copy)
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      selectedMessageTimestamp = msg.timestamp;
      messageMenu.style.left = `${e.pageX}px`;
      messageMenu.style.top = `${e.pageY}px`;
      messageMenu.classList.remove('hidden');
    });
    chatBox.appendChild(div);
    
    // Add image preview click handler
    const imgElement = div.querySelector('.message-image');
    if (imgElement) {
      imgElement.addEventListener('click', (e) => {
        e.stopPropagation();
        imageOverlayImg.src = msg.file;
        imageOverlay.classList.remove("hidden");
      });
      imgElement.style.cursor = 'pointer';
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Logout
  logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("veyon_user");
      localStorage.removeItem("veyon_pass");
      localStorage.removeItem("veyon_admin");
      location.reload();
    }
  });

  // Send message
  sendBtn.addEventListener("click", async () => {
    if (!currentChat || !messageInput.value.trim()) return;
    
    const text = messageInput.value.trim();
    const msg = {
      from: currentUser,
      to: currentChat,
      text,
      timestamp: new Date().toISOString(),
      file: selectedMedia,
      reply: replyTarget
    };
    
    try {
      renderMessage(msg);
      messageInput.value = "";
      selectedMedia = null;
      mediaPreview.classList.remove("show");
      replyTarget = null;
      replyPreview.classList.remove("show");
      
      // Send via socket immediately
      socket.emit("sendMessage", msg);
      
      // Also save to backend
      await fetch("/api/messages/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg)
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  });

  // Media upload
  mediaBtn.addEventListener("click", () => mediaInput.click());
  mediaInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        selectedMedia = event.target.result;
        mediaPreviewImg.src = selectedMedia;
        mediaPreview.classList.add("show");
      };
      reader.readAsDataURL(file);
    }
  });

  removeMediaBtn.addEventListener("click", () => {
    selectedMedia = null;
    mediaPreview.classList.remove("show");
  });

  // Reply
  cancelReplyBtn.addEventListener("click", () => {
    replyTarget = null;
    replyPreview.classList.remove("show");
  });

  // User search
  userSearch.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allUsers.filter(user => user.toLowerCase().includes(query));
    renderUserList(filtered);
  });

  // Socket events
  socket.on("message", (msg) => {
    if (msg.from === currentChat) {
      renderMessage(msg);
      // Show notification that message was received
      showNotification(`Message from ${msg.from}`, msg.text);
    } else {
      unreadCounts[msg.from] = (unreadCounts[msg.from] || 0) + 1;
      localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
      renderUserList(allUsers);
      // Show notification for message from different user
      showNotification(`New message from ${msg.from}`, msg.text);
    }
    
    const msgs = JSON.parse(localStorage.getItem(`veyon_messages_${msg.from}`) || "[]");
    msgs.push(msg);
    localStorage.setItem(`veyon_messages_${msg.from}`, JSON.stringify(msgs));
  });

  socket.on("user_typing", (data) => {
    if (data.from === currentChat && data.typing) {
      typingBubble.classList.remove("hidden");
      chatBox.scrollTop = chatBox.scrollHeight;
    } else {
      typingBubble.classList.add("hidden");
    }
  });

  // Message input typing indicator
  messageInput.addEventListener("input", () => {
    if (!currentChat) return;  // Only send typing indicator if chatting with someone
    if (typingTimeout) clearTimeout(typingTimeout);
    socket.emit("user_typing", { from: currentUser, to: currentChat, typing: true });
    typingTimeout = setTimeout(() => {
      socket.emit("user_typing", { from: currentUser, to: currentChat, typing: false });
    }, 2000);
  });

  // Image preview
  imageOverlayClose.addEventListener("click", () => {
    imageOverlay.classList.add("hidden");
  });

  // Global click to hide menus/pickers
  document.addEventListener('click', (e) => {
    if (!messageMenu.contains(e.target)) messageMenu.classList.add('hidden');
    if (!reactionPicker.contains(e.target)) reactionPicker.classList.add('hidden');
  });

  // Message menu actions (react/reply/copy)
  messageMenu.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    const ts = selectedMessageTimestamp;
    if (!ts) return;
    const msgDiv = document.querySelector(`[data-ts="${ts}"]`);
    if (!msgDiv) return;

    if (action === 'copy') {
      const text = msgDiv.dataset.text || '';
      navigator.clipboard.writeText(text).catch(()=>{});
    }

    if (action === 'reply') {
      replyTarget = { from: msgDiv.dataset.from, text: msgDiv.dataset.text };
      replyPreview.classList.remove('hidden');
      replyUser.textContent = replyTarget.from;
      replyText.textContent = replyTarget.text;
    }

    if (action === 'react') {
      // show reaction picker near menu
      reactionPicker.style.left = messageMenu.style.left;
      reactionPicker.style.top = messageMenu.style.top;
      reactionPicker.classList.remove('hidden');
    }

    messageMenu.classList.add('hidden');
  });

  // Reaction picker clicks
  reactionPicker.querySelectorAll('.reaction-emoji').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const emoji = btn.dataset.emoji;
      const ts = selectedMessageTimestamp;
      const msgDiv = document.querySelector(`[data-ts="${ts}"]`);
      if (!msgDiv) return;
      const to = (msgDiv.dataset.from === currentUser) ? msgDiv.dataset.to : msgDiv.dataset.from;
      socket.emit('react', { msgId: ts, emoji, from: currentUser, to });
      reactionPicker.classList.add('hidden');
    });
  });

  // Incoming reactions
  socket.on('reaction', (payload) => {
    try {
      const msgDiv = document.querySelector(`[data-ts="${payload.msgId}"]`);
      if (!msgDiv) return;
      let rArea = msgDiv.querySelector('.message-reactions');
      if (!rArea) {
        rArea = document.createElement('div');
        rArea.className = 'message-reactions';
        msgDiv.querySelector('.message-bubble').appendChild(rArea);
      }
      const span = document.createElement('span');
      span.className = 'reaction';
      span.textContent = payload.emoji;
      rArea.appendChild(span);
    } catch (err) {
      console.error('Reaction render error', err);
    }
  });

  /* ========= AUTO-LOGIN & AUTO-SWITCH ========= */
  const savedUser = localStorage.getItem("veyon_user");
  const savedPass = localStorage.getItem("veyon_pass");
  
  if (savedUser && savedPass) {
    currentUser = savedUser;
    loadingPhase = 1; // Start loading from connecting phase
    
    // Auto-login with saved credentials
    (async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: savedUser, password: savedPass })
        });

        const data = await res.json();
        if (!res.ok) throw new Error("Session expired");

        // Progress loading phases
        loadingPhase = 2;
        await new Promise(r => setTimeout(r, 300));
        loadingPhase = 3;
        await new Promise(r => setTimeout(r, 300));
        loadingPhase = 4;

        setTimeout(() => {
          loadingScreen.classList.add("hidden");
          showApp();
        }, 800);
      } catch (err) {
        console.error("Auto-login failed:", err);
        localStorage.removeItem("veyon_user");
        localStorage.removeItem("veyon_pass");
        
        // Immediately show login page
        loadingScreen.classList.add("hidden");
        authScreen.classList.remove("hidden");
        switchToLogin();
      }
    })();
  } else {
    // Immediately show login if no credentials
    loadingScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
    switchToLogin();
  }
});
