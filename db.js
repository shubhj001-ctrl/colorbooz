const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing");
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  dbName: "veyon",
  serverSelectionTimeoutMS: 30000, // ⏳ wait longer
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log("✅ MongoDB connected");
})
.catch(err => {
  console.error("❌ MongoDB connection error (will retry):", err.message);
  // ❌ DO NOT exit process
});

/* =========================
   SCHEMA
========================= */

const messageSchema = new mongoose.Schema({
  chatKey: String,
  from: String,
  to: String,
  text: String,
  media: {
    url: String,
    type: String
  },
  replyTo: Object,
  createdAt: {
    type: Number,
    default: Date.now
  }
});

const Message = mongoose.model("Message", messageSchema);

async function saveMessage(msg, chatKey) {
  return Message.create({
    chatKey,
    from: msg.from,
    to: msg.to,
    text: msg.text || null,
    media: msg.media || null,
    replyTo: msg.replyTo || null,
    createdAt: msg.createdAt || Date.now()
  });
}

async function loadMessages(chatKey) {
  return Message.find({ chatKey }).sort({ createdAt: 1 }).lean();
}

/* =========================
   USER MANAGEMENT (FILE-BASED)
========================= */
const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const USERS_FILE = path.join(__dirname, "users.json");

async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("❌ Error loading users:", err.message);
    return {};
  }
}

async function saveUsers(users) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (err) {
    console.error("❌ Error saving users:", err.message);
    return false;
  }
}

async function createUser(username, password, email = "") {
  if (!username || !password) return { ok: false, msg: "Username and password required" };

  const users = await loadUsers();
  
  if (users[username]) {
    return { ok: false, msg: "User already exists" };
  }

  // Generate invite code function
  const generateInviteCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  // New user object format
  users[username] = {
    password,
    email: email || "",
    status: "active",
    inviteToken: uuidv4(),
    inviteCode: generateInviteCode(),
    connections: []
  };

  const saved = await saveUsers(users);
  
  if (saved) {
    return { ok: true, msg: "User created successfully", inviteToken: users[username].inviteToken };
  } else {
    return { ok: false, msg: "Failed to save user" };
  }
}

async function getUserByInviteToken(token) {
  if (!token) return null;
  const users = await loadUsers();
  for (const [username, data] of Object.entries(users)) {
    const userObj = typeof data === 'string' ? { password: data } : data;
    if (userObj.inviteToken && userObj.inviteToken === token) return username;
  }
  return null;
}

async function ensureInviteToken(username) {
  const users = await loadUsers();
  if (!users[username]) return null;
  
  const generateInviteCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  
  if (typeof users[username] === 'string') {
    users[username] = { password: users[username], email: '', status: 'active', inviteToken: uuidv4(), inviteCode: generateInviteCode(), connections: [] };
    await saveUsers(users);
    return users[username].inviteToken;
  }
  if (!users[username].inviteToken) {
    users[username].inviteToken = uuidv4();
    if (!Array.isArray(users[username].connections)) users[username].connections = [];
    if (!users[username].inviteCode) users[username].inviteCode = generateInviteCode();
    await saveUsers(users);
  }
  return users[username].inviteToken;
}

async function addConnection(a, b) {
  if (!a || !b) return { ok: false, msg: 'Both usernames required' };
  const users = await loadUsers();
  if (!users[a] || !users[b]) return { ok: false, msg: 'User not found' };

  // Normalize to object format
  if (typeof users[a] === 'string') users[a] = { password: users[a], email: '', status: 'active', inviteToken: uuidv4(), connections: [] };
  if (typeof users[b] === 'string') users[b] = { password: users[b], email: '', status: 'active', inviteToken: uuidv4(), connections: [] };

  users[a].connections = users[a].connections || [];
  users[b].connections = users[b].connections || [];

  if (!users[a].connections.includes(b)) users[a].connections.push(b);
  if (!users[b].connections.includes(a)) users[b].connections.push(a);

  const saved = await saveUsers(users);
  if (!saved) return { ok: false, msg: 'Failed to save connection' };
  return { ok: true };
}

async function getConnections(username) {
  const users = await loadUsers();
  if (!users[username]) return [];
  const userObj = typeof users[username] === 'string' ? { password: users[username], connections: [] } : users[username];
  return userObj.connections || [];
}

async function getAllUsers() {
  const users = await loadUsers();
  return Object.keys(users);
}

module.exports = { saveMessage, loadMessages, loadUsers, saveUsers, createUser, getAllUsers, getUserByInviteToken, ensureInviteToken, addConnection, getConnections };
