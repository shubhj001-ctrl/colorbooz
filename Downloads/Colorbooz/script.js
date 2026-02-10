// Account System
function getAllAccounts() {
  const accounts = localStorage.getItem('colorbooz_accounts');
  return accounts ? JSON.parse(accounts) : [];
}

function saveAllAccounts(accounts) {
  localStorage.setItem('colorbooz_accounts', JSON.stringify(accounts));
}

function getCurrentUser() {
  return localStorage.getItem('colorbooz_current_user');
}

function setCurrentUser(phone) {
  localStorage.setItem('colorbooz_current_user', phone);
}

function isUserLoggedIn() {
  return localStorage.getItem('colorbooz_current_user') !== null;
}

function userLogout() {
  localStorage.removeItem('colorbooz_current_user');
  showLoginPage();
}

function switchAuthTab(tab) {
  // Hide all tabs
  document.querySelectorAll('.auth-tab').forEach(el => {
    el.classList.remove('active');
  });
  
  // Remove active from all buttons
  document.querySelectorAll('.auth-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tab + 'Tab').classList.add('active');
  
  // Mark button as active
  event.target.classList.add('active');
  
  // Clear error messages
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

function userRegister() {
  const name = document.getElementById('registerName').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const errorDiv = document.getElementById('registerError');
  
  // Validation
  if (!name) {
    errorDiv.textContent = 'Please enter your full name';
    return;
  }
  
  if (!phone) {
    errorDiv.textContent = 'Please enter your phone number';
    return;
  }
  
  if (!validatePhone(phone)) {
    errorDiv.textContent = 'Please enter a valid 10-digit phone number';
    return;
  }
  
  if (!email) {
    errorDiv.textContent = 'Please enter your email address';
    return;
  }
  
  if (!validateEmail(email)) {
    errorDiv.textContent = 'Please enter a valid email address';
    return;
  }
  
  if (!password) {
    errorDiv.textContent = 'Please enter a password';
    return;
  }
  
  if (password.length < 6) {
    errorDiv.textContent = 'Password must be at least 6 characters';
    return;
  }
  
  if (password !== confirmPassword) {
    errorDiv.textContent = 'Passwords do not match';
    return;
  }
  
  // Check if phone already exists
  const accounts = getAllAccounts();
  if (accounts.some(acc => acc.phone === phone)) {
    errorDiv.textContent = 'Phone number already registered';
    return;
  }
  
  // Create account
  const newAccount = {
    name: name,
    phone: phone,
    email: email,
    password: password,
    balance: 5000,
    registeredAt: new Date().toLocaleString(),
    status: 'active'
  };
  
  accounts.push(newAccount);
  saveAllAccounts(accounts);
  
  // Show success message and switch to login
  showToast('🎉 Account created successfully! Now login to play.', true);
  
  // Clear form
  document.getElementById('registerName').value = '';
  document.getElementById('registerPhone').value = '';
  document.getElementById('registerEmail').value = '';
  document.getElementById('registerPassword').value = '';
  document.getElementById('registerConfirmPassword').value = '';
  errorDiv.textContent = '';
  
  // Switch to login tab after 2 seconds
  setTimeout(() => {
    switchAuthTab('login');
  }, 2000);
}

function userLogin() {
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  // Validation
  if (!phone) {
    errorDiv.textContent = 'Please enter your phone number';
    return;
  }
  
  if (!password) {
    errorDiv.textContent = 'Please enter your password';
    return;
  }
  
  // Check credentials
  const accounts = getAllAccounts();
  const account = accounts.find(acc => acc.phone === phone && acc.password === password);
  
  if (!account) {
    errorDiv.textContent = 'Invalid phone number or password';
    return;
  }
  
  if (account.status !== 'active') {
    errorDiv.textContent = 'Your account has been disabled. Contact support.';
    return;
  }
  
  // Login successful
  setCurrentUser(phone);
  balance = account.balance;
  saveBalance();
  
  document.getElementById('loginPhone').value = '';
  document.getElementById('loginPassword').value = '';
  errorDiv.textContent = '';
  
  showToast(`🎮 Welcome ${account.name}! Let's play!`, true);
  
  // Show main app after 1.5 seconds
  setTimeout(() => {
    showMainApp(account);
  }, 1500);
}

function showMainApp(account) {
  document.getElementById('loginRegisterPage').style.display = 'none';
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('username').textContent = `User: ${account.name}`;
  document.getElementById('wallet').textContent = `Wallet: ₹${balance}`;
}

function showLoginPage() {
  document.getElementById('loginRegisterPage').style.display = 'flex';
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('loginPhone').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').textContent = '';
}

// Registration System - OLD FUNCTIONS
function isUserRegistered() {
  return localStorage.getItem('colorbooz_user_registered') === 'true';
}

function getUserData() {
  const data = localStorage.getItem('colorbooz_user_data');
  return data ? JSON.parse(data) : null;
}

function saveUserData(userData) {
  localStorage.setItem('colorbooz_user_data', JSON.stringify(userData));
}

function completeRegistration() {
  const username = document.getElementById('registrationUsername').value.trim();
  const referralCode = document.getElementById('registrationReferralCode').value.trim();
  const errorDiv = document.getElementById('registrationError');
  
  if (!username) {
    errorDiv.textContent = 'Please enter a username';
    return;
  }
  
  if (username.length < 3) {
    errorDiv.textContent = 'Username must be at least 3 characters';
    return;
  }
  
  // Save user data
  const userData = {
    username: username,
    registeredAt: new Date().toLocaleString(),
    referralCodeUsed: referralCode || null
  };
  
  saveUserData(userData);
  localStorage.setItem('colorbooz_user_registered', 'true');
  
  // Update UI
  document.getElementById('username').textContent = `User: ${username}`;
  
  // Apply referral code if provided
  if (referralCode) {
    applyRegistrationReferralCode(referralCode);
  }
  
  // Hide registration modal and show main app
  document.getElementById('registrationModal').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  
  showToast('🎉 Account created successfully!', true);
}

function applyRegistrationReferralCode(referralCode) {
  // Give 100 rupees bonus for using referral code during signup
  balance += 100;
  saveBalance();
  
  // Store the fact that this code was used (to prevent duplicate usage)
  const referralData = JSON.parse(localStorage.getItem('colorbooz_referral') || '{"referralCount": 0, "totalBonus": 0, "referrals": [], "usedCode": null}');
  referralData.usedCode = referralCode;
  localStorage.setItem('colorbooz_referral', JSON.stringify(referralData));
  
  showToast('🎉 Welcome Bonus: +₹100!', true);
}

let balance = loadBalance();
let timeLeft = 30;
let colorBets = [];
let numberBets = [];
let history = [];
let betHistory = loadBetHistory();

// Bet series tracking
let currentDate = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
let dailyBetCounter = 0;
let currentBetSeries = null;

// Bet limits
const MIN_BET = 10;
const MAX_BET = 1000;
const BET_CUTOFF_TIME = 5; // seconds before round ends

// LocalStorage functions
function loadBalance() {
  const saved = localStorage.getItem('colorbooz_balance');
  return saved ? Number(saved) : 5000;
}

function saveBalance() {
  localStorage.setItem('colorbooz_balance', balance);
}

function loadBetHistory() {
  const saved = localStorage.getItem('colorbooz_history');
  return saved ? JSON.parse(saved) : [];
}

function saveBetHistory() {
  localStorage.setItem('colorbooz_history', JSON.stringify(betHistory.slice(0, 50)));
}

// Load color predictions for game logic
function loadColorPredictions() {
  const saved = localStorage.getItem('colorbooz_predictions');
  return saved ? JSON.parse(saved) : {};
}

let colorPredictions = loadColorPredictions();

let leaderboardMode = 'daily';

// Simulated other players for live feed and leaderboard
let simulatedPlayers = loadSimulatedPlayers();

function loadSimulatedPlayers() {
  const saved = localStorage.getItem('colorbooz_players');
  if (saved) return JSON.parse(saved);
  
  return [
    { name: 'Player1', profit: Math.floor(Math.random() * 5000) - 1000, lastBet: 0 },
    { name: 'Player2', profit: Math.floor(Math.random() * 5000) - 1000, lastBet: 0 },
    { name: 'Player3', profit: Math.floor(Math.random() * 5000) - 1000, lastBet: 0 },
    { name: 'Player4', profit: Math.floor(Math.random() * 5000) - 1000, lastBet: 0 },
    { name: 'DemoUser', profit: balance - 5000, lastBet: 0 }
  ];
}

function saveSimulatedPlayers() {
  localStorage.setItem('colorbooz_players', JSON.stringify(simulatedPlayers));
}

// COLORS array for the game
let COLORS = [
  { name: "Green", weight: 45, payout: 2, hex: "#22c55e" },
  { name: "Red", weight: 45, payout: 2, hex: "#ef4444" },
  { name: "Violet", weight: 10, payout: 5, hex: "#a855f7" }
];

// NUMBER_MAP: combo numbers (0, 5) have two colors
const NUMBER_MAP = {
  0: ["Green", "Violet"],
  1: "Green",
  2: "Red",
  3: "Green",
  4: "Red",
  5: ["Red", "Violet"],
  6: "Red",
  7: "Green",
  8: "Red",
  9: "Green"
};

// Create reverse mapping: color -> numbers
function getNumbersForColor(colorName) {
  const numbers = [];
  for (let num = 0; num <= 9; num++) {
    const mapping = NUMBER_MAP[num];
    if (Array.isArray(mapping)) {
      if (mapping.includes(colorName)) numbers.push(num);
    } else if (mapping === colorName) {
      numbers.push(num);
    }
  }
  return numbers;
}

function updateUI() {
  document.getElementById("wallet").innerText = "Wallet: ₹" + balance;
  document.getElementById("timer").innerText = timeLeft;
  
  // Display current bet series if exists
  if (currentBetSeries) {
    document.getElementById("betSeries").innerText = "Bet Series: " + currentBetSeries;
  }
  
  // Update active bets display
  updateActiveBetsDisplay();
  
  // Update bet history display
  updateBetHistoryDisplay();
  
  // Disable betting in last 5 seconds
  const bettingDisabled = timeLeft <= BET_CUTOFF_TIME;
  document.querySelectorAll('button[onclick^="placeBet"], button[onclick^="placeNumberBet"]').forEach(btn => {
    btn.disabled = bettingDisabled;
    if (bettingDisabled) {
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });

  const histDiv = document.getElementById("history");
  histDiv.innerHTML = "";
  history.forEach(item => {
    const container = document.createElement("div");
    container.className = "history-item-container";
    
    // Color dot
    const dot = document.createElement("div");
    dot.className = "dot";
    dot.style.background = item.color.hex;
    
    // Numbers text
    const numbersText = document.createElement("div");
    numbersText.className = "history-numbers";
    
    const winningNumber = item.winningNumber;
    const numberMapping = NUMBER_MAP[winningNumber];
    const isCombo = Array.isArray(numberMapping);
    
    let displayText = '';
    if (isCombo) {
      // Show both colors and both numbers
      displayText = `${numberMapping[0]},${numberMapping[1]} (${winningNumber})`;
    } else {
      // Single color - show all numbers that produce this color
      const numbersForColor = getNumbersForColor(item.color.name);
      displayText = `${item.color.name} (${numbersForColor.join(',')})`;
    }
    
    numbersText.textContent = displayText;
    
    container.appendChild(dot);
    container.appendChild(numbersText);
    histDiv.appendChild(container);
  });
}

function updateActiveBetsDisplay() {
  const listDiv = document.getElementById("activeBetsList");
  
  if (colorBets.length === 0 && numberBets.length === 0) {
    listDiv.innerHTML = "No bets placed";
    return;
  }
  
  let html = "";
  
  // Group color bets by color
  const colorTotals = {};
  colorBets.forEach(bet => {
    colorTotals[bet.color] = (colorTotals[bet.color] || 0) + bet.amount;
  });
  
  for (let color in colorTotals) {
    html += `<div class="bet-item">${color}: ₹${colorTotals[color]}</div>`;
  }
  
  // Group number bets by number
  const numberTotals = {};
  numberBets.forEach(bet => {
    numberTotals[bet.number] = (numberTotals[bet.number] || 0) + bet.amount;
  });
  
  for (let num in numberTotals) {
    html += `<div class="bet-item">Number ${num}: ₹${numberTotals[num]}</div>`;
  }
  
  listDiv.innerHTML = html;
}

function updateBetHistoryDisplay() {
  const listDiv = document.getElementById("betHistoryList");
  
  if (betHistory.length === 0) {
    listDiv.innerHTML = "<div style='padding: 20px; text-align: center; opacity: 0.6;'>No history yet</div>";
    return;
  }
  
  let html = "";
  betHistory.slice(0, 10).forEach(record => {
    const plClass = record.profitLoss >= 0 ? 'profit' : 'loss';
    const plSign = record.profitLoss >= 0 ? '+' : '';
    
    html += `
      <div class="history-row">
        <span style="font-size: 12px; opacity: 0.8;">${record.series}</span>
        <span style="font-weight: bold; color: #fbbf24;">${record.winningNumber}</span>
        <span style="font-size: 12px;">${record.yourBets}</span>
        <span style="font-size: 12px; opacity: 0.8;">${record.result}</span>
        <span class="${plClass}">${plSign}₹${record.profitLoss}</span>
      </div>
    `;
  });
  
  listDiv.innerHTML = html;
}

function showToast(message, isWin) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + (isWin ? 'win' : 'loss');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function setAmount(amount) {
  document.getElementById("betAmount").value = amount;
}

function generateBetSeries() {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  
  // Reset counter if date changed
  if (today !== currentDate) {
    currentDate = today;
    dailyBetCounter = 0;
  }
  
  dailyBetCounter++;
  const counterStr = String(dailyBetCounter).padStart(3, '0');
  return currentDate + counterStr;
}

function weightedRandom() {
  let total = COLORS.reduce((a,b)=>a+b.weight,0);
  let r = Math.random()*total;
  for (let c of COLORS) {
    if (r < c.weight) return c;
    r -= c.weight;
  }
  return COLORS[0];
}

function profitResult() {
  if (!colorBets.length && !numberBets.length) return weightedRandom();

  let risks = COLORS.map(c => {
    let total = colorBets.filter(b=>b.color===c.name)
      .reduce((a,b)=>a+b.amount,0);
    return { color:c, risk: total*c.payout };
  });

  risks.sort((a,b)=>a.risk-b.risk);
  return risks[0].color;
}

function runRound() {
  // Store bets before clearing
  const roundColorBets = [...colorBets];
  const roundNumberBets = [...numberBets];
  const totalBetAmount = [...colorBets, ...numberBets].reduce((sum, bet) => sum + bet.amount, 0);
  
  // Check if there's a color prediction for the current series
  const prediction = colorPredictions.find(p => p.series === dailyBetCounter.toString());
  
  let winningNumber;
  
  if (prediction) {
    // Use predicted color - pick a random number that produces that color
    const numbersForColor = getNumbersForColor(prediction.color);
    winningNumber = numbersForColor[Math.floor(Math.random() * numbersForColor.length)];
  } else {
    // Generate random winning number (0-9)
    winningNumber = Math.floor(Math.random() * 10);
  }
  
  const numberMapping = NUMBER_MAP[winningNumber];
  const isCombo = Array.isArray(numberMapping);
  
  // Show result display
  displayResult(winningNumber);
  
  // Determine winning colors
  let winningColors = [];
  if (isCombo) {
    winningColors = numberMapping; // Both colors win
  } else {
    winningColors = [numberMapping]; // Single color
  }
  
  let totalWinnings = 0;
  
  // Process color bets
  colorBets.forEach(bet => {
    if (winningColors.includes(bet.color)) {
      const colorObj = COLORS.find(c => c.name === bet.color);
      if (isCombo) {
        const halfProfitPayout = 1 + (colorObj.payout - 1) * 0.5;
        const winAmount = bet.amount * halfProfitPayout;
        balance += winAmount;
        totalWinnings += winAmount;
      } else {
        const winAmount = bet.amount * colorObj.payout;
        balance += winAmount;
        totalWinnings += winAmount;
      }
    }
  });
  
  // Process number bets (full payout always)
  numberBets.forEach(bet => {
    if (bet.number === winningNumber) {
      const winAmount = bet.amount * 9;
      balance += winAmount;
      totalWinnings += winAmount;
    }
  });
  
  // Calculate profit/loss
  const profitLoss = totalWinnings - totalBetAmount;
  
  // Save balance to localStorage
  saveBalance();
  
  // Show toast notification
  if (totalBetAmount > 0) {
    if (profitLoss > 0) {
      showToast(`🎉 You Won ₹${profitLoss}!`, true);
    } else if (profitLoss < 0) {
      showToast(`😔 You Lost ₹${Math.abs(profitLoss)}`, false);
    } else {
      showToast(`Break Even!`, true);
    }
  }
  
  // Record bet history
  if (totalBetAmount > 0) {
    const yourBets = [];
    roundColorBets.forEach(bet => yourBets.push(`${bet.color} ₹${bet.amount}`));
    roundNumberBets.forEach(bet => yourBets.push(`#${bet.number} ₹${bet.amount}`));
    
    betHistory.unshift({
      series: currentBetSeries,
      winningNumber: winningNumber,
      yourBets: yourBets.join(', '),
      result: totalWinnings > 0 ? 'Win' : 'Loss',
      profitLoss: profitLoss
    });
    
    betHistory = betHistory.slice(0, 50);
    saveBetHistory();
  }
  
  // Store first color in history for UI
  const historyColor = COLORS.find(c => c.name === winningColors[0]);
  history.unshift({
    color: historyColor,
    winningNumber: winningNumber,
    colors: winningColors
  });
  history = history.slice(0, 20);
  
  // Clear bets and reset series for next round
  colorBets = [];
  numberBets = [];
  currentBetSeries = null;
}

function displayResult(number) {
  const resultDisplay = document.getElementById("resultDisplay");
  const resultNumber = document.getElementById("resultNumber");
  const timerDiv = document.getElementById("timer");
  
  // Hide timer, show result
  timerDiv.style.display = 'none';
  resultNumber.textContent = number;
  resultDisplay.classList.remove('hidden');
  
  // Set color based on number
  const mapping = NUMBER_MAP[number];
  if (Array.isArray(mapping)) {
    // Combo color
    const color1 = COLORS.find(c => c.name === mapping[0]);
    const color2 = COLORS.find(c => c.name === mapping[1]);
    resultNumber.style.background = `linear-gradient(135deg, ${color1.hex} 50%, ${color2.hex} 50%)`;
    resultNumber.style.webkitBackgroundClip = 'text';
    resultNumber.style.webkitTextFillColor = 'transparent';
    resultNumber.style.backgroundClip = 'text';
  } else {
    const color = COLORS.find(c => c.name === mapping);
    resultNumber.style.color = color.hex;
    resultNumber.style.background = 'none';
    resultNumber.style.webkitTextFillColor = color.hex;
  }
  
  // Hide result after 3 seconds
  setTimeout(() => {
    resultDisplay.classList.add('hidden');
    timerDiv.style.display = 'block';
  }, 3000);
}

function placeBet(color) {
  // Check if betting is allowed
  if (timeLeft <= BET_CUTOFF_TIME) {
    alert("Betting closed! Wait for next round.");
    return;
  }
  
  let amt = Number(document.getElementById("betAmount").value);
  
  // Validate bet amount
  if (amt < MIN_BET) {
    alert(`Minimum bet is ₹${MIN_BET}`);
    return;
  }
  if (amt > MAX_BET) {
    alert(`Maximum bet is ₹${MAX_BET}`);
    return;
  }
  if (balance < amt) {
    alert("Low Balance");
    return;
  }

  // Generate bet series for first bet of the round
  if (!currentBetSeries) {
    currentBetSeries = generateBetSeries();
  }

  balance -= amt;
  colorBets.push({ color, amount: amt, series: currentBetSeries });
  saveBalance();
  updateUI();
}

function placeNumberBet(number) {
  // Check if betting is allowed
  if (timeLeft <= BET_CUTOFF_TIME) {
    alert("Betting closed! Wait for next round.");
    return;
  }
  
  let amt = Number(document.getElementById("betAmount").value);
  
  // Validate bet amount
  if (amt < MIN_BET) {
    alert(`Minimum bet is ₹${MIN_BET}`);
    return;
  }
  if (amt > MAX_BET) {
    alert(`Maximum bet is ₹${MAX_BET}`);
    return;
  }
  if (balance < amt) {
    alert("Low Balance");
    return;
  }

  // Generate bet series for first bet of the round
  if (!currentBetSeries) {
    currentBetSeries = generateBetSeries();
  }

  balance -= amt;
  numberBets.push({ number, amount: amt, series: currentBetSeries });
  saveBalance();
  updateUI();
}

function toggleAdmin() {
  adminVisible = !adminVisible;
  document.getElementById("adminPanel").classList.toggle("hidden");
  
  if (adminVisible) {
    // Load accounts when opening admin panel
    updateAccountsList();
    updatePredictionsList();
  }
}

function updateWeights() {
  COLORS[0].weight = Number(document.getElementById("wGreen").value);
  COLORS[1].weight = Number(document.getElementById("wRed").value);
  COLORS[2].weight = Number(document.getElementById("wViolet").value);
}

// Leaderboard Functions
function updateLeaderboard() {
  const feedDiv = document.getElementById('liveBetFeed');
  const colors = ['Green', 'Red', 'Violet'];
  const bets = [50, 100, 500, 1000];
  const players = ['Player1', 'Player2', 'Player3', 'Player4'];
  
  // Randomly generate a bet to show
  const randomPlayer = players[Math.floor(Math.random() * players.length)];
  const randomBet = bets[Math.floor(Math.random() * bets.length)];
  const randomChoice = Math.random() > 0.7 ? 
    '#' + Math.floor(Math.random() * 10) : 
    colors[Math.floor(Math.random() * colors.length)];
  
  // Keep last 5 bets
  let currentItems = feedDiv.querySelectorAll('.feed-item');
  if (currentItems.length >= 5) {
    currentItems[currentItems.length - 1].remove();
  }
  
  // Add new bet at top
  const newBet = document.createElement('div');
  newBet.className = 'feed-item';
  newBet.textContent = '👤 ' + randomPlayer + ' bet ₹' + randomBet + ' on ' + randomChoice;
  feedDiv.insertBefore(newBet, feedDiv.firstChild);
}

function updateLeaderboard() {
  const lb = document.getElementById('leaderboard');
  lb.innerHTML = '';
  
  // Update player data randomly
  simulatedPlayers.forEach((p, i) => {
    if (i < 4) {
      p.profit += Math.floor(Math.random() * 400) - 100;
    } else {
      p.profit = balance - 5000;
    }
  });
  
  // Sort by profit
  let sorted = [...simulatedPlayers].sort((a, b) => b.profit - a.profit);
  
  sorted.forEach((player, index) => {
    const entry = document.createElement('div');
    entry.className = 'leaderboard-entry';
    
    let rankClass = '';
    if (index === 0) rankClass = 'gold';
    else if (index === 1) rankClass = 'silver';
    else if (index === 2) rankClass = 'bronze';
    
    entry.innerHTML = `
      <div class="rank-badge ${rankClass}">${index + 1}</div>
      <div class="leaderboard-name">${player.name}</div>
      <div class="leaderboard-profit">₹${player.profit}</div>
    `;
    lb.appendChild(entry);
  });
  
  saveSimulatedPlayers();
}

function switchLeaderboard(mode) {
  leaderboardMode = mode;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // In real app, fetch different data for daily/weekly/alltime
  updateLeaderboard();
}

setInterval(()=>{
  timeLeft--;
  if (timeLeft === 0) {
    runRound();
    timeLeft = 30;
  }
  updateUI();
},1000);

updateUI();

// Initialize on page load
window.addEventListener('load', () => {
  // Check if user is logged in
  if (isUserLoggedIn()) {
    // User is logged in, show main app
    const phone = getCurrentUser();
    const accounts = getAllAccounts();
    const account = accounts.find(acc => acc.phone === phone);
    
    if (account) {
      showMainApp(account);
    } else {
      showLoginPage();
    }
  } else {
    // User is not logged in, show login page
    showLoginPage();
  }
  
  updateLeaderboard();
  simulateLiveBets();
  setInterval(simulateLiveBets, 5000);
  setInterval(() => {
    updateLeaderboard();
  }, 15000);
});
