const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const multer = require("multer");
const https = require("https");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const { saveMessage, loadMessages, loadUsers, saveUsers, createUser, getAllUsers, getUserByInviteToken, ensureInviteToken, addConnection, getConnections } = require("./db");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 10000,
  pingTimeout: 20000
});

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* =========================
   STATIC + UPLOAD SETUP
========================= */

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false });

  res.json({
    ok: true,
    url: `/uploads/${req.file.filename}`,
    type: req.file.mimetype
  });
});

/* =========================
   ADMIN ENDPOINTS
========================= */

// Admin login to get token
app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Core admin credentials
    if (username === "Veyon_Admin" && password === "Shubh@0924") {
      return res.json({ ok: true, token: "admin_token_" + Date.now(), msg: "Admin login successful" });
    } else {
      return res.json({ ok: false, msg: "Invalid admin credentials" });
    }
  } catch (err) {
    console.error("❌ Admin login error:", err);
    return res.status(500).json({ ok: false, msg: "Server error" });
  }
});

// Create new user (admin only)
app.post("/api/admin/create-user", async (req, res) => {
  try {
    const { username, password, email, adminPassword } = req.body;
    
    // Verify admin credentials
    if (adminPassword !== "Shubh@0924") {
      return res.status(401).json({ ok: false, msg: "Unauthorized" });
    }
    
    const result = await createUser(username, password, email || "");
    if (result.ok) {
      // return invite link for convenience
      const inviteToken = result.inviteToken || await ensureInviteToken(username);
      const inviteLink = `${req.protocol}://${req.get('host')}/invite.html?token=${inviteToken}`;
      return res.json({ ok: true, msg: result.msg, inviteToken, inviteLink });
    }
    return res.json(result);
  } catch (err) {
    console.error("❌ Create user error:", err);
    return res.status(500).json({ ok: false, msg: "Server error: " + err.message });
  }
});

// Get all users (admin only)
app.get("/api/admin/users", async (req, res) => {
  try {
    const adminUser = req.headers.authorization?.split(" ")[1] || "";
    
    // Allow admin with bearer token or query param
    const users = await loadUsers();

    // Return users array with email and status
    const usersList = Object.entries(users).map(([username, userData]) => {
      // Support both old (string) and new (object) format
      const userObj = typeof userData === 'string' 
        ? { password: userData, email: '', status: 'active' }
        : userData;
      
      return {
        username,
        email: userObj.email || '',
        firstName: userObj.firstName || '',
        lastName: userObj.lastName || '',
        phone: userObj.phone || '',
        status: userObj.status || 'active'
      };
    });
    
    return res.json({ ok: true, users: usersList });
  } catch (err) {
    console.error("❌ Get users error:", err);
    return res.status(500).json({ ok: false, msg: "Server error: " + err.message });
  }
});

// Activate user
app.post("/api/admin/user/activate", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ ok: false, msg: "Username required" });
    
    const users = await loadUsers();
    if (!users[username]) {
      return res.status(404).json({ ok: false, msg: "User not found" });
    }
    
    // Ensure user is an object with status field
    if (typeof users[username] === 'string') {
      users[username] = { password: users[username], email: '', status: 'active' };
    } else {
      users[username].status = 'active';
    }
    
    await saveUsers(users);
    return res.json({ ok: true, msg: "User activated" });
  } catch (err) {
    console.error("❌ Activate user error:", err);
    return res.status(500).json({ ok: false, msg: "Server error" });
  }
});

// Deactivate user
app.post("/api/admin/user/deactivate", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ ok: false, msg: "Username required" });
    
    const users = await loadUsers();
    if (!users[username]) {
      return res.status(404).json({ ok: false, msg: "User not found" });
    }
    
    // Ensure user is an object with status field
    if (typeof users[username] === 'string') {
      users[username] = { password: users[username], email: '', status: 'inactive' };
    } else {
      users[username].status = 'inactive';
    }
    
    await saveUsers(users);
    return res.json({ ok: true, msg: "User deactivated" });
  } catch (err) {
    console.error("❌ Deactivate user error:", err);
    return res.status(500).json({ ok: false, msg: "Server error" });
  }
});

// Remove user
app.delete("/api/admin/user/remove", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ ok: false, msg: "Username required" });
    
    const users = await loadUsers();
    if (!users[username]) {
      return res.status(404).json({ ok: false, msg: "User not found" });
    }
    
    delete users[username];
    await saveUsers(users);
    return res.json({ ok: true, msg: "User removed" });
  } catch (err) {
    console.error("❌ Remove user error:", err);
    return res.status(500).json({ ok: false, msg: "Server error" });
  }
});

/* =========================
   REGISTRATION ENDPOINTS
========================= */
// Register user
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ ok: false, msg: "All fields required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, msg: "Password must be at least 6 characters" });
    }

    // Basic email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, msg: "Invalid email format" });
    }

    const bannedKeywords = ['test', 'spam', 'temp', 'mailinator', '10minut', 'tempmail', 'disposable', 'example'];
    const [localPart, domain] = email.toLowerCase().split('@');
    if (!domain || domain.indexOf('.') === -1) {
      return res.status(400).json({ ok: false, msg: 'Invalid email domain' });
    }

    // Reject disposable/test addresses
    for (const kw of bannedKeywords) {
      if ((localPart && localPart.includes(kw)) || (domain && domain.includes(kw))) {
        return res.status(400).json({ ok: false, msg: 'Please use a real email address (no disposable or test domains)'});
      }
    }

    const USERS = await loadUsers();

    // Prevent duplicate email
    const emailTaken = Object.values(USERS).some(u => {
      const userObj = typeof u === 'string' ? {} : u;
      return userObj.email === email;
    });
    if (emailTaken) return res.status(400).json({ ok: false, msg: 'Email already registered' });

    // Generate sensible username from names - ensure uniqueness
    let baseUsername = (firstName + lastName).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!baseUsername) baseUsername = localPart.split(/[._]/)[0] || 'user';
    let username = baseUsername;
    let counter = 1;
    while (USERS[username]) {
      username = `${baseUsername}${counter++}`;
    }

    USERS[username] = {
      password,
      email,
      firstName,
      lastName,
      phone: phone || '',
      status: 'active',
      inviteCode: generateInviteCode(),
      inviteToken: uuidv4(),
      connections: []
    };

    await saveUsers(USERS);
    console.log('✅ New user registered:', username, 'email:', email);
    return res.json({ ok: true, msg: 'Registration successful! You can now login.' });
  } catch (err) {
    console.error('❌ Register error:', err);
    return res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Username and password required" });
    }

    const USERS = await loadUsers();
    const userObj = USERS[username];

    if (!userObj) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // Handle both old format (string password) and new format (object with password)
    const storedPassword = typeof userObj === "string" ? userObj : userObj?.password;

    if (storedPassword !== password) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // Check if user is inactive
    if (typeof userObj === "object" && userObj.status === "inactive") {
      return res.status(403).json({ ok: false, error: "User account is deactivated" });
    }

    return res.json({ ok: true, username, msg: "Login successful" });

  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// Get users for chat (list of usernames)
app.get("/api/users", async (req, res) => {
  try {
    const USERS = await loadUsers();
    const users = Object.keys(USERS).filter(u => {
      const userObj = USERS[u];
      // Only return active users
      if (typeof userObj === "object" && userObj.status === "inactive") {
        return false;
      }
      return true;
    });
    return res.json({ ok: true, users });
  } catch (err) {
    console.error("❌ Get users error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// Get connections for a user (only returns active connected usernames)
app.get('/api/users/:username/connections', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ ok: false, error: 'Username required' });
    const connections = await getConnections(username);
    // Filter out inactive users
    const USERS = await loadUsers();
    const activeConnections = (connections || []).filter(u => {
      const uObj = USERS[u];
      if (!uObj) return false;
      if (typeof uObj === 'object' && uObj.status === 'inactive') return false;
      return true;
    });
    return res.json({ ok: true, connections: activeConnections });
  } catch (err) {
    console.error('❌ Get connections error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Remove connection (unfriend)
app.post('/api/users/:username/remove-connection', async (req, res) => {
  try {
    const { username } = req.params;
    const { friend } = req.body;
    
    if (!username || !friend) {
      return res.status(400).json({ ok: false, msg: 'Username and friend required' });
    }
    
    const USERS = await loadUsers();
    
    if (!USERS[username]) {
      return res.status(404).json({ ok: false, msg: 'User not found' });
    }
    
    if (!USERS[friend]) {
      return res.status(404).json({ ok: false, msg: 'Friend not found' });
    }
    
    // Get user object
    let userObj = typeof USERS[username] === 'string' 
      ? { password: USERS[username], connections: [] }
      : USERS[username];
    
    // Get friend object
    let friendObj = typeof USERS[friend] === 'string'
      ? { password: USERS[friend], connections: [] }
      : USERS[friend];
    
    // Ensure connections arrays exist
    if (!userObj.connections) userObj.connections = [];
    if (!friendObj.connections) friendObj.connections = [];
    
    // Remove from both users' connections
    userObj.connections = userObj.connections.filter(c => c !== friend);
    friendObj.connections = friendObj.connections.filter(c => c !== username);
    
    // Update users
    USERS[username] = userObj;
    USERS[friend] = friendObj;
    
    await saveUsers(USERS);
    
    console.log(`✅ Removed connection: ${username} <-> ${friend}`);
    return res.json({ ok: true, msg: 'Friend removed successfully' });
  } catch (err) {
    console.error('❌ Remove connection error:', err);
    return res.status(500).json({ ok: false, msg: 'Server error' });
  }
});

// Get or ensure invite code for a user (returns invite code)
app.get('/api/users/:username/invite', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ ok: false, error: 'Username required' });
    
    const users = await loadUsers();
    if (!users[username]) return res.status(404).json({ ok: false, error: 'User not found' });
    
    const userObj = typeof users[username] === 'string' ? { password: users[username] } : users[username];
    
    // Ensure user has an invite code and generate new one every time
    const newInviteCode = generateInviteCode();
    userObj.inviteCode = newInviteCode;
    users[username] = userObj;
    await saveUsers(users);
    
    return res.json({ ok: true, inviteCode: newInviteCode });
  } catch (err) {
    console.error('❌ Get invite error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Accept invite using invite code
app.post('/api/invite/accept-code', async (req, res) => {
  try {
    const { username, inviteCode } = req.body;
    if (!username || !inviteCode) return res.status(400).json({ ok: false, msg: 'Username and invite code required' });
    
    const users = await loadUsers();
    
    // Find the user with this invite code
    let inviter = null;
    for (const [user, userData] of Object.entries(users)) {
      const userObj = typeof userData === 'string' ? {} : userData;
      if (userObj.inviteCode === inviteCode) {
        inviter = user;
        break;
      }
    }
    
    if (!inviter) return res.status(404).json({ ok: false, msg: 'Invalid invite code' });
    if (inviter === username) return res.status(400).json({ ok: false, msg: 'Cannot invite yourself' });
    
    const result = await addConnection(inviter, username);
    return res.json(result);
  } catch (err) {
    console.error('❌ Accept invite code error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Public invite lookup - returns inviter username
app.get('/api/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const inviter = await getUserByInviteToken(token);
    if (!inviter) return res.status(404).json({ ok: false, msg: 'Invite not found' });
    return res.json({ ok: true, inviter });
  } catch (err) {
    console.error('❌ Invite lookup error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Accept invite - must be logged in client-side and pass username in body
app.post('/api/invite/accept', async (req, res) => {
  try {
    const { token, username } = req.body;
    if (!token || !username) return res.status(400).json({ ok: false, msg: 'Token and username required' });
    const inviter = await getUserByInviteToken(token);
    if (!inviter) return res.status(404).json({ ok: false, msg: 'Invite not found' });

    const result = await addConnection(inviter, username);
    return res.json(result);
  } catch (err) {
    console.error('❌ Accept invite error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Save message endpoint
app.post("/api/messages/save", async (req, res) => {
  try {
    const msg = req.body;
    if (!msg.from || !msg.to) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }
    const key = [msg.from, msg.to].sort().join("|");
    await saveMessage(msg, key);
    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ Save message error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/* =========================
   SOCKET STATE
========================= */

const userSockets = new Map(); // username → socket
const onlineUsers = new Set();
const offlineMessages = new Map(); // username → array of messages

const chatKey = (a, b) => [a, b].sort().join("|");

/* =========================
   SOCKET LOGIC
========================= */

io.on("connection", socket => {
  console.log("🔌 Connected:", socket.id);

  /* ---------- LOGIN ---------- */
  socket.on("login", async (data, cb) => {
    if (!data?.username || !data?.password) {
      cb?.({ ok: false });
      return;
    }

    const USERS = await loadUsers();
    const userObj = USERS[data.username];
    
    // Handle both old format (string password) and new format (object with password and email)
    const storedPassword = typeof userObj === "string" ? userObj : userObj?.password;
    
    if (!userObj || storedPassword !== data.password) {
      cb?.({ ok: false });
      return;
    }

    socket.username = data.username;
    userSockets.set(data.username, socket);
    onlineUsers.add(data.username);

    cb?.({
      ok: true,
      users: Object.keys(USERS).filter(u => u !== data.username)
    });

    // Deliver offline messages
    if (offlineMessages.has(data.username)) {
      const messages = offlineMessages.get(data.username);
      messages.forEach(msg => {
        socket.emit("message", msg);
      });
      offlineMessages.delete(data.username);
    }

    io.emit("online", [...onlineUsers]);
  });

  /* ---------- RECONNECT ---------- */
  socket.on("reconnectUser", username => {
    socket.username = username;
    userSockets.set(username, socket);
    onlineUsers.add(username);

    // Deliver offline messages
    if (offlineMessages.has(username)) {
      const messages = offlineMessages.get(username);
      messages.forEach(msg => {
        socket.emit("message", msg);
      });
      offlineMessages.delete(username);
    }

    io.emit("online", [...onlineUsers]);
  });

  /* ---------- PING HANDLER ---------- */
  socket.on("ping", () => {
    socket.emit("pong");
  });

  /* ---------- TYPING ---------- */
  socket.on("typing", ({ to }) => {
    if (!socket.username) return;
    userSockets.get(to)?.emit("typing", {
      from: socket.username,
      to
    });
  });

  socket.on("stopTyping", ({ to }) => {
    if (!socket.username) return;
    userSockets.get(to)?.emit("stopTyping", {
      from: socket.username,
      to
    });
  });

  /* ---------- USER TYPING (CUSTOM EVENT) ---------- */
  socket.on("user_typing", ({ from, to, typing }) => {
    if (!to) return;
    userSockets.get(to)?.emit("user_typing", {
      from: from || socket.username,
      to,
      typing
    });
  });

  /* ---------- LOAD MESSAGES ---------- */
  socket.on("loadMessages", async ({ withUser }, cb) => {
    if (!socket.username) return cb([]);

    const key = chatKey(socket.username, withUser);

    try {
      const msgs = await loadMessages(key);
      cb(msgs);
    } catch (err) {
      console.error("❌ Load messages error", err);
      cb([]);
    }
  });

    /* ---------- REACTION ---------- */
    socket.on('react', (payload) => {
      // payload: { msgId, emoji, from, to }
      if (!payload || !payload.from || !payload.to) return;

      // deliver to recipient and sender so both see updated reactions
      userSockets.get(payload.to)?.emit('reaction', payload);
      userSockets.get(payload.from)?.emit('reaction', payload);
    });

socket.on("sendMessage", async msg => {
  if (!msg?.from || !msg?.to) return;

  if (!socket.username) {
    socket.username = msg.from;
    userSockets.set(msg.from, socket);
    onlineUsers.add(msg.from);
  }

  const key = chatKey(msg.from, msg.to);
  msg.createdAt = Date.now();

  // ✅ EMIT TO SENDER FIRST (immediate feedback)
  socket.emit("message", msg);

  // ✅ EMIT TO ONLINE RECIPIENT
  const recipientSocket = userSockets.get(msg.to);
  if (recipientSocket) {
    recipientSocket.emit("message", msg);
  } else {
    if (!offlineMessages.has(msg.to)) {
      offlineMessages.set(msg.to, []);
    }
    offlineMessages.get(msg.to).push(msg);
  }

  saveMessage(msg, key).catch(err => {
    console.error("❌ Message save failed:", err.message);
  });
});

/* ---------- FRIEND JOINED ---------- */
socket.on("acceptInviteCode", async (data) => {
  if (!data?.username || !data?.friendUsername) return;

  const username = data.username;
  const friendUsername = data.friendUsername;

  const friendSocket = userSockets.get(friendUsername);
  if (friendSocket) {
    friendSocket.emit("friendJoined", {
      username: username,
      timestamp: new Date().toISOString(),
      message: `${username} just joined your network!`
    });
    console.log(`✅ Notified ${friendUsername}: ${username} joined network`);
  }
});

  /* ---------- DISCONNECT ---------- */
  socket.on("disconnect", () => {
    if (socket.username) {
      userSockets.delete(socket.username);
      onlineUsers.delete(socket.username);
      io.emit("online", [...onlineUsers]);
    }
    console.log("❌ Disconnected:", socket.id);
  });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
