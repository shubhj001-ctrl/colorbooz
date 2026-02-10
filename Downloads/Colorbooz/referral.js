// Referral System
let playerCode = generatePlayerCode();
let referralData = loadReferralData();

function generatePlayerCode() {
  let code = localStorage.getItem('colorbooz_playerCode');
  if (!code) {
    code = 'CB' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('colorbooz_playerCode', code);
  }
  return code;
}

function loadReferralData() {
  const saved = localStorage.getItem('colorbooz_referral');
  return saved ? JSON.parse(saved) : {
    referralCount: 0,
    totalBonus: 0,
    referrals: [],
    usedCode: null
  };
}

function saveReferralData() {
  localStorage.setItem('colorbooz_referral', JSON.stringify(referralData));
}

function copyReferralCode() {
  const code = document.getElementById('referralCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    btn.style.background = '#22c55e';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);
  }).catch(() => {
    alert('Failed to copy code. Try again!');
  });
}

function addReferral(referredName) {
  referralData.referralCount += 1;
  referralData.totalBonus += 150;
  referralData.referrals.push({
    name: referredName,
    date: new Date().toLocaleDateString(),
    bonus: 150
  });
  saveReferralData();
  updateReferralDisplay();
}

function loadBalance() {
  const saved = localStorage.getItem('colorbooz_balance');
  return saved ? Number(saved) : 5000;
}

function updateReferralDisplay() {
  // Update referral code
  document.getElementById('referralCode').textContent = playerCode;
  
  // Update earnings
  document.getElementById('totalReferralBonus').textContent = referralData.totalBonus;
  
  // Update referral count
  document.getElementById('activeReferralCount').textContent = referralData.referralCount;
  
  // Update history
  updateReferralHistoryDisplay();
}

function updateReferralHistoryDisplay() {
  const historyList = document.getElementById('referralHistoryList');
  
  if (referralData.referrals.length === 0) {
    historyList.innerHTML = '<div class="no-history">No referrals yet. Start sharing your code to earn!</div>';
    return;
  }
  
  let html = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Friend Name</th>
          <th>Date</th>
          <th>Bonus Earned</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  referralData.referrals.forEach(referral => {
    html += `
      <tr>
        <td>${referral.name}</td>
        <td>${referral.date}</td>
        <td style="color: #22c55e; font-weight: 600;">+₹${referral.bonus}</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  historyList.innerHTML = html;
}

// Initialize on page load
window.addEventListener('load', function() {
  playerCode = generatePlayerCode();
  referralData = loadReferralData();
  updateReferralDisplay();
});
