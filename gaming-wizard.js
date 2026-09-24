/**
 * CRAFTCON '26 — CENTRALIZED GAMING REGISTRATION WIZARD ENGINE
 * Reusable modal wizard controller for index.html and gaming.html
 */

(function () {
  'use strict';

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

  const WHATSAPP_GROUPS = {
    online: 'https://chat.whatsapp.com/CkX2FAdIZP4BnTo61dVQaF',
    offline: 'https://chat.whatsapp.com/IQxUBMVvl7LH7wJ0ObDxJx'
  };

  let wizardState = {
    step: 1,
    category: 'online',
    gameId: 'BGMI',
    teamName: '',
    college: '',
    captain: { name: '', ign: '', email: '', phone: '' },
    players: [],
    playerCount: 4,
    feePerPerson: 50,
    totalAmount: 200,
    whatsappJoined: false,
    registrationId: null,
    orderId: null,
    paymentId: null
  };

  let systemConfig = {
    paymentProvider: 'upi',
    upiQrUrl: 'assets/images/upi_qr.png',
    upiId: 'paytm.s2sp1kq@pty'
  };

  let currentBase64Screenshot = null;
  let activeWizardStepIndex = 1;

  async function fetchSystemConfig() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data && data.success) {
        systemConfig.paymentProvider = (data.paymentProvider || 'upi').toLowerCase().trim();
        systemConfig.upiQrUrl = data.upiQrUrl || 'assets/images/upi_qr.png';
        systemConfig.upiId = data.upiId || 'paytm.s2sp1kq@pty';
      }
    } catch (e) {
      console.warn('Config fetch notice:', e.message);
    }
  }

  function initGamingWizard() {
    const modal = document.getElementById('gaming-registration-modal');
    if (!modal) return;

    fetchSystemConfig();

    const closeBtn = document.getElementById('close-reg-modal-btn');
    const openBtns = document.querySelectorAll('.open-gaming-reg-btn');
    const prevBtn = document.getElementById('btn-wizard-prev');
    const nextBtn = document.getElementById('btn-wizard-next');

    // Launch modal with optional preset game
    openBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.playMinecraftSound === 'function') window.playMinecraftSound('click');

        const presetGame = btn.getAttribute('data-preset-game');
        if (presetGame && GAMES_CATALOGUE[presetGame]) {
          wizardState.gameId = presetGame;
          wizardState.category = GAMES_CATALOGUE[presetGame].category;
          wizardState.step = 3; // jump straight to details
        } else {
          wizardState.step = 1;
        }

        wizardState.registrationId = null;
        renderWizardStep();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    function closeGamingModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeGamingModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeGamingModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeGamingModal();
      }
    });

    // Step 1: Category Selection
    const categoryCards = document.querySelectorAll('.category-option-card');
    categoryCards.forEach(card => {
      card.addEventListener('click', () => {
        if (typeof window.playMinecraftSound === 'function') window.playMinecraftSound('pop');
        categoryCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        wizardState.category = card.getAttribute('data-cat');
        wizardState.gameId = wizardState.category === 'online' ? 'BGMI' : 'CHESS';
      });
    });

    // Step 4: WhatsApp Handlers
    const btnJoinWhatsapp = document.getElementById('btn-join-whatsapp');
    const btnConfirmWhatsapp = document.getElementById('btn-confirm-whatsapp');

    if (btnJoinWhatsapp && btnConfirmWhatsapp) {
      btnJoinWhatsapp.addEventListener('click', () => {
        if (typeof window.playMinecraftSound === 'function') window.playMinecraftSound('click');
        btnConfirmWhatsapp.disabled = false;
        btnConfirmWhatsapp.style.opacity = '1';
        btnConfirmWhatsapp.style.cursor = 'pointer';
      });

      btnConfirmWhatsapp.addEventListener('click', () => {
        if (typeof window.playMinecraftSound === 'function') window.playMinecraftSound('pop');
        wizardState.whatsappJoined = true;
        wizardState.step = 5;
        renderWizardStep();
      });
    }

    // Wizard Navigation Buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (typeof window.playMinecraftSound === 'function') window.playMinecraftSound('click');
        if (wizardState.step > 1 && wizardState.step < 6) {
          wizardState.step--;
          renderWizardStep('prev');
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (typeof window.playMinecraftSound === 'function') window.playMinecraftSound('click');
        validateAndAdvanceStep();
      });
    }

    // Step 6: Copy UPI ID
    const copyUpiBtn = document.getElementById('btn-copy-upi');
    if (copyUpiBtn) {
      copyUpiBtn.addEventListener('click', () => {
        const upiText = document.getElementById('upi-id-display')?.textContent || systemConfig.upiId;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(upiText).then(() => {
            const origText = copyUpiBtn.textContent;
            copyUpiBtn.textContent = 'COPIED!';
            setTimeout(() => { copyUpiBtn.textContent = origText; }, 2000);
          });
        }
      });
    }

    // Step 6: Screenshot Upload with Canvas Compression
    const screenshotInput = document.getElementById('reg-screenshot-input');
    const previewWrap = document.getElementById('screenshot-preview-wrap');
    const previewImg = document.getElementById('screenshot-preview-img');

    if (screenshotInput) {
      screenshotInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
          alert('File size exceeds maximum 10MB limit. Please select a smaller screenshot.');
          screenshotInput.value = '';
          currentBase64Screenshot = null;
          if (previewWrap) previewWrap.style.display = 'none';
          return;
        }

        const reader = new FileReader();
        reader.onload = function (evt) {
          const rawDataUrl = evt.target.result;
          const img = new Image();
          img.onload = function () {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1000;

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            currentBase64Screenshot = canvas.toDataURL('image/jpeg', 0.80);
            if (previewImg) previewImg.src = currentBase64Screenshot;
            if (previewWrap) previewWrap.style.display = 'block';
          };
          img.onerror = function () {
            currentBase64Screenshot = rawDataUrl;
            if (previewImg) previewImg.src = currentBase64Screenshot;
            if (previewWrap) previewWrap.style.display = 'block';
          };
          img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
      });
    }

    // Step 6: Submit UPI Proof Form
    const upiProofForm = document.getElementById('upi-proof-form');
    const btnSubmitProof = document.getElementById('btn-submit-upi-proof');

    if (upiProofForm) {
      upiProofForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const utrInput = document.getElementById('reg-utr-input');
        const utrValue = utrInput ? utrInput.value.trim() : '';

        if (!utrValue || utrValue.length < 6) {
          alert('Please enter a valid 12-digit UTR / Transaction ID.');
          return;
        }

        if (!currentBase64Screenshot) {
          alert('Please select and upload a clear screenshot of your payment receipt.');
          return;
        }

        if (!wizardState.registrationId) {
          alert('Registration record not initialized. Please go back and try again.');
          return;
        }

        try {
          if (btnSubmitProof) {
            btnSubmitProof.disabled = true;
            btnSubmitProof.innerHTML = '<span>⏳ SUBMITTING PROOF...</span>';
          }

          const res = await fetch('/api/payments/submit-proof', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              registrationId: wizardState.registrationId,
              utr: utrValue,
              utrTransactionId: utrValue,
              screenshot: currentBase64Screenshot,
              paymentScreenshotUrl: currentBase64Screenshot
            })
          });

          const dataText = await res.text();
          let data;
          try { data = JSON.parse(dataText); } catch (err) {}

          if (res.ok && data && data.success) {
            showRegistrationSuccess({
              registrationId: wizardState.registrationId,
              game: GAMES_CATALOGUE[wizardState.gameId] ? GAMES_CATALOGUE[wizardState.gameId].name : wizardState.gameId,
              teamName: wizardState.teamName,
              college: wizardState.college,
              status: 'PAYMENT_SUBMITTED'
            });
          } else {
            const errorMsg = (data && data.error) ? data.error : `Server returned HTTP ${res.status}`;
            alert(`Submission error: ${errorMsg}`);
            if (btnSubmitProof) {
              btnSubmitProof.disabled = false;
              btnSubmitProof.innerHTML = '<span>📥 SUBMIT PAYMENT PROOF</span>';
            }
          }
        } catch (err) {
          console.error('Submission network error:', err);
          alert('Network connection error while submitting payment proof. Please try again.');
          if (btnSubmitProof) {
            btnSubmitProof.disabled = false;
            btnSubmitProof.innerHTML = '<span>📥 SUBMIT PAYMENT PROOF</span>';
          }
        }
      });
    }

    const btnFinish = document.getElementById('btn-finish-reg');
    if (btnFinish) {
      btnFinish.addEventListener('click', () => {
        closeGamingModal();
      });
    }

    const btnPrint = document.getElementById('btn-print-receipt');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }
  }

  function renderWizardStep(direction = 'next') {
    const progressFill = document.getElementById('wizard-progress-fill');
    const stepTitleEl = document.getElementById('wizard-step-title');
    const stepCounterEl = document.getElementById('wizard-step-counter');
    const footerControls = document.getElementById('wizard-footer-controls');

    const newStep = wizardState.step;
    activeWizardStepIndex = newStep;

    for (let i = 1; i <= 7; i++) {
      const pane = document.getElementById(`step-pane-${i}`);
      if (pane) {
        if (i === newStep) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      }
    }

    const pct = Math.min((wizardState.step / 6) * 100, 100);
    if (progressFill) progressFill.style.width = `${pct}%`;

    if (stepCounterEl) {
      stepCounterEl.textContent = wizardState.step <= 6 ? `STEP ${wizardState.step} OF 6` : 'COMPLETED';
    }

    if (stepTitleEl) {
      if (wizardState.step === 1) stepTitleEl.textContent = 'CHOOSE CATEGORY';
      else if (wizardState.step === 2) stepTitleEl.textContent = 'SELECT GAME';
      else if (wizardState.step === 3) stepTitleEl.textContent = 'ENTER DETAILS';
      else if (wizardState.step === 4) stepTitleEl.textContent = 'JOIN WHATSAPP GROUP';
      else if (wizardState.step === 5) stepTitleEl.textContent = 'REVIEW SUMMARY';
      else if (wizardState.step === 6) stepTitleEl.textContent = 'PAYMENT PORTAL';
      else if (wizardState.step === 7) stepTitleEl.textContent = 'REGISTRATION SUBMITTED';
    }

    if (wizardState.step === 1) {
      const cards = document.querySelectorAll('.category-option-card');
      cards.forEach(c => {
        if (c.getAttribute('data-cat') === wizardState.category) c.classList.add('selected');
        else c.classList.remove('selected');
      });
    } else if (wizardState.step === 2) {
      populateStep2GameGrid();
    } else if (wizardState.step === 3) {
      populateStep3Form();
    } else if (wizardState.step === 4) {
      const btnJoin = document.getElementById('btn-join-whatsapp');
      const groupUrl = WHATSAPP_GROUPS[wizardState.category] || WHATSAPP_GROUPS.online;
      if (btnJoin) btnJoin.href = groupUrl;
      const btnConfirm = document.getElementById('btn-confirm-whatsapp');
      if (btnConfirm && !wizardState.whatsappJoined) {
        btnConfirm.disabled = true;
        btnConfirm.style.opacity = '0.6';
        btnConfirm.style.cursor = 'not-allowed';
      }
    } else if (wizardState.step === 5) {
      populateStep5Review();
    } else if (wizardState.step === 6) {
      if (footerControls) footerControls.style.display = 'none';
      prepareStep6Payment();
    } else if (wizardState.step === 7) {
      if (footerControls) footerControls.style.display = 'none';
    }

    if (wizardState.step <= 5 && footerControls) {
      footerControls.style.display = 'flex';
    }
  }

  function populateStep2GameGrid() {
    const grid = document.getElementById('wizard-game-select-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.values(GAMES_CATALOGUE).forEach(config => {
      if (config.category === wizardState.category) {
        const tile = document.createElement('div');
        tile.className = `game-select-card ${wizardState.gameId === config.id ? 'selected' : ''}`;
        tile.innerHTML = `
          <div class="cat-icon">🎮</div>
          <div class="cat-title">${config.name}</div>
          <div style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 6px;">${config.type.toUpperCase()} • ${config.minPlayers} Player(s) • ₹${config.minPlayers * 50} Total</div>
          <span class="cat-badge">SLOTS AVAILABLE</span>
        `;
        tile.addEventListener('click', () => {
          if (typeof window.playMinecraftSound === 'function') window.playMinecraftSound('pop');
          document.querySelectorAll('.game-select-card').forEach(t => t.classList.remove('selected'));
          tile.classList.add('selected');
          wizardState.gameId = config.id;
        });
        grid.appendChild(tile);
      }
    });
  }

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

    if (calcBreakdown) calcBreakdown.textContent = `₹50 / person × ${wizardState.playerCount} Players`;
    if (calcTotal) calcTotal.textContent = `₹${wizardState.totalAmount}`;

    if (config.type === 'squad') {
      if (teamGroup) teamGroup.style.display = 'block';
      if (captainTitle) captainTitle.textContent = 'PLAYER 1 — CAPTAIN DETAILS';
    } else {
      if (teamGroup) teamGroup.style.display = 'none';
      if (captainTitle) captainTitle.textContent = 'PARTICIPANT DETAILS';
    }

    if (addPlayersContainer) {
      addPlayersContainer.innerHTML = '';
      if (config.type === 'squad' && config.minPlayers > 1) {
        for (let i = 2; i <= config.minPlayers; i++) {
          const pBox = document.createElement('div');
          pBox.style.cssText = 'padding:16px; background:#08080e; border-radius:8px; margin-bottom:16px; border:1px solid rgba(255,255,255,0.1);';
          pBox.innerHTML = `
            <h5 style="color:#ffffff; font-family:'Space Grotesk', sans-serif; margin-bottom:12px;">PLAYER ${i} DETAILS</h5>
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
                <label class="form-label-custom">EMAIL ADDRESS</label>
                <input type="email" id="player-${i}-email" class="input-field-custom" placeholder="player${i}@email.com">
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
  }

  function validateAndAdvanceStep() {
    if (wizardState.step === 1) {
      wizardState.step = 2;
      renderWizardStep();
    } else if (wizardState.step === 2) {
      wizardState.step = 3;
      renderWizardStep();
    } else if (wizardState.step === 3) {
      const config = GAMES_CATALOGUE[wizardState.gameId];
      const college = document.getElementById('reg-college') ? document.getElementById('reg-college').value.trim() : '';
      const capName = document.getElementById('captain-name') ? document.getElementById('captain-name').value.trim() : '';
      const capIgn = document.getElementById('captain-ign') ? document.getElementById('captain-ign').value.trim() : '';
      const capEmail = document.getElementById('captain-email') ? document.getElementById('captain-email').value.trim() : '';
      const capPhone = document.getElementById('captain-phone') ? document.getElementById('captain-phone').value.trim() : '';

      let teamName = '';
      if (config.type === 'squad') {
        const teamInput = document.getElementById('reg-team-name');
        teamName = teamInput ? teamInput.value.trim() : '';
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

      wizardState.players = [{
        name: capName,
        inGameName: capIgn,
        email: capEmail,
        phone: capPhone
      }];

      if (config.type === 'squad' && config.minPlayers > 1) {
        for (let i = 2; i <= config.minPlayers; i++) {
          const pNameEl = document.getElementById(`player-${i}-name`);
          const pIgnEl = document.getElementById(`player-${i}-ign`);
          const pEmailEl = document.getElementById(`player-${i}-email`);
          const pPhoneEl = document.getElementById(`player-${i}-phone`);

          const pName = pNameEl ? pNameEl.value.trim() : '';
          const pIgn = pIgnEl ? pIgnEl.value.trim() : '';
          if (!pName || !pIgn) {
            alert(`Please enter both Full Name and In-Game ID for Player ${i}.`);
            return;
          }
          wizardState.players.push({
            name: pName,
            inGameName: pIgn,
            email: pEmailEl ? pEmailEl.value.trim() : '',
            phone: pPhoneEl ? pPhoneEl.value.trim() : ''
          });
        }
      }

      wizardState.step = 4;
      renderWizardStep();
    } else if (wizardState.step === 4) {
      wizardState.step = 5;
      renderWizardStep();
    } else if (wizardState.step === 5) {
      wizardState.step = 6;
      renderWizardStep();
    }
  }

  function populateStep5Review() {
    const revGame = document.getElementById('review-game-name');
    const revTeam = document.getElementById('review-team-name');
    const revCollege = document.getElementById('review-college');
    const revStatus = document.getElementById('review-whatsapp-status');
    const revPlayersList = document.getElementById('review-players-list');
    const revPlayerCount = document.getElementById('review-player-count');
    const revTotal = document.getElementById('review-total-amount');

    const config = GAMES_CATALOGUE[wizardState.gameId];
    if (revGame) revGame.textContent = config ? config.name : wizardState.gameId;
    if (revTeam) revTeam.textContent = wizardState.teamName || `Solo (${wizardState.captain.name})`;
    if (revCollege) revCollege.textContent = wizardState.college;
    if (revStatus) {
      revStatus.textContent = wizardState.whatsappJoined ? '✓ Joined & Confirmed' : 'Not Joined Yet';
      revStatus.style.color = wizardState.whatsappJoined ? '#2ed573' : '#ffbe0b';
    }
    if (revPlayerCount) revPlayerCount.textContent = wizardState.playerCount;
    if (revTotal) revTotal.textContent = `₹${wizardState.totalAmount}`;

    if (revPlayersList) {
      revPlayersList.innerHTML = '';
      wizardState.players.forEach((p, idx) => {
        const li = document.createElement('li');
        li.textContent = `Player ${idx + 1}: ${p.name} (${p.inGameName || 'No IGN'})`;
        revPlayersList.appendChild(li);
      });
    }
  }

  async function prepareStep6Payment() {
    const payAmountEl = document.getElementById('pay-amount-display');
    const payRegIdEl = document.getElementById('pay-reg-id-display');
    const rzpBtn = document.getElementById('btn-pay-razorpay');
    const rzpLoadingMsg = document.getElementById('rzp-loading-msg');
    const rzpErrorMsg = document.getElementById('rzp-error-msg');

    if (payAmountEl) payAmountEl.textContent = `₹${wizardState.totalAmount}`;

    // Step 1: Create backend registration record if not already done
    if (!wizardState.registrationId) {
      try {
        const createRes = await fetch('/api/registrations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: wizardState.gameId,
            teamName: wizardState.teamName,
            college: wizardState.college,
            captain: wizardState.captain,
            players: wizardState.players
          })
        });
        const createData = await createRes.json();
        if (createData && createData.success) {
          wizardState.registrationId = createData.registrationId;
        } else {
          if (rzpErrorMsg) {
            rzpErrorMsg.style.display = 'block';
            rzpErrorMsg.textContent = (createData && createData.error) || 'Failed to initialize registration. Please try again.';
          }
          return;
        }
      } catch (e) {
        console.error('Error creating registration:', e);
        if (rzpErrorMsg) {
          rzpErrorMsg.style.display = 'block';
          rzpErrorMsg.textContent = 'Network error while initializing registration. Please check your connection.';
        }
        return;
      }
    }

    if (payRegIdEl) payRegIdEl.textContent = `REGISTRATION: ${wizardState.registrationId}`;

    // Step 2: Attach Razorpay Pay Now button handler
    if (rzpBtn) {
      // Remove any previous listener by replacing the button
      const newBtn = rzpBtn.cloneNode(true);
      rzpBtn.parentNode.replaceChild(newBtn, rzpBtn);

      newBtn.addEventListener('click', async () => {
        const btnLabel = document.getElementById('rzp-btn-label');
        const loadingMsg = document.getElementById('rzp-loading-msg');
        const errorMsgEl = document.getElementById('rzp-error-msg');

        try {
          newBtn.disabled = true;
          if (btnLabel) btnLabel.textContent = '⏳ Creating Secure Order...';
          if (loadingMsg) loadingMsg.style.display = 'block';
          if (errorMsgEl) errorMsgEl.style.display = 'none';

          // Create Razorpay order via server
          const orderRes = await fetch('/api/payments/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId: wizardState.gameId,
              teamName: wizardState.teamName,
              college: wizardState.college,
              captain: wizardState.captain,
              players: wizardState.players,
              registrationId: wizardState.registrationId
            })
          });

          const orderData = await orderRes.json();
          if (loadingMsg) loadingMsg.style.display = 'none';

          if (!orderData.success || !orderData.orderId) {
            throw new Error(orderData.error || 'Failed to create payment order from server.');
          }

          const gameConfig = GAMES_CATALOGUE[wizardState.gameId] || {};

          // Step 3: Launch Razorpay Checkout modal
          const rzpOptions = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: 'INR',
            name: "CRAFTCON '26 — Desh Bhagat University",
            description: `Gaming Arena: ${gameConfig.name || wizardState.gameId} — ${wizardState.teamName || wizardState.captain.name}`,
            order_id: orderData.orderId,
            prefill: {
              name: wizardState.captain.name,
              email: wizardState.captain.email,
              contact: wizardState.captain.phone
            },
            notes: {
              registration_id: wizardState.registrationId,
              game: wizardState.gameId,
              team: wizardState.teamName,
              college: wizardState.college
            },
            theme: {
              color: '#f5a623'
            },
            modal: {
              ondismiss: function () {
                newBtn.disabled = false;
                if (btnLabel) btnLabel.textContent = '💳 PAY NOW WITH RAZORPAY';
              }
            },
            handler: async function (response) {
              // Step 4: Server-side verification + final DB confirm
              try {
                if (btnLabel) btnLabel.textContent = '✅ Verifying Payment...';
                newBtn.disabled = true;

                const verifyRes = await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    registrationId: wizardState.registrationId,
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    registrationData: {
                      gameId: wizardState.gameId,
                      teamName: wizardState.teamName,
                      college: wizardState.college,
                      captain: wizardState.captain,
                      players: wizardState.players
                    }
                  })
                });

                const verifyData = await verifyRes.json();

                if (verifyData && verifyData.success) {
                  wizardState.paymentId = response.razorpay_payment_id;
                  showRegistrationSuccess({
                    registrationId: wizardState.registrationId,
                    game: gameConfig.name || wizardState.gameId,
                    teamName: wizardState.teamName,
                    college: wizardState.college,
                    status: 'CONFIRMED',
                    paymentId: response.razorpay_payment_id
                  });
                } else {
                  throw new Error((verifyData && verifyData.error) || 'Payment verification failed.');
                }
              } catch (verErr) {
                console.error('Verification error:', verErr);
                newBtn.disabled = false;
                if (btnLabel) btnLabel.textContent = '💳 PAY NOW WITH RAZORPAY';
                if (errorMsgEl) {
                  errorMsgEl.style.display = 'block';
                  errorMsgEl.textContent = `Payment captured but verification failed: ${verErr.message}. Please contact organizers with your Payment ID: ${response.razorpay_payment_id}`;
                }
              }
            }
          };

          const rzp = new window.Razorpay(rzpOptions);
          rzp.open();

        } catch (err) {
          console.error('Razorpay order creation error:', err);
          newBtn.disabled = false;
          if (btnLabel) btnLabel.textContent = '💳 PAY NOW WITH RAZORPAY';
          if (loadingMsg) loadingMsg.style.display = 'none';
          if (errorMsgEl) {
            errorMsgEl.style.display = 'block';
            errorMsgEl.textContent = `Unable to launch payment: ${err.message}. If this persists, use the UPI fallback below.`;
          }

          // Show UPI fallback on Razorpay failure
          const upiSection = document.getElementById('upi-payment-section');
          if (upiSection) upiSection.style.display = 'block';
          if (document.getElementById('upi-qr-image')) document.getElementById('upi-qr-image').src = systemConfig.upiQrUrl;
          if (document.getElementById('upi-id-display')) document.getElementById('upi-id-display').textContent = systemConfig.upiId;
        }
      });
    }
  }


  function showRegistrationSuccess(info) {
    wizardState.step = 7;
    renderWizardStep();

    const succRegId = document.getElementById('success-reg-id');
    const succGame = document.getElementById('succ-game');
    const succTeam = document.getElementById('succ-team');
    const succCollege = document.getElementById('succ-college');
    const succStatus = document.getElementById('succ-status');
    const successTitle = document.getElementById('success-title');
    const successSubtext = document.getElementById('success-subtext');
    const successIcon = document.getElementById('success-icon');

    const isConfirmed = info.status === 'CONFIRMED';

    if (successIcon) successIcon.textContent = isConfirmed ? '🎉' : '📋';
    if (successTitle) {
      successTitle.textContent = isConfirmed ? 'PAYMENT CONFIRMED!' : 'PAYMENT PROOF SUBMITTED!';
      successTitle.style.color = isConfirmed ? '#2ed573' : '#f5a623';
    }
    if (successSubtext) {
      successSubtext.textContent = isConfirmed
        ? 'Your registration is confirmed & payment verified automatically via Razorpay!'
        : 'Payment proof recorded. Pending organizer verification.';
    }

    if (succRegId) succRegId.textContent = info.registrationId;
    if (succGame) succGame.textContent = info.game;
    if (succTeam) succTeam.textContent = info.teamName || 'Solo';
    if (succCollege) succCollege.textContent = info.college;
    if (succStatus) {
      succStatus.textContent = isConfirmed ? '✅ PAYMENT CONFIRMED' : '⏳ PENDING VERIFICATION';
      succStatus.style.color = isConfirmed ? '#2ed573' : '#f5a623';
    }

    // Show Payment ID if available
    if (info.paymentId) {
      const voucherCard = document.getElementById('printable-voucher-card');
      if (voucherCard && !document.getElementById('succ-payment-id')) {
        const payIdDiv = document.createElement('div');
        payIdDiv.style.cssText = 'margin-top:10px; font-size:0.8rem; color:#9ca3af;';
        payIdDiv.innerHTML = `Razorpay Payment ID: <span id="succ-payment-id" style="color:#2ed573; font-family:monospace;">${info.paymentId}</span>`;
        voucherCard.appendChild(payIdDiv);
      }
    }

    if (typeof window.playMinecraftSound === 'function') {
      window.playMinecraftSound('level_up');
    }
  }


  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGamingWizard);
  } else {
    initGamingWizard();
  }

  // Export globally
  window.openGamingModalForGame = function (gameId) {
    const modal = document.getElementById('gaming-registration-modal');
    if (!modal) return;
    if (gameId && GAMES_CATALOGUE[gameId]) {
      wizardState.gameId = gameId;
      wizardState.category = GAMES_CATALOGUE[gameId].category;
      wizardState.step = 3;
    } else {
      wizardState.step = 1;
    }
    wizardState.registrationId = null;
    renderWizardStep();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
})();
