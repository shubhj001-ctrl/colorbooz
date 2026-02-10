// Admin credentials
const ADMIN_USERNAME = 'Booz.master';
const ADMIN_PASSWORD = 'Shubh@0924';

let currentPredictionColor = null;

function isAdminLoggedIn() {
  return localStorage.getItem('colorbooz_admin_logged_in') === 'true';
}

function adminLogin() {
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  if (!username || !password) {
    errorDiv.textContent = 'Please enter both username and password';
    return;
  }
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Login successful
    localStorage.setItem('colorbooz_admin_logged_in', 'true');
    document.getElementById('adminLoginPage').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    
    // Load data
    updateAccountsList();
    updatePredictionsList();
  } else {
    errorDiv.textContent = 'Invalid username or password';
  }
}

function adminLogout() {
  localStorage.removeItem('colorbooz_admin_logged_in');
  document.getElementById('adminDashboard').classList.add('hidden');
  document.getElementById('adminLoginPage').classList.remove('hidden');
  document.getElementById('loginError').textContent = '';
  document.getElementById('adminUsername').value = '';
  document.getElementById('adminPassword').value = '';
}

function switchAdminTab(tab) {
  // Hide all tabs
  document.querySelectorAll('.admin-tab').forEach(el => {
    el.classList.remove('active');
  });
  
  // Remove active from all buttons
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tab + 'Tab').classList.add('active');
  
  // Mark button as active
  event.target.classList.add('active');
}

// Account Management
function loadAccounts() {
  let accounts = localStorage.getItem('colorbooz_accounts');
  if (!accounts) {
    accounts = [
      { username: 'DemoUser', balance: 5000, status: 'active' },
      { username: 'Player1', balance: 3500, status: 'active' },
      { username: 'Player2', balance: 2000, status: 'active' },
      { username: 'Player3', balance: 4500, status: 'active' },
      { username: 'Player4', balance: 1800, status: 'inactive' }
    ];
    localStorage.setItem('colorbooz_accounts', JSON.stringify(accounts));
    return accounts;
  }
  return JSON.parse(accounts);
}

function saveAccounts(accounts) {
  localStorage.setItem('colorbooz_accounts', JSON.stringify(accounts));
}

function updateAccountsList() {
  const accounts = loadAccounts();
  const accountsList = document.getElementById('accountsList');
  
  if (accounts.length === 0) {
    accountsList.innerHTML = '<div class="no-data">No accounts found</div>';
    return;
  }
  
  let html = '';
  accounts.forEach(account => {
    const statusClass = account.status === 'active' ? 'active' : 'inactive';
    const btnClass = account.status === 'active' ? 'disable-btn' : 'enable-btn';
    const btnText = account.status === 'active' ? 'Disable' : 'Enable';
    
    html += `
      <div class="account-card">
        <div class="account-name">👤 ${account.username}</div>
        <div class="account-balance">₹${account.balance}</div>
        <div class="account-status ${statusClass}">${account.status.toUpperCase()}</div>
        <button class="account-action-btn ${btnClass}" onclick="toggleAccountStatus('${account.username}')">${btnText}</button>
      </div>
    `;
  });
  accountsList.innerHTML = html;
}

function toggleAccountStatus(username) {
  const accounts = loadAccounts();
  const account = accounts.find(a => a.username === username);
  if (account) {
    account.status = account.status === 'active' ? 'inactive' : 'active';
    saveAccounts(accounts);
    updateAccountsList();
  }
}

// Color Predictions
function loadColorPredictions() {
  let predictions = localStorage.getItem('colorbooz_predictions');
  if (!predictions) {
    return {};
  }
  return JSON.parse(predictions);
}

function saveColorPredictions(predictions) {
  localStorage.setItem('colorbooz_predictions', JSON.stringify(predictions));
}

function selectPredictionColor(color) {
  currentPredictionColor = color;
  document.getElementById('selectedColorDisplay').innerHTML = `🎯 Selected: <strong>${color}</strong>`;
  
  // Visual feedback
  document.querySelectorAll('.color-select-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  event.target.classList.add('selected');
}

function getColorHex(color) {
  switch(color) {
    case 'Green': return '#22c55e';
    case 'Red': return '#ef4444';
    case 'Violet': return '#a855f7';
    default: return '#ffffff';
  }
}

function getColorEmoji(color) {
  switch(color) {
    case 'Green': return '🟢';
    case 'Red': return '🔴';
    case 'Violet': return '🟣';
    default: return '⚪';
  }
}

function savePrediction() {
  const seriesNumber = document.getElementById('seriesNumber').value.trim();
  const predictions = loadColorPredictions();
  
  if (!seriesNumber) {
    alert('Please enter a series number');
    return;
  }
  
  if (!currentPredictionColor) {
    alert('Please select a color');
    return;
  }
  
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seriesKey = today + seriesNumber.padStart(3, '0');
  
  if (predictions[seriesKey]) {
    alert('This series already has a color prediction');
    return;
  }
  
  predictions[seriesKey] = currentPredictionColor;
  saveColorPredictions(predictions);
  
  document.getElementById('seriesNumber').value = '';
  currentPredictionColor = null;
  document.getElementById('selectedColorDisplay').textContent = 'Select a color';
  document.querySelectorAll('.color-select-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  updatePredictionsList();
  alert('✅ Color prediction saved for series ' + seriesKey);
}

function deletePrediction(seriesKey) {
  if (!confirm('Delete this prediction?')) return;
  
  const predictions = loadColorPredictions();
  delete predictions[seriesKey];
  saveColorPredictions(predictions);
  updatePredictionsList();
}

function updatePredictionsList() {
  const predictions = loadColorPredictions();
  const predictionsList = document.getElementById('predictionsList');
  
  if (Object.keys(predictions).length === 0) {
    predictionsList.innerHTML = '<div class="no-data">No predictions set yet</div>';
    return;
  }
  
  let html = '';
  const sortedEntries = Object.entries(predictions).sort((a, b) => b[0].localeCompare(a[0]));
  
  sortedEntries.forEach(([series, color]) => {
    const colorHex = getColorHex(color);
    const emoji = getColorEmoji(color);
    
    html += `
      <div class="prediction-card">
        <div class="prediction-info">
          <div class="prediction-series">📋 Series: ${series}</div>
          <div class="prediction-color" style="background: rgba(${color === 'Green' ? '34, 197, 94' : color === 'Red' ? '239, 68, 68' : '168, 85, 247'}, 0.3); color: ${colorHex};">
            ${emoji} ${color}
          </div>
        </div>
        <button class="prediction-delete" onclick="deletePrediction('${series}')">🗑️ Delete</button>
      </div>
    `;
  });
  predictionsList.innerHTML = html;
}

function updateWeights() {
  const green = parseInt(document.getElementById('wGreen').value);
  const red = parseInt(document.getElementById('wRed').value);
  const violet = parseInt(document.getElementById('wViolet').value);
  
  if (green + red + violet !== 100) {
    alert('❌ Weights must add up to 100%\nCurrent total: ' + (green + red + violet) + '%');
    return;
  }
  
  localStorage.setItem('colorbooz_weights', JSON.stringify({ green, red, violet }));
  alert('✅ Color weights updated successfully!\n🟢 Green: ' + green + '%\n🔴 Red: ' + red + '%\n🟣 Violet: ' + violet + '%');
}

// Check if already logged in on page load
window.addEventListener('load', function() {
  if (isAdminLoggedIn()) {
    document.getElementById('adminLoginPage').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    updateAccountsList();
    updatePredictionsList();
  }
});
