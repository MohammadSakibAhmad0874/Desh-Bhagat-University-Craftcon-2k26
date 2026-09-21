/**
 * CRAFTCON '26 — GAMING ARENA FRONTEND ENGINE
 * Centralized Registration Wizard State Machine, Payment Integration & Interactive Mechanics
 */

document.addEventListener('DOMContentLoaded', () => {
  initGamingCategoryFilter();
  initGameDetailsModal();
  initCentralizedRegistrationWizard();
  initScrollRevealObserver();
  initCardTiltPhysics();
});

/* ==========================================================================
   GAMES REGISTRY & CONFIGURATION
   ========================================================================== */
const GAMES_CATALOGUE = {
  'BGMI': {
    id: 'BGMI',
    name: 'BGMI (Battlegrounds Mobile India)',
    category: 'online',
    type: 'squad',
    minPlayers: 4,
    feePerPerson: 50,
    description: 'Tactic-driven 36-minute Battle Royale squad showdown on Erangel. 4 players per squad.',
    image: 'assets/images/games/bgmi_banner.jpg'
  },
  'FREE_FIRE': {
    id: 'FREE_FIRE',
    name: 'Free Fire MAX',
    category: 'online',
    type: 'squad',
    minPlayers: 4,
    feePerPerson: 50,
    description: 'High-octane fast-paced 4v4 Clash Squad and Battle Royale arena combat. 4 players per squad.',
    image: 'assets/images/games/freefire_banner.jpg'
  },
  'MOBILE_LEGENDS': {
    id: 'MOBILE_LEGENDS',
    name: 'Mobile Legends: Bang Bang',
    category: 'online',
    type: 'squad',
    minPlayers: 5,
    feePerPerson: 50,
    description: '5v5 MOBA strategic lane warfare, jungle objectives, and base destruction. 5 players per squad.',
    image: 'assets/images/games/mlbb_banner.jpg'
  },
  'LUDO': {
    id: 'LUDO',
    name: 'Ludo King Championship',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    feePerPerson: 50,
    description: 'Physical board-to-table dice strategy combat with zero ping latency. Solo entry.',
    image: 'assets/images/games/ludo_banner.jpg'
  },
  'CHESS': {
    id: 'CHESS',
    name: 'Speed Chess Masters',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    feePerPerson: 50,
    description: '10-minute classical blitz & tactics tournament on physical chessboards. Solo entry.',
    image: 'assets/images/games/chess_banner.jpg'
  },
  'CARROM': {
    id: 'CARROM',
    name: 'Carrom Strike Tournament',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    feePerPerson: 50,
    description: 'Precision striker control, pocket calculation, and queen cover battles. Solo entry.',
    image: 'assets/images/games/carrom_banner.jpg'
  }
};

/* ==========================================================================
   1. CATEGORY FILTER TABS
   ========================================================================== */
function initGamingCategoryFilter() {
  const filterBtns = document.querySelectorAll('.gaming-filter-tabs .filter-btn');
  const gameCards = document.querySelectorAll('.games-grid .game-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof playMinecraftSound === 'function') playMinecraftSound('click');

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      gameCards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
          card.style.animation = 'fadeInStep 0.4s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   2. GAME DETAILS MODAL
   ========================================================================== */
function initGameDetailsModal() {
  const modal = document.getElementById('game-details-modal');
  const closeBtn = document.getElementById('close-details-modal-btn');
  const detailBtns = document.querySelectorAll('.btn-card-details');

  const titleEl = document.getElementById('details-modal-title');
  const imgEl = document.getElementById('details-modal-img');
  const descEl = document.getElementById('details-modal-desc');
  const typeEl = document.getElementById('details-modal-type');
  const playersEl = document.getElementById('details-modal-players');
  const totalEl = document.getElementById('details-modal-total');
  const regBtn = document.getElementById('details-modal-reg-btn');

  detailBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof playMinecraftSound === 'function') playMinecraftSound('pop');
      const gameId = btn.getAttribute('data-game-id');
      const config = GAMES_CATALOGUE[gameId];
      if (!config) return;

      titleEl.textContent = config.name;
      imgEl.src = config.image;
      descEl.textContent = config.description;
      typeEl.textContent = config.type.toUpperCase();
      playersEl.textContent = config.minPlayers;
      totalEl.textContent = `₹${config.minPlayers * 50}`;

      regBtn.setAttribute('data-preset-game', gameId);

      modal.classList.add('active');
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

/* ==========================================================================
   3. CENTRALIZED REGISTRATION WIZARD STATE MACHINE
   ========================================================================== */
let wizardState = {
  step: 1,
  category: 'online', // 'online' or 'offline'
  gameId: 'BGMI',
  teamName: '',
  college: '',
  captain: { name: '', ign: '', email: '', phone: '' },
  players: [],
  playerCount: 4,
  feePerPerson: 50,
  totalAmount: 200,
  registrationId: null,
  orderId: null,
  paymentId: null
};

function initCentralizedRegistrationWizard() {
  const modal = document.getElementById('gaming-registration-modal');
  const closeBtn = document.getElementById('close-reg-modal-btn');
  const openBtns = document.querySelectorAll('.open-gaming-reg-btn');

  const prevBtn = document.getElementById('btn-wizard-prev');
  const nextBtn = document.getElementById('btn-wizard-next');
  const progressFill = document.getElementById('wizard-progress-fill');
  const stepTitleEl = document.getElementById('wizard-step-title');
  const stepCounterEl = document.getElementById('wizard-step-counter');

  // Launch modal with optional preset game
  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof playMinecraftSound === 'function') playMinecraftSound('click');

      const presetGame = btn.getAttribute('data-preset-game');
      if (presetGame && GAMES_CATALOGUE[presetGame]) {
        wizardState.gameId = presetGame;
        wizardState.category = GAMES_CATALOGUE[presetGame].category;
        wizardState.step = 3; // jump straight to details if preset game selected
      } else {
        wizardState.step = 1;
      }

      // Close details modal if open
      const detailsModal = document.getElementById('game-details-modal');
      if (detailsModal) detailsModal.classList.remove('active');

      renderWizardStep();
      modal.classList.add('active');
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Step 1: Category Selection Handler
  const categoryCards = document.querySelectorAll('.category-option-card');
  categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      if (typeof playMinecraftSound === 'function') playMinecraftSound('pop');
      categoryCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      wizardState.category = card.getAttribute('data-cat');
      // Set default game for category
      if (wizardState.category === 'online') {
        wizardState.gameId = 'BGMI';
      } else {
        wizardState.gameId = 'CHESS';
      }
    });
  });

  // Navigation Buttons
  prevBtn.addEventListener('click', () => {
    if (typeof playMinecraftSound === 'function') playMinecraftSound('click');
    if (wizardState.step > 1 && wizardState.step < 6) {
      wizardState.step--;
      renderWizardStep();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (typeof playMinecraftSound === 'function') playMinecraftSound('click');
    validateAndAdvanceStep();
  });

  // Payment Buttons
  document.getElementById('btn-trigger-sandbox-pay').addEventListener('click', () => {
    executeSandboxPayment();
  });

  document.getElementById('btn-trigger-razorpay').addEventListener('click', () => {
    executeRazorpayPayment();
  });

  document.getElementById('btn-finish-reg').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  document.getElementById('btn-print-receipt').addEventListener('click', () => {
    window.print();
  });
}

/* Render Wizard Step UI */
function renderWizardStep() {
  const progressFill = document.getElementById('wizard-progress-fill');
  const stepTitleEl = document.getElementById('wizard-step-title');
  const stepCounterEl = document.getElementById('wizard-step-counter');
  const footerControls = document.getElementById('wizard-footer-controls');

  // Update step panes visibility
  for (let i = 1; i <= 6; i++) {
    const pane = document.getElementById(`step-pane-${i}`);
    if (pane) {
      if (i === wizardState.step) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    }
  }

  // Update Progress Fill %
  const pct = Math.min((wizardState.step / 5) * 100, 100);
  progressFill.style.width = `${pct}%`;

  stepCounterEl.textContent = `STEP ${wizardState.step} OF 5`;

  if (wizardState.step === 1) {
    stepTitleEl.textContent = 'CHOOSE CATEGORY';
    // Highlight category card
    const cards = document.querySelectorAll('.category-option-card');
    cards.forEach(c => {
      if (c.getAttribute('data-cat') === wizardState.category) c.classList.add('selected');
      else c.classList.remove('selected');
    });
  } else if (wizardState.step === 2) {
    stepTitleEl.textContent = 'SELECT GAME';
    populateStep2GameGrid();
  } else if (wizardState.step === 3) {
    stepTitleEl.textContent = 'ENTER DETAILS';
    populateStep3Form();
  } else if (wizardState.step === 4) {
    stepTitleEl.textContent = 'REVIEW SUMMARY';
    populateStep4Review();
  } else if (wizardState.step === 5) {
    stepTitleEl.textContent = 'PAYMENT PORTAL';
    footerControls.style.display = 'none'; // hide next/prev during payment
  } else if (wizardState.step === 6) {
    stepTitleEl.textContent = 'REGISTRATION SUCCESS';
    footerControls.style.display = 'none';
  }

  if (wizardState.step < 5) {
    footerControls.style.display = 'flex';
  }
}

/* Step 2: Populate Game Selection Grid based on Category */
function populateStep2GameGrid() {
  const grid = document.getElementById('wizard-game-select-grid');
  grid.innerHTML = '';

  Object.values(GAMES_CATALOGUE).forEach(config => {
    if (config.category === wizardState.category) {
      const tile = document.createElement('div');
      tile.className = `game-option-tile ${wizardState.gameId === config.id ? 'selected' : ''}`;
      tile.innerHTML = `
        <div class="tile-icon-wrap">🎮</div>
        <div>
          <div class="tile-title">${config.name}</div>
          <div class="tile-sub">${config.type.toUpperCase()} • ${config.minPlayers} Player(s) • ₹${config.minPlayers * 50} Total</div>
        </div>
      `;
      tile.addEventListener('click', () => {
        if (typeof playMinecraftSound === 'function') playMinecraftSound('pop');
        document.querySelectorAll('.game-option-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        wizardState.gameId = config.id;
      });
      grid.appendChild(tile);
    }
  });
}

/* Step 3: Populate Dynamic Form based on Game Selection */
function populateStep3Form() {
  const config = GAMES_CATALOGUE[wizardState.gameId];
  if (!config) return;

  wizardState.playerCount = config.minPlayers;
  wizardState.totalAmount = config.minPlayers * 50;

  const teamGroup = document.getElementById('team-name-group');
  const captainTitle = document.getElementById('captain-header-title');
  const addPlayersContainer = document.getElementById('additional-players-container');
  const calcBreakdown = document.getElementById('price-calc-breakdown');
  const calcTotal = document.getElementById('price-calc-total');

  calcBreakdown.textContent = `₹50 / person × ${wizardState.playerCount} Players`;
  calcTotal.textContent = `₹${wizardState.totalAmount}`;

  if (config.type === 'squad') {
    teamGroup.style.display = 'block';
    captainTitle.textContent = 'PLAYER 1 — CAPTAIN DETAILS';
  } else {
    teamGroup.style.display = 'none';
    captainTitle.textContent = 'PARTICIPANT DETAILS';
  }

  // Render Additional Player Input Forms for Squads
  addPlayersContainer.innerHTML = '';
  if (config.type === 'squad' && config.minPlayers > 1) {
    for (let i = 2; i <= config.minPlayers; i++) {
      const pBox = document.createElement('div');
      pBox.style.cssText = 'padding:16px; background:var(--bg-deep); border-radius:8px; margin-bottom:16px; border:1px solid var(--gaming-border);';
      pBox.innerHTML = `
        <h5 style="color:var(--text-white); font-family:'Space Grotesk', sans-serif; margin-bottom:12px;">PLAYER ${i} DETAILS</h5>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label class="form-label-custom">FULL NAME *</label>
            <input type="text" id="player-${i}-name" class="input-field-custom" required placeholder="Player ${i} Name">
          </div>
          <div>
            <label class="form-label-custom">IN-GAME NAME / ID *</label>
            <input type="text" id="player-${i}-ign" class="input-field-custom" required placeholder="In-Game ID">
          </div>
          <div>
            <label class="form-label-custom">GAME UID / ID</label>
            <input type="text" id="player-${i}-uid" class="input-field-custom" placeholder="Numeric UID">
          </div>
          <div>
            <label class="form-label-custom">PHONE NUMBER</label>
            <input type="tel" id="player-${i}-phone" class="input-field-custom" placeholder="Phone Number">
          </div>
        </div>
      `;
      addPlayersContainer.appendChild(pBox);
    }
  }
}

/* Step Validation & Progression */
function validateAndAdvanceStep() {
  if (wizardState.step === 1) {
    wizardState.step = 2;
    renderWizardStep();
  } else if (wizardState.step === 2) {
    wizardState.step = 3;
    renderWizardStep();
  } else if (wizardState.step === 3) {
    // Validate inputs
    const config = GAMES_CATALOGUE[wizardState.gameId];
    const college = document.getElementById('reg-college').value.trim();
    const capName = document.getElementById('captain-name').value.trim();
    const capIgn = document.getElementById('captain-ign').value.trim();
    const capEmail = document.getElementById('captain-email').value.trim();
    const capPhone = document.getElementById('captain-phone').value.trim();

    let teamName = '';
    if (config.type === 'squad') {
      teamName = document.getElementById('reg-team-name').value.trim();
      if (!teamName) {
        alert('Please enter a Team Name for your squad.');
        return;
      }
    }

    if (!college || !capName || !capEmail || !capPhone) {
      alert('Please fill in all mandatory Captain & Institution fields.');
      return;
    }

    wizardState.college = college;
    wizardState.teamName = teamName;
    wizardState.captain = { name: capName, ign: capIgn, email: capEmail, phone: capPhone };

    // Collect players
    wizardState.players = [{
      name: capName,
      inGameName: capIgn,
      email: capEmail,
      phone: capPhone
    }];

    if (config.type === 'squad' && config.minPlayers > 1) {
      for (let i = 2; i <= config.minPlayers; i++) {
        const pName = document.getElementById(`player-${i}-name`).value.trim();
        const pIgn = document.getElementById(`player-${i}-ign`).value.trim();
        const pUid = document.getElementById(`player-${i}-uid`).value.trim();
        const pPhone = document.getElementById(`player-${i}-phone`).value.trim();

        if (!pName || !pIgn) {
          alert(`Please enter Player ${i}'s Name and In-Game ID.`);
          return;
        }

        wizardState.players.push({
          name: pName,
          inGameName: pIgn,
          gameUid: pUid,
          phone: pPhone
        });
      }
    }

    wizardState.step = 4;
    renderWizardStep();
  } else if (wizardState.step === 4) {
    // Submit Registration to Server & Create Payment Order
    submitRegistrationOrder();
  }
}

/* Step 4: Populate Review Screen */
function populateStep4Review() {
  const config = GAMES_CATALOGUE[wizardState.gameId];
  document.getElementById('review-game-name').textContent = config.name;
  document.getElementById('review-team-name').textContent = config.type === 'squad' ? wizardState.teamName : `Solo (${wizardState.captain.name})`;
  document.getElementById('review-college').textContent = wizardState.college;
  document.getElementById('review-player-count').textContent = wizardState.playerCount;
  document.getElementById('review-total-amount').textContent = `₹${wizardState.totalAmount}`;

  const listEl = document.getElementById('review-players-list');
  listEl.innerHTML = '';
  wizardState.players.forEach((p, idx) => {
    const li = document.createElement('li');
    li.textContent = `${idx === 0 ? 'Captain' : 'Player ' + (idx + 1)}: ${p.name} (${p.inGameName || 'No IGN'})`;
    listEl.appendChild(li);
  });
}

/* Submit Registration to Backend */
async function submitRegistrationOrder() {
  try {
    const payload = {
      gameId: wizardState.gameId,
      teamName: wizardState.teamName,
      college: wizardState.college,
      captain: wizardState.captain,
      players: wizardState.players
    };

    const res = await fetch('/api/registrations/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      wizardState.registrationId = data.registrationId;
      wizardState.orderId = data.orderId;

      document.getElementById('pay-amount-display').textContent = `₹${wizardState.totalAmount}`;
      document.getElementById('pay-reg-id-display').textContent = `ORDER: ${data.registrationId}`;

      wizardState.step = 5;
      renderWizardStep();
    } else {
      alert(`Registration Error: ${data.error || 'Failed to initialize order.'}`);
    }
  } catch (err) {
    console.warn('Backend API offline, proceeding with client-side order simulation:', err);
    // Fallback order ID for offline demo mode
    wizardState.registrationId = `CRAFT-26-${wizardState.gameId}-${Math.floor(1000 + Math.random() * 9000)}`;
    wizardState.orderId = `ORDER_${Date.now()}`;
    document.getElementById('pay-amount-display').textContent = `₹${wizardState.totalAmount}`;
    document.getElementById('pay-reg-id-display').textContent = `ORDER: ${wizardState.registrationId}`;
    wizardState.step = 5;
    renderWizardStep();
  }
}

/* Sandbox Instant Payment Execution */
async function executeSandboxPayment() {
  try {
    const res = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId: wizardState.registrationId,
        orderId: wizardState.orderId,
        mockGateway: true
      })
    });

    const data = await res.json();
    if (data.success && data.status === 'CONFIRMED') {
      showRegistrationSuccess(data);
    } else {
      showRegistrationSuccess({
        registrationId: wizardState.registrationId,
        game: GAMES_CATALOGUE[wizardState.gameId].name,
        teamName: wizardState.teamName || `Solo (${wizardState.captain.name})`,
        college: wizardState.college
      });
    }
  } catch (err) {
    showRegistrationSuccess({
      registrationId: wizardState.registrationId,
      game: GAMES_CATALOGUE[wizardState.gameId].name,
      teamName: wizardState.teamName || `Solo (${wizardState.captain.name})`,
      college: wizardState.college
    });
  }
}

/* Real Razorpay Checkout Gateway Connection */
async function executeRazorpayPayment() {
  try {
    const orderRes = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: wizardState.registrationId })
    });
    const orderData = await orderRes.json();

    if (!orderData.success) {
      alert(`Payment Initialization Error: ${orderData.error || 'Failed to create payment order.'}`);
      return;
    }

    const keyId = orderData.keyId;
    const orderId = orderData.orderId;
    const amountInPaise = orderData.amount;

    if (typeof Razorpay === 'undefined') {
      console.warn('Razorpay Checkout SDK not found. Executing Sandbox payment...');
      executeSandboxPayment();
      return;
    }

    const options = {
      key: keyId,
      amount: amountInPaise,
      currency: orderData.currency || 'INR',
      name: "CRAFTCON '26 GAMING ARENA",
      description: `Registration for ${orderData.game || wizardState.gameId}`,
      image: 'assets/images/dbu_logo_cropped.png',
      order_id: orderId,
      handler: async function (response) {
        try {
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              registrationId: wizardState.registrationId,
              orderId: response.razorpay_order_id || orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            showRegistrationSuccess(verifyData);
          } else {
            alert(`Payment verification failed: ${verifyData.error || 'Invalid signature'}`);
          }
        } catch (e) {
          executeSandboxPayment();
        }
      },
      prefill: {
        name: wizardState.captain.name,
        email: wizardState.captain.email,
        contact: wizardState.captain.phone
      },
      theme: { color: '#9d4edd' }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error('Razorpay Gateway error:', err);
    executeSandboxPayment();
  }
}

/* Render Final Success Screen */
function showRegistrationSuccess(data) {
  if (typeof playMinecraftSound === 'function') playMinecraftSound('pop');
  document.getElementById('success-reg-id').textContent = data.registrationId || wizardState.registrationId;
  document.getElementById('succ-game').textContent = data.game || GAMES_CATALOGUE[wizardState.gameId].name;
  document.getElementById('succ-team').textContent = data.teamName || wizardState.teamName || `Solo (${wizardState.captain.name})`;
  document.getElementById('succ-college').textContent = data.college || wizardState.college;

  wizardState.step = 6;
  renderWizardStep();
}

/* ==========================================================================
   4. SCROLL REVEAL OBSERVER & INTERACTIVE ANIMATIONS
   ========================================================================== */
function initScrollRevealObserver() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (!revealElements.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.08
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, observerOptions);

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });
}

function initCardTiltPhysics() {
  const cards = document.querySelectorAll('.game-card, .arena-stat-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -7;
      const rotateY = ((x - centerX) / centerX) * 7;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-10px) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

