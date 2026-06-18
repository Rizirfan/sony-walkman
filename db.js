const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
let USERS_FILE = path.join(DATA_DIR, 'users.json');

// In-memory sessions store: token -> username
const sessions = new Map();

// Ensure data directory and users file exist (with dynamic permission fallback)
function initDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Perform a quick write test to verify actual access permissions
    const testFile = path.join(DATA_DIR, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch (err) {
    console.error(`Warning: database directory "${DATA_DIR}" is not writable:`, err.message);
    // Fall back to local workspace data folder
    DATA_DIR = path.join(__dirname, 'data');
    USERS_FILE = path.join(DATA_DIR, 'users.json');
    console.log(`Falling back database folder path to: "${DATA_DIR}"`);
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (fallbackErr) {
      console.error('Critical: fallback database folder creation failed:', fallbackErr.message);
    }
  }

  if (!fs.existsSync(USERS_FILE)) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify({}), 'utf-8');
    } catch (err) {
      console.error(`Critical: failed to write users file:`, err.message);
    }
  }
}

function loadUsers() {
  initDb();
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading users:', err);
    return {};
  }
}

function saveUsers(users) {
  initDb();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users:', err);
  }
}

function registerUser(username, password) {
  const users = loadUsers();
  const normalizedUsername = username.toLowerCase().trim();
  
  if (users[normalizedUsername]) {
    return false; // User already exists
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');

  users[normalizedUsername] = {
    username: username.trim(), // Keep original case for display
    hash,
    salt,
    playlist: null,
    settings: null,
    createdAt: new Date().toISOString()
  };

  saveUsers(users);
  return true;
}

function authenticateUser(username, password) {
  const users = loadUsers();
  const normalizedUsername = username.toLowerCase().trim();
  const user = users[normalizedUsername];
  
  if (!user) {
    return null;
  }

  const checkHash = crypto.scryptSync(password, user.salt, 64).toString('hex');
  if (checkHash === user.hash) {
    return user;
  }
  return null;
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, username.toLowerCase().trim());
  return token;
}

function getUsernameBySession(token) {
  if (!token) return null;
  const normalizedUsername = sessions.get(token);
  if (!normalizedUsername) return null;
  
  // Return the original cased username
  const users = loadUsers();
  const user = users[normalizedUsername];
  return user ? user.username : null;
}

function deleteSession(token) {
  if (token) {
    sessions.delete(token);
  }
}

function saveUserData(username, playlist, settings) {
  const users = loadUsers();
  const normalizedUsername = username.toLowerCase().trim();
  if (users[normalizedUsername]) {
    if (playlist !== undefined) {
      users[normalizedUsername].playlist = playlist;
    }
    if (settings !== undefined) {
      users[normalizedUsername].settings = settings;
    }
    saveUsers(users);
  }
}

function getUserData(username) {
  const users = loadUsers();
  const normalizedUsername = username.toLowerCase().trim();
  return users[normalizedUsername] || {};
}

module.exports = {
  registerUser,
  authenticateUser,
  createSession,
  getUsernameBySession,
  deleteSession,
  saveUserData,
  getUserData
};
