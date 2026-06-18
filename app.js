/* ==========================================================================
   Retro-Modern Walkman Music Player JS - Sony Ericsson + Glassmorphism Theme
   ========================================================================== */

// --- Constants & Global Variables ---
let ytPlayer = null;
let ytApiReady = false;
let currentTrack = null;
let currentPlaylist = [];
let audioCtx = null;
let progressInterval = null;
let isEjected = false;
let isFastForwarding = false;
let isRewinding = false;

// User Account & Cloud Sync State
let currentUserToken = localStorage.getItem("walkman_user_token") || null;
let currentUsername = localStorage.getItem("walkman_username") || null;
let isAuthSignUpMode = false;

// Curated Default Retro Playlist (Synthwave, Lofi, 80s Vibes)
const DEFAULT_RETRO_PLAYLIST = [
  {
    id: "8GW6sLrK40k",
    title: "HOME - Resonance",
    channel: "HOME",
    thumbnail: "https://img.youtube.com/vi/8GW6sLrK40k/hqdefault.jpg"
  },
  {
    id: "MV_3Dpw-BRY",
    title: "Kavinsky - Nightcall",
    channel: "Kavinsky",
    thumbnail: "https://img.youtube.com/vi/MV_3Dpw-BRY/hqdefault.jpg"
  },
  {
    id: "xR4z3P8mpy0",
    title: "Lazerhawk - Redline",
    channel: "Lazerhawk",
    thumbnail: "https://img.youtube.com/vi/xR4z3P8mpy0/hqdefault.jpg"
  },
  {
    id: "Jv1ZN8c4_Gs",
    title: "Gunship - Fly For Your Life",
    channel: "GUNSHIP",
    thumbnail: "https://img.youtube.com/vi/Jv1ZN8c4_Gs/hqdefault.jpg"
  },
  {
    id: "rDBbaGCCIhk",
    title: "The Midnight - Sunset",
    channel: "The Midnight",
    thumbnail: "https://img.youtube.com/vi/rDBbaGCCIhk/hqdefault.jpg"
  },
  {
    id: "TRCG8q27s5o",
    title: "Jan Hammer - Crockett's Theme (Cocaine Cowboys Mix)",
    channel: "Jan Hammer",
    thumbnail: "https://img.youtube.com/vi/TRCG8q27s5o/hqdefault.jpg"
  },
  {
    id: "hhnZ5rCs5QA",
    title: "The xx - Intro (Retro Remix)",
    channel: "The xx",
    thumbnail: "https://img.youtube.com/vi/hhnZ5rCs5QA/hqdefault.jpg"
  }
];

// --- Web Audio API Synth Sound Effects ---
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playMechanicalClick(type) {
  const sfxEnabled = document.getElementById('settings-sfx').checked;
  if (!sfxEnabled) return;
  
  try {
    initAudioContext();
    const now = audioCtx.currentTime;

    if (type === 'heavy-clunk' || type === 'play') {
      // Engages mechanical tape head (heavy plastic thump + metallic latch)
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(80, now);
      osc1.frequency.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(100, now + 0.05);

      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.2);
      osc2.stop(now + 0.2);

    } else if (type === 'light-click' || type === 'button') {
      // Light button press click
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gainNode = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 5;

      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.05);

    } else if (type === 'eject') {
      // Open deck: spring pop + mechanical click
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(150, now);
      osc1.frequency.exponentialRampToValueAtTime(20, now + 0.25);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(1800, now);
      osc2.frequency.exponentialRampToValueAtTime(800, now + 0.08);

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    }
  } catch (err) {
    console.warn("Web Audio API not supported or initialized:", err);
  }
}

// --- Initialize App ---
document.addEventListener("DOMContentLoaded", () => {
  checkAuthAndLoad();
  window.addEventListener("resize", adjustPlayerScale);
  adjustPlayerScale();
  setTimeout(adjustPlayerScale, 100);
});

async function checkAuthAndLoad() {
  loadConfigurations();
  setupEventListeners();
  updateAuthUI();
  
  if (currentUserToken) {
    showNotification("Restoring cloud library...", "success");
    const success = await fetchUserData();
    if (success) {
      return;
    } else {
      // Clean up expired token
      currentUserToken = null;
      currentUsername = null;
      localStorage.removeItem("walkman_user_token");
      localStorage.removeItem("walkman_username");
      updateAuthUI();
    }
  }
  
  loadPlaylist(false); // Load from LocalStorage if guest
}

// --- Local Storage & Configurations ---
function loadConfigurations() {
  // Theme setup
  let savedTheme = localStorage.getItem("walkman_theme") || "theme-dark";
  const validThemes = ["theme-dark", "theme-light", "theme-red"];
  if (!validThemes.includes(savedTheme)) {
    savedTheme = "theme-dark";
  }
  document.body.className = savedTheme;
  document.querySelectorAll(".theme-dot").forEach(dot => {
    dot.classList.toggle("active", dot.dataset.theme === savedTheme);
  });

  // API Key setup
  const savedKey = localStorage.getItem("walkman_api_key");
  if (savedKey) {
    document.getElementById("settings-api-key").value = savedKey;
  }

  // SFX setup
  const sfxConfig = localStorage.getItem("walkman_sfx");
  if (sfxConfig !== null) {
    document.getElementById("settings-sfx").checked = sfxConfig === "true";
  }
}

function saveSettings() {
  const key = document.getElementById("settings-api-key").value.trim();
  const sfx = document.getElementById("settings-sfx").checked;
  const activeTheme = document.body.className;

  localStorage.setItem("walkman_api_key", key);
  localStorage.setItem("walkman_sfx", sfx);
  localStorage.setItem("walkman_theme", activeTheme);

  document.getElementById("settings-modal").classList.add("hidden");
  playMechanicalClick("button");
  
  syncUserData();
}

// --- Playlist Loader ---
function loadPlaylist(initDefaults = false) {
  const savedList = localStorage.getItem("walkman_playlist");
  if (savedList && !initDefaults) {
    currentPlaylist = JSON.parse(savedList);
  } else {
    currentPlaylist = [...DEFAULT_RETRO_PLAYLIST];
    localStorage.setItem("walkman_playlist", JSON.stringify(currentPlaylist));
  }
  renderPlaylist();
}

// --- Cloud Synchronization and Authentication Services ---
async function fetchUserData() {
  try {
    const response = await fetch('/api/user/data', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${currentUserToken}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        if (data.playlist) {
          currentPlaylist = data.playlist;
          localStorage.setItem("walkman_playlist", JSON.stringify(currentPlaylist));
        } else {
          const localSaved = localStorage.getItem("walkman_playlist");
          currentPlaylist = localSaved ? JSON.parse(localSaved) : [...DEFAULT_RETRO_PLAYLIST];
        }
        
        if (data.settings) {
          const settings = data.settings;
          if (settings.theme) {
            document.body.className = settings.theme;
            localStorage.setItem("walkman_theme", settings.theme);
            document.querySelectorAll(".theme-dot").forEach(dot => {
              dot.classList.toggle("active", dot.dataset.theme === settings.theme);
            });
          }
          if (settings.apiKey !== undefined) {
            document.getElementById("settings-api-key").value = settings.apiKey;
            localStorage.setItem("walkman_api_key", settings.apiKey);
          }
          if (settings.sfx !== undefined) {
            document.getElementById("settings-sfx").checked = settings.sfx;
            localStorage.setItem("walkman_sfx", settings.sfx);
          }
        }
        renderPlaylist();
        showNotification(`Welcome back, ${data.username}!`, "success");
        return true;
      }
    }
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
  return false;
}

async function syncUserData() {
  if (!currentUserToken) return;
  
  const statusEl = document.getElementById("profile-sync-status");
  if (statusEl) statusEl.innerText = "Syncing changes...";

  try {
    const settings = {
      theme: document.body.className,
      apiKey: document.getElementById("settings-api-key").value.trim(),
      sfx: document.getElementById("settings-sfx").checked
    };
    
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUserToken}`
      },
      body: JSON.stringify({
        playlist: currentPlaylist,
        settings: settings
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        if (statusEl) statusEl.innerText = "All changes synced to cloud";
        console.log("Data synced successfully");
      } else {
        if (statusEl) statusEl.innerText = "Sync failed: " + data.error;
      }
    } else {
      if (statusEl) statusEl.innerText = "Sync failed: Server error";
    }
  } catch (err) {
    console.error("Error syncing data:", err);
    if (statusEl) statusEl.innerText = "Sync failed: Connection lost";
  }
}

function updateAuthUI() {
  const loggedInEl = document.getElementById("settings-auth-logged-in");
  const loggedOutEl = document.getElementById("settings-auth-logged-out");
  
  if (currentUserToken) {
    if (loggedInEl) loggedInEl.classList.remove("hidden");
    if (loggedOutEl) loggedOutEl.classList.add("hidden");
    
    const displayUser = document.getElementById("profile-display-username");
    if (displayUser) displayUser.innerText = currentUsername;
    const statusEl = document.getElementById("profile-sync-status");
    if (statusEl) statusEl.innerText = "All changes synced to cloud";
  } else {
    if (loggedInEl) loggedInEl.classList.add("hidden");
    if (loggedOutEl) loggedOutEl.classList.remove("hidden");
    
    const displayUser = document.getElementById("profile-display-username");
    if (displayUser) displayUser.innerText = "Guest Mode";
    const statusEl = document.getElementById("profile-sync-status");
    if (statusEl) statusEl.innerText = "Log in to sync library";
  }
}

function toggleAuthMode() {
  isAuthSignUpMode = !isAuthSignUpMode;
  const title = document.getElementById("auth-modal-title");
  const submitBtn = document.getElementById("btn-auth-submit");
  const toggleText = document.getElementById("auth-toggle-text");
  const toggleLink = document.getElementById("auth-toggle-link");
  const errorMsg = document.getElementById("auth-error-msg");
  
  if (errorMsg) errorMsg.classList.add("hidden");
  
  if (isAuthSignUpMode) {
    if (title) title.innerText = "Create Account";
    if (submitBtn) submitBtn.innerText = "Register";
    if (toggleText) toggleText.innerText = "Already have an account?";
    if (toggleLink) toggleLink.innerText = "Sign In";
  } else {
    if (title) title.innerText = "Sign In";
    if (submitBtn) submitBtn.innerText = "Sign In";
    if (toggleText) toggleText.innerText = "Don't have an account?";
    if (toggleLink) toggleLink.innerText = "Sign Up";
  }
}

async function handleAuthSubmit() {
  const usernameInput = document.getElementById("auth-username");
  const passwordInput = document.getElementById("auth-password");
  const errorMsg = document.getElementById("auth-error-msg");
  
  if (!usernameInput || !passwordInput) return;
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username || !password) {
    if (errorMsg) {
      errorMsg.innerText = "Username and password are required.";
      errorMsg.classList.remove("hidden");
    }
    return;
  }
  
  const submitBtn = document.getElementById("btn-auth-submit");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";
  }
  
  const endpoint = isAuthSignUpMode ? '/api/register' : '/api/login';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      if (isAuthSignUpMode) {
        // Auto-login after registration
        isAuthSignUpMode = false;
        if (submitBtn) submitBtn.innerText = "Logging in...";
        
        const loginResponse = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok && loginData.success) {
          handleLoginSuccess(loginData);
        } else {
          toggleAuthMode();
          if (errorMsg) {
            errorMsg.innerText = "Account created! Please sign in.";
            errorMsg.classList.remove("hidden");
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Sign In";
          }
        }
      } else {
        handleLoginSuccess(data);
      }
    } else {
      if (errorMsg) {
        errorMsg.innerText = data.error || "Authentication failed.";
        errorMsg.classList.remove("hidden");
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = isAuthSignUpMode ? "Register" : "Sign In";
      }
    }
  } catch (err) {
    console.error("Auth request error:", err);
    if (errorMsg) {
      errorMsg.innerText = "Connection failed. Please verify server status.";
      errorMsg.classList.remove("hidden");
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = isAuthSignUpMode ? "Register" : "Sign In";
    }
  }
}

function handleLoginSuccess(data) {
  currentUserToken = data.token;
  currentUsername = data.username;
  
  localStorage.setItem("walkman_user_token", data.token);
  localStorage.setItem("walkman_username", data.username);
  
  if (data.playlist) {
    currentPlaylist = data.playlist;
    localStorage.setItem("walkman_playlist", JSON.stringify(currentPlaylist));
  } else {
    syncUserData();
  }
  
  if (data.settings) {
    const settings = data.settings;
    if (settings.theme) {
      document.body.className = settings.theme;
      localStorage.setItem("walkman_theme", settings.theme);
      document.querySelectorAll(".theme-dot").forEach(dot => {
        dot.classList.toggle("active", dot.dataset.theme === settings.theme);
      });
    }
    if (settings.apiKey !== undefined) {
      document.getElementById("settings-api-key").value = settings.apiKey;
      localStorage.setItem("walkman_api_key", settings.apiKey);
    }
    if (settings.sfx !== undefined) {
      document.getElementById("settings-sfx").checked = settings.sfx;
      localStorage.setItem("walkman_sfx", settings.sfx);
    }
  } else {
    syncUserData();
  }
  
  renderPlaylist();
  updateAuthUI();
  
  const userIn = document.getElementById("auth-username");
  const passIn = document.getElementById("auth-password");
  const errorMsg = document.getElementById("auth-error-msg");
  if (userIn) userIn.value = "";
  if (passIn) passIn.value = "";
  if (errorMsg) errorMsg.classList.add("hidden");
  
  showNotification(`Logged in as ${data.username}`, "success");
  
  const submitBtn = document.getElementById("btn-auth-submit");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerText = "Sign In";
  }
}

async function handleLogout() {
  playMechanicalClick("button");
  if (!confirm("Are you sure you want to log out?")) return;
  
  try {
    await fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentUserToken}`
      }
    });
  } catch (e) {
    console.warn("Logout request failed, proceeding locally:", e);
  }
  
  currentUserToken = null;
  currentUsername = null;
  localStorage.removeItem("walkman_user_token");
  localStorage.removeItem("walkman_username");
  
  updateAuthUI();
  
  loadPlaylist(true);
  
  const apiKeyInput = document.getElementById("settings-api-key");
  if (apiKeyInput) apiKeyInput.value = "";
  localStorage.removeItem("walkman_api_key");
  
  const sfxInput = document.getElementById("settings-sfx");
  if (sfxInput) sfxInput.checked = true;
  localStorage.setItem("walkman_sfx", "true");
  
  document.body.className = "theme-dark";
  localStorage.setItem("walkman_theme", "theme-dark");
  document.querySelectorAll(".theme-dot").forEach(dot => {
    dot.classList.toggle("active", dot.dataset.theme === "theme-dark");
  });
  
  showNotification("Logged out successfully", "warning");
}

function renderPlaylist() {
  const playlistContainer = document.getElementById("playlist-songs-list");
  playlistContainer.innerHTML = "";

  if (currentPlaylist.length === 0) {
    playlistContainer.innerHTML = `<div class="list-placeholder">No tapes in your library. Search and add some!</div>`;
    return;
  }

  currentPlaylist.forEach((track, index) => {
    const isActive = currentTrack && currentTrack.id === track.id;
    const item = document.createElement("div");
    item.className = `song-card ${isActive ? 'active' : ''}`;
    item.dataset.index = index;

    item.innerHTML = `
      <div class="song-thumbnail" style="background-image: url('${track.thumbnail}')"></div>
      <div class="song-info">
        <div class="song-title">${track.title}</div>
        <div class="song-channel">${track.channel}</div>
      </div>
      <div class="song-actions">
        <button class="song-card-btn delete-btn" title="Delete Track" data-index="${index}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Click card to play
    item.addEventListener("click", (e) => {
      // Don't play if clicking delete button
      if (e.target.closest(".delete-btn")) return;
      playTrack(track);
    });

    // Delete track event
    item.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTrack(index);
    });

    playlistContainer.appendChild(item);
  });
}

// --- Player Audio Actions ---
function playTrack(track) {
  if (isEjected) {
    // Force close door first
    toggleEject();
  }

  currentTrack = track;
  renderPlaylist();
  
  // Update Cassette label
  document.getElementById("cassette-writein-title").innerText = track.title.toUpperCase();
  document.getElementById("lcd-title").innerText = track.title;
  document.getElementById("lcd-title").classList.add("scroll-active");

  // Update Dynamic Ambient Colors
  updateAmbientColors(track.title);

  if (ytPlayer && ytApiReady) {
    ytPlayer.loadVideoById(track.id);
    setPlaybackState("playing");
  } else {
    // Queue load for when YT ready
    console.warn("YouTube API not fully ready. Track queued.");
  }
}

function deleteTrack(index) {
  playMechanicalClick("button");
  const trackToDelete = currentPlaylist[index];
  currentPlaylist.splice(index, 1);
  localStorage.setItem("walkman_playlist", JSON.stringify(currentPlaylist));
  
  showNotification("Removed cassette from library", "warning");
  
  if (currentTrack && currentTrack.id === trackToDelete.id) {
    stopPlayback();
    currentTrack = null;
    document.getElementById("cassette-writein-title").innerText = "NO TAPE LOADING";
    document.getElementById("lcd-title").innerText = "Load a Cassette Tape";
    document.getElementById("lcd-title").classList.remove("scroll-active");
  }

  renderPlaylist();
  syncUserData();
}

// --- YouTube IFrame API Control ---
window.onYouTubeIframeAPIReady = function() {
  console.log("YouTube API loaded. Waiting for DOM to mount player...");
  
  const initPlayer = () => {
    const playerEl = document.getElementById("youtube-player");
    if (!playerEl) {
      console.warn("Element #youtube-player not ready. Retrying in 100ms...");
      setTimeout(initPlayer, 100);
      return;
    }
    
    console.log("Initializing YouTube Player...");
    ytPlayer = new YT.Player("youtube-player", {
      height: "200",
      width: "200",
      videoId: currentPlaylist.length > 0 ? currentPlaylist[0].id : DEFAULT_RETRO_PLAYLIST[0].id,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        showinfo: 0,
        modestbranding: 1,
        iv_load_policy: 3
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initPlayer();
  } else {
    document.addEventListener("DOMContentLoaded", initPlayer);
  }
};

function onPlayerReady(event) {
  ytApiReady = true;
  // Default to 80% volume since slider was removed
  ytPlayer.setVolume(80);
  
  // If a track was queued before the player was ready, play it now
  if (currentTrack) {
    console.log("Player ready. Autoplay queued track:", currentTrack.title);
    ytPlayer.loadVideoById(currentTrack.id);
    setPlaybackState("playing");
  }
}

function onPlayerStateChange(event) {
  // YT state mappings: 
  // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
  if (event.data === YT.PlayerState.PLAYING) {
    setPlaybackState("playing");
  } else if (event.data === YT.PlayerState.PAUSED) {
    setPlaybackState("paused");
  } else if (event.data === YT.PlayerState.ENDED) {
    // Play next song in playlist automatically
    playNextTrack();
  }
}

function onPlayerError(event) {
  console.error("YouTube Player Error:", event.data);
  document.getElementById("lcd-status-text").innerText = "ERROR";
  setPlaybackState("stopped");
}

// --- Playback State & Animation Drivers ---
function setPlaybackState(state) {
  const lcdStatus = document.getElementById("lcd-status-text");
  const playIcon = document.getElementById("play-icon");
  const pauseIcon = document.getElementById("pause-icon");
  const eqBars = document.getElementById("equalizer-bars");
  const tapeBody = document.getElementById("cassette-tape-body");

  // Clear seek flags
  isFastForwarding = false;
  isRewinding = false;
  document.getElementById("reel-left").classList.remove("spinning-reverse");
  document.getElementById("reel-right").classList.remove("spinning-reverse");

  if (state === "playing") {
    playMechanicalClick("play");
    lcdStatus.innerText = "PLAYING";
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    eqBars.classList.add("playing");
    
    // Animate reels spinning
    document.getElementById("reel-left").classList.add("spinning");
    document.getElementById("reel-right").classList.add("spinning");
    tapeBody.style.setProperty("--spin-speed", "3.2s");

    startProgressTracker();
  } else if (state === "paused") {
    playMechanicalClick("button");
    lcdStatus.innerText = "PAUSED";
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    eqBars.classList.remove("playing");

    // Pause reels spinning
    document.getElementById("reel-left").classList.remove("spinning");
    document.getElementById("reel-right").classList.remove("spinning");

    stopProgressTracker();
  } else if (state === "stopped") {
    playMechanicalClick("heavy-clunk");
    lcdStatus.innerText = "STOPPED";
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
    eqBars.classList.remove("playing");

    document.getElementById("reel-left").classList.remove("spinning");
    document.getElementById("reel-right").classList.remove("spinning");
    
    stopProgressTracker();
    updateProgressDisplay(0, 0);
  }
}

// Progressive tracker for tapes
function startProgressTracker() {
  stopProgressTracker();
  progressInterval = setInterval(() => {
    if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      const currentTime = ytPlayer.getCurrentTime();
      const duration = ytPlayer.getDuration();
      updateProgressDisplay(currentTime, duration);
    }
  }, 500);
}

function stopProgressTracker() {
  if (progressInterval) {
    clearInterval(progressInterval);
  }
}

function updateProgressDisplay(current, duration) {
  // Format Times (mm:ss)
  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  document.getElementById("lcd-time-display").innerText = `${formatTime(current)} / ${formatTime(duration)}`;

  // Update cassette tape magnetic reels volume density sizes!
  if (duration > 0) {
    const ratio = current / duration;
    
    // Windings adjust size dynamically
    // Left side winds out (starts full, shrinks to hub)
    // Right side winds in (starts empty, grows to full)
    const minRadius = 15;
    const maxRadius = 38;

    const leftRadius = maxRadius - (ratio * (maxRadius - minRadius));
    const rightRadius = minRadius + (ratio * (maxRadius - minRadius));

    document.getElementById("tape-winding-left").setAttribute("r", leftRadius);
    document.getElementById("tape-winding-right").setAttribute("r", rightRadius);
  }
}

// Play next index
function playNextTrack() {
  if (currentPlaylist.length === 0) return;
  
  let nextIndex = 0;
  if (currentTrack) {
    const currentIndex = currentPlaylist.findIndex(t => t.id === currentTrack.id);
    if (currentIndex !== -1 && currentIndex < currentPlaylist.length - 1) {
      nextIndex = currentIndex + 1;
    }
  }
  playTrack(currentPlaylist[nextIndex]);
}

// Play previous index
function playPreviousTrack() {
  if (currentPlaylist.length === 0) return;

  let prevIndex = currentPlaylist.length - 1;
  if (currentTrack) {
    const currentIndex = currentPlaylist.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    }
  }
  playTrack(currentPlaylist[prevIndex]);
}

function stopPlayback() {
  if (ytPlayer && ytApiReady) {
    ytPlayer.stopVideo();
  }
  setPlaybackState("stopped");
}

// --- Toggle Mechanical Eject Deck Door ---
function toggleEject() {
  const deck = document.getElementById("cassette-deck-door");
  isEjected = !isEjected;
  
  playMechanicalClick("eject");

  if (isEjected) {
    deck.classList.add("eject-open");
    // If playing, pause first
    if (ytPlayer && ytApiReady && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
      ytPlayer.pauseVideo();
    }
  } else {
    deck.classList.remove("eject-open");
  }
}

// --- Fast Forward / Rewind Action ---
function triggerFastSeek(direction) {
  if (!ytPlayer || !ytApiReady || !currentTrack) return;
  
  playMechanicalClick("button");
  initAudioContext();

  const currentTime = ytPlayer.getCurrentTime();
  const duration = ytPlayer.getDuration();
  
  if (direction === 'ff') {
    isFastForwarding = true;
    document.getElementById("lcd-status-text").innerText = "F.FWD";
    
    // Speed spin wheels
    const reelLeft = document.getElementById("reel-left");
    const reelRight = document.getElementById("reel-right");
    reelLeft.classList.add("spinning");
    reelRight.classList.add("spinning");
    document.getElementById("cassette-tape-body").style.setProperty("--spin-speed", "0.3s");

    // Seek forward 10 seconds
    const newTime = Math.min(currentTime + 12, duration);
    ytPlayer.seekTo(newTime, true);
    setTimeout(() => {
      setPlaybackState("playing");
    }, 600);

  } else if (direction === 'rew') {
    isRewinding = true;
    document.getElementById("lcd-status-text").innerText = "REWIND";

    // Speed spin wheels reverse
    const reelLeft = document.getElementById("reel-left");
    const reelRight = document.getElementById("reel-right");
    reelLeft.classList.add("spinning-reverse");
    reelRight.classList.add("spinning-reverse");
    document.getElementById("cassette-tape-body").style.setProperty("--spin-speed", "0.3s");

    // Seek backward 10 seconds
    const newTime = Math.max(currentTime - 12, 0);
    ytPlayer.seekTo(newTime, true);
    setTimeout(() => {
      setPlaybackState("playing");
    }, 600);
  }
}

// --- Dynamic Ambient Color Generator ---
// Hashes song title string to generate cohesive, vibrant neon gradient colors
function updateAmbientColors(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate HSL colors
  const primaryHue = Math.abs(hash % 360);
  const secondaryHue = (primaryHue + 140) % 360; // Complementary offset

  const orb1 = document.getElementById("orb-1");
  const orb2 = document.getElementById("orb-2");
  
  // Set glow properties
  orb1.style.background = `hsl(${primaryHue}, 85%, 45%)`;
  orb2.style.background = `hsl(${secondaryHue}, 80%, 40%)`;

  // Set Walkman glow container color
  const glowColor = `rgba(${hslToRgb(primaryHue, 0.85, 0.45).join(',')}, 0.2)`;
  document.getElementById("walkman-body").style.setProperty("--glow-color", glowColor);
}

// Helper: HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;
  h /= 360;
  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// --- Dynamic Player Scaling ---
function adjustPlayerScale() {
  const device = document.getElementById("walkman-body");
  const container = document.querySelector(".player-container");
  if (!device || !container) return;

  const isMobile = window.innerWidth < 1100;

  if (isMobile) {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const designWidth = 350;
    const designHeight = 570;

    const scaleX = (containerWidth * 0.98) / designWidth;
    const scaleY = (containerHeight * 0.98) / designHeight;
    
    let scale = Math.min(scaleX, scaleY);
    scale = Math.min(1.0, scale);

    device.style.transform = `scale(${scale})`;
    device.style.transformOrigin = "center center";
  } else {
    device.style.transform = "";
    device.style.transformOrigin = "";
  }
}

// --- Custom Notification System (Toast) ---
function showNotification(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-notification`;
  
  // Set type icon
  let iconSVG = '';
  if (type === 'success') {
    iconSVG = `
      <div class="toast-icon success">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>`;
  } else {
    iconSVG = `
      <div class="toast-icon warning">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>`;
  }

  toast.innerHTML = `
    ${iconSVG}
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  // Trigger animation next frame
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Fade out and remove after 2.8 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => {
      toast.remove();
    });
  }, 2800);
}

// --- YouTube API Search Integrator ---
async function searchYouTubeTracks() {
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;

  const resultsList = document.getElementById("search-results-list");
  resultsList.innerHTML = `<div class="list-placeholder">Searching frequencies...</div>`;

  const apiKey = document.getElementById("settings-api-key").value.trim();
  
  if (!apiKey) {
    resultsList.innerHTML = `
      <div class="list-placeholder">
        <span style="color:var(--accent);font-weight:600;">API Key Required</span><br>
        Please configure a YouTube Data API Key in the settings (gear icon) to perform live searches.
      </div>`;
    return;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}&maxResults=10`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API returned error code ${response.status}`);
    }
    
    const data = await response.json();
    displaySearchResults(data.items);
  } catch (err) {
    console.error("Search Error:", err);
    resultsList.innerHTML = `<div class="list-placeholder" style="color:#ef4444;">Search request failed. Verify API Key settings or connection.</div>`;
  }
}

function displaySearchResults(items) {
  const resultsList = document.getElementById("search-results-list");
  resultsList.innerHTML = "";

  if (!items || items.length === 0) {
    resultsList.innerHTML = `<div class="list-placeholder">No track matches found.</div>`;
    return;
  }

  items.forEach(item => {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const channel = item.snippet.channelTitle;
    const thumbnail = item.snippet.thumbnails.default.url;

    const card = document.createElement("div");
    card.className = "song-card";
    
    card.innerHTML = `
      <div class="song-thumbnail" style="background-image: url('${thumbnail}')"></div>
      <div class="song-info">
        <div class="song-title">${title}</div>
        <div class="song-channel">${channel}</div>
      </div>
      <div class="song-actions">
        <button class="song-card-btn add-btn" title="Add to Cassette Deck" data-id="${videoId}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    `;

    // Click result card to add track
    card.querySelector(".add-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      addTrackToPlaylist({
        id: videoId,
        title: title,
        channel: channel,
        thumbnail: thumbnail
      });
    });

    resultsList.appendChild(card);
  });
}

function addTrackToPlaylist(track) {
  playMechanicalClick("button");
  
  // Check duplicates
  if (currentPlaylist.some(t => t.id === track.id)) {
    showNotification("Cassette is already in playlist", "warning");
    return;
  }

  currentPlaylist.push(track);
  localStorage.setItem("walkman_playlist", JSON.stringify(currentPlaylist));
  renderPlaylist();
  
  // Flash added feedback on button
  showNotification("Added cassette to library", "success");
  syncUserData();
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Mechanical Walkman Playback Dials
  document.getElementById("btn-play-pause").addEventListener("click", () => {
    if (!currentTrack && currentPlaylist.length > 0) {
      playTrack(currentPlaylist[0]);
      return;
    }
    
    if (ytPlayer && ytApiReady) {
      const state = ytPlayer.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
      } else {
        if (isEjected) toggleEject(); // Close deck
        ytPlayer.playVideo();
      }
    }
  });

  document.getElementById("btn-stop").addEventListener("click", () => {
    stopPlayback();
  });

  document.getElementById("btn-eject").addEventListener("click", () => {
    toggleEject();
  });

  // Fast seek buttons hold or click
  document.getElementById("btn-ff").addEventListener("click", () => {
    if (isFastForwarding) return;
    triggerFastSeek('ff');
  });

  document.getElementById("btn-rew").addEventListener("click", () => {
    if (isRewinding) return;
    triggerFastSeek('rew');
  });


  // Settings Drawer Toggle
  document.getElementById("btn-toggle-settings").addEventListener("click", () => {
    playMechanicalClick("button");
    updateAuthUI();
    document.getElementById("settings-modal").classList.remove("hidden");
  });

  document.getElementById("btn-close-settings").addEventListener("click", () => {
    playMechanicalClick("button");
    document.getElementById("settings-modal").classList.add("hidden");
  });

  document.getElementById("btn-save-settings").addEventListener("click", saveSettings);

  // Theme dot pickers
  document.querySelectorAll(".theme-dot").forEach(dot => {
    dot.addEventListener("click", (e) => {
      playMechanicalClick("button");
      document.querySelectorAll(".theme-dot").forEach(d => d.classList.remove("active"));
      dot.classList.add("active");
      document.body.className = dot.dataset.theme;
      localStorage.setItem("walkman_theme", dot.dataset.theme);
      syncUserData();
    });
  });

  // YouTube Search trigger
  document.getElementById("search-btn").addEventListener("click", searchYouTubeTracks);
  document.getElementById("search-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchYouTubeTracks();
    }
  });

  // Clear / Load Reset library
  document.getElementById("btn-clear-playlist").addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your Walkman playlist?")) {
      currentPlaylist = [];
      localStorage.setItem("walkman_playlist", JSON.stringify(currentPlaylist));
      stopPlayback();
      currentTrack = null;
      document.getElementById("cassette-writein-title").innerText = "NO TAPE LOADING";
      document.getElementById("lcd-title").innerText = "Load a Cassette Tape";
      renderPlaylist();
      showNotification("Cleared all cassettes from library", "warning");
      syncUserData();
    }
  });

  document.getElementById("btn-load-retro").addEventListener("click", () => {
    if (confirm("Reset library back to 80s Retro Synthwave mix?")) {
      loadPlaylist(true);
      showNotification("Restored default retro cassettes", "success");
      syncUserData();
    }
  });

  // User Authentication triggers inside Settings Modal
  const authToggleLink = document.getElementById("auth-toggle-link");
  if (authToggleLink) {
    authToggleLink.addEventListener("click", (e) => {
      e.preventDefault();
      playMechanicalClick("button");
      toggleAuthMode();
    });
  }

  const btnAuthSubmit = document.getElementById("btn-auth-submit");
  if (btnAuthSubmit) {
    btnAuthSubmit.addEventListener("click", handleAuthSubmit);
  }

  const authUsernameInput = document.getElementById("auth-username");
  const authPasswordInput = document.getElementById("auth-password");
  if (authUsernameInput) {
    authUsernameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleAuthSubmit();
    });
  }
  if (authPasswordInput) {
    authPasswordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleAuthSubmit();
    });
  }

  const btnForceSync = document.getElementById("btn-force-sync");
  if (btnForceSync) {
    btnForceSync.addEventListener("click", () => {
      playMechanicalClick("button");
      syncUserData();
    });
  }

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", handleLogout);
  }

  // Mobile Drawers Navigation
  const searchPanel = document.getElementById("search-panel");
  const playlistPanel = document.getElementById("playlist-panel");

  const btnMobilePlayer = document.getElementById("btn-mobile-player");
  const btnMobileSearch = document.getElementById("btn-mobile-search");
  const btnMobilePlaylist = document.getElementById("btn-mobile-playlist");

  function updateActiveNav(activeBtn) {
    if (!activeBtn) return;
    document.querySelectorAll(".mobile-nav-btn").forEach(btn => btn.classList.remove("active-btn"));
    activeBtn.classList.add("active-btn");
  }

  const mainLayout = document.querySelector(".main-layout");

  function setMobileView(viewName, btn) {
    playMechanicalClick("button");
    if (mainLayout) {
      mainLayout.classList.remove("view-player", "view-search", "view-playlist");
      mainLayout.classList.add(`view-${viewName}`);
    }
    updateActiveNav(btn);
    requestAnimationFrame(adjustPlayerScale);
  }

  if (btnMobilePlayer) {
    btnMobilePlayer.addEventListener("click", () => {
      setMobileView("player", btnMobilePlayer);
    });
  }

  if (btnMobileSearch) {
    btnMobileSearch.addEventListener("click", () => {
      setMobileView("search", btnMobileSearch);
    });
  }

  if (btnMobilePlaylist) {
    btnMobilePlaylist.addEventListener("click", () => {
      setMobileView("playlist", btnMobilePlaylist);
    });
  }
}

// --- Initialize YouTube Script Dynamically ---
if (!window.YT) {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  console.log("YouTube API script injected dynamically");
} else {
  ytApiReady = true;
  if (typeof onYouTubeIframeAPIReady === 'function') {
    onYouTubeIframeAPIReady();
  }
}
