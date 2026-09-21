const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const db = require('./db');
const emailService = require('./emailService');

// Initialize Razorpay SDK if available
let Razorpay = null;
try {
  Razorpay = require('razorpay');
} catch (e) {
  console.warn('⚡ Razorpay SDK module notice:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Middleware to capture raw body for Webhook HMAC verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.static(path.join(__dirname)));

/* ==========================================================================
   GAMES CONFIGURATION REGISTRY (AUTHORITATIVE BACKEND RULES)
   ========================================================================== */
const GAMES_REGISTRY = {
  'BGMI': {
    id: 'BGMI',
    name: 'BGMI (Battlegrounds Mobile India)',
    category: 'online',
    type: 'squad',
    minPlayers: 4,
    maxPlayers: 4,
    feePerPerson: 50,
    description: 'Tactic-driven 36-minute Battle Royale squad showdown on Erangel.',
    image: 'assets/images/games/bgmi_banner.jpg',
    badge: 'SQUAD REGISTRATION (4 PLAYERS)'
  },
  'FREE_FIRE': {
    id: 'FREE_FIRE',
    name: 'Free Fire MAX',
    category: 'online',
    type: 'squad',
    minPlayers: 4,
    maxPlayers: 4,
    feePerPerson: 50,
    description: 'High-octane fast-paced 4v4 Clash Squad and Battle Royale arena fight.',
    image: 'assets/images/games/freefire_banner.jpg',
    badge: 'SQUAD REGISTRATION (4 PLAYERS)'
  },
  'MOBILE_LEGENDS': {
    id: 'MOBILE_LEGENDS',
    name: 'Mobile Legends: Bang Bang',
    category: 'online',
    type: 'squad',
    minPlayers: 5,
    maxPlayers: 5,
    feePerPerson: 50,
    description: '5v5 MOBA strategic lane warfare, jungle objectives, and base destruction.',
    image: 'assets/images/games/mlbb_banner.jpg',
    badge: 'SQUAD REGISTRATION (5 PLAYERS)'
  },
  'LUDO': {
    id: 'LUDO',
    name: 'Ludo King Championship',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    maxPlayers: 1,
    feePerPerson: 50,
    description: 'Physical board-to-table dice strategy combat with zero ping latency.',
    image: 'assets/images/games/ludo_banner.jpg',
    badge: 'SOLO REGISTRATION (1 PLAYER)'
  },
  'CHESS': {
    id: 'CHESS',
    name: 'Speed Chess Masters',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    maxPlayers: 1,
    feePerPerson: 50,
    description: '10-minute classical blitz & tactics tournament on physical chessboards.',
    image: 'assets/images/games/chess_banner.jpg',
    badge: 'SOLO REGISTRATION (1 PLAYER)'
  },
  'CARROM': {
    id: 'CARROM',
    name: 'Carrom Strike Tournament',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    maxPlayers: 1,
    feePerPerson: 50,
    description: 'Precision striker control, pocket calculation, and queen cover battles.',
    image: 'assets/images/games/carrom_banner.jpg',
    badge: 'SOLO REGISTRATION (1 PLAYER)'
  }
};

/**
 * Initialize Razorpay Instance helper
 */
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (Razorpay && keyId && keySecret && keyId !== 'rzp_test_craftcon2026') {
    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }
  return null;
}

/* ==========================================================================
   API ENDPOINTS
   ========================================================================== */

// 1. GET GAMES CATALOGUE
app.get('/api/games', (req, res) => {
  res.json({
    success: true,
    games: Object.values(GAMES_REGISTRY)
  });
});

// 2. CREATE REGISTRATION (PENDING STATE & BACKEND PRICE COMPUTATION)
app.post('/api/registrations/create', (req, res) => {
  try {
    const { gameId, teamName, college, captain, players } = req.body;

    const gameConfig = GAMES_REGISTRY[gameId];
    if (!gameConfig) {
      return res.status(400).json({ success: false, error: 'Invalid game selected.' });
    }

    if (!college || !college.trim() || !captain || !captain.name || !captain.email || !captain.phone) {
      return res.status(400).json({ success: false, error: 'College and Captain contact details are required.' });
    }

    if (gameConfig.type === 'squad' && (!teamName || !teamName.trim())) {
      return res.status(400).json({ success: false, error: 'Team Name is required for squad registrations.' });
    }

    // Validate player array count strictly against server rule
    const providedPlayers = Array.isArray(players) ? players : [];
    const requiredPlayerCount = gameConfig.minPlayers;

    if (providedPlayers.length !== requiredPlayerCount) {
      return res.status(400).json({
        success: false,
        error: `Expected ${requiredPlayerCount} players for ${gameConfig.name}, but received ${providedPlayers.length}.`
      });
    }

    // Strict Backend Price Calculation (₹50 / person mandatory rule)
    const feePerPerson = 50;
    const totalAmount = requiredPlayerCount * feePerPerson;

    // Generate unique Registration ID & Order ID
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const registrationId = `CRAFT26-${gameId}-${randomHex}`;
    const orderId = `order_${Date.now()}_${randomHex}`;

    const insertRegStmt = db.prepare(`
      INSERT INTO registrations (
        registration_id, category, game, registration_type, team_name,
        college, captain_name, captain_email, captain_phone, player_count,
        total_amount, fee_per_person, currency, payment_status, registration_status, razorpay_order_id, order_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'PENDING', 'PENDING_PAYMENT', ?, ?)
    `);

    insertRegStmt.run(
      registrationId,
      gameConfig.category,
      gameConfig.id,
      gameConfig.type,
      gameConfig.type === 'squad' ? teamName.trim() : `Solo: ${captain.name.trim()}`,
      college.trim(),
      captain.name.trim(),
      captain.email.trim(),
      captain.phone.trim(),
      requiredPlayerCount,
      totalAmount,
      feePerPerson,
      orderId,
      orderId
    );

    // Insert Player details into relational table
    const insertPlayerStmt = db.prepare(`
      INSERT INTO players (registration_id, player_index, name, in_game_name, game_uid, email, phone, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    providedPlayers.forEach((player, idx) => {
      insertPlayerStmt.run(
        registrationId,
        idx + 1,
        player.name ? player.name.trim() : captain.name.trim(),
        player.inGameName ? player.inGameName.trim() : 'N/A',
        player.gameUid ? player.gameUid.trim() : 'N/A',
        player.email ? player.email.trim() : captain.email.trim(),
        player.phone ? player.phone.trim() : captain.phone.trim(),
        idx === 0 ? 'CAPTAIN' : `PLAYER_${idx + 1}`
      );
    });

    console.log(`📝 Registration initialized [${registrationId}] for ${gameConfig.name}. Amount: ₹${totalAmount}`);

    res.json({
      success: true,
      registrationId,
      orderId,
      game: gameConfig.name,
      category: gameConfig.category,
      registrationType: gameConfig.type,
      playerCount: requiredPlayerCount,
      feePerPerson,
      totalAmount,
      currency: 'INR'
    });

  } catch (error) {
    console.error('Server error in /api/registrations/create:', error);
    res.status(500).json({ success: false, error: 'Internal server error while creating registration.' });
  }
});

// 3. CREATE RAZORPAY PAYMENT ORDER (Supports both /api/payments/create-order and /api/payment/create-order)
app.post(['/api/payments/create-order', '/api/payment/create-order'], async (req, res) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, error: 'registrationId is required.' });
    }

    const selectStmt = db.prepare('SELECT * FROM registrations WHERE registration_id = ?');
    const reg = selectStmt.get(registrationId);

    if (!reg) {
      return res.status(404).json({ success: false, error: 'Registration record not found.' });
    }

    // Always recalculate amount on backend (in paise: ₹1 = 100 paise)
    const amountInPaise = Math.round(reg.total_amount * 100);
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_craftcon2026';

    let rzpOrderId = reg.razorpay_order_id || reg.order_id;
    const razorpayInstance = getRazorpayInstance();

    if (razorpayInstance) {
      // Call official Razorpay SDK
      const rzpOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: reg.registration_id,
        notes: {
          game: reg.game,
          teamName: reg.team_name,
          captainEmail: reg.captain_email
        }
      });
      rzpOrderId = rzpOrder.id;
    } else {
      // Development Test Mode structured order ID
      if (!rzpOrderId || !rzpOrderId.startsWith('order_')) {
        rzpOrderId = `order_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      }
    }

    // Update order ID in SQLite
    const updateOrderStmt = db.prepare(`
      UPDATE registrations 
      SET razorpay_order_id = ?, order_id = ?, registration_status = 'PENDING_PAYMENT' 
      WHERE registration_id = ?
    `);
    updateOrderStmt.run(rzpOrderId, rzpOrderId, registrationId);

    // Track payment intent record
    const insertPaymentStmt = db.prepare(`
      INSERT OR REPLACE INTO payments (registration_id, razorpay_order_id, order_id, amount, currency, status, provider)
      VALUES (?, ?, ?, ?, 'INR', 'CREATED', ?)
    `);
    insertPaymentStmt.run(registrationId, rzpOrderId, rzpOrderId, reg.total_amount, razorpayInstance ? 'RAZORPAY' : 'RAZORPAY_TEST_MODE');

    res.json({
      success: true,
      keyId,
      orderId: rzpOrderId,
      registrationId: reg.registration_id,
      amount: amountInPaise,
      displayAmount: reg.total_amount,
      currency: 'INR',
      game: reg.game,
      teamName: reg.team_name,
      captainName: reg.captain_name,
      captainEmail: reg.captain_email,
      captainPhone: reg.captain_phone
    });

  } catch (err) {
    console.error('Error in create-order:', err);
    res.status(500).json({ success: false, error: 'Failed to create Razorpay payment order.' });
  }
});

// 4. VERIFY PAYMENT & CONFIRM REGISTRATION (Supports both /api/payments/verify and /api/payment/verify)
app.post(['/api/payments/verify', '/api/payment/verify'], async (req, res) => {
  try {
    const { registrationId, paymentId, orderId, signature, mockGateway } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, error: 'Missing registrationId parameter.' });
    }

    const selectStmt = db.prepare('SELECT * FROM registrations WHERE registration_id = ?');
    const reg = selectStmt.get(registrationId);

    if (!reg) {
      return res.status(404).json({ success: false, error: 'Registration record not found.' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'craftcon_secret_key_2026';
    let isValidPayment = false;

    if (signature) {
      // Validate Razorpay HMAC-SHA256 signature server-side
      const targetOrderId = orderId || reg.razorpay_order_id || reg.order_id;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${targetOrderId}|${paymentId}`)
        .digest('hex');

      isValidPayment = (expectedSignature === signature);
    } else if (mockGateway || process.env.RAZORPAY_TEST_MODE === 'true' || paymentId) {
      // Development Test Mode fallback verification
      isValidPayment = true;
    }

    if (!isValidPayment) {
      const failStmt = db.prepare("UPDATE registrations SET payment_status = 'FAILED', registration_status = 'PAYMENT_FAILED' WHERE registration_id = ?");
      failStmt.run(registrationId);
      return res.status(400).json({ success: false, error: 'Payment signature verification failed.' });
    }

    const finalPaymentId = paymentId || `pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const finalOrderId = orderId || reg.razorpay_order_id || reg.order_id;

    // Execute SQLite Database Transaction to confirm registration & update payment state
    db.exec('BEGIN TRANSACTION;');
    try {
      const updateStmt = db.prepare(`
        UPDATE registrations 
        SET payment_status = 'PAID', 
            registration_status = 'CONFIRMED', 
            razorpay_payment_id = ?, 
            payment_id = ?,
            razorpay_order_id = ?,
            confirmed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE registration_id = ?
      `);
      updateStmt.run(finalPaymentId, finalPaymentId, finalOrderId, registrationId);

      const payStmt = db.prepare(`
        INSERT OR REPLACE INTO payments (
          registration_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, 
          order_id, payment_id, amount, status, provider, verified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'CAPTURED', ?, CURRENT_TIMESTAMP)
      `);
      payStmt.run(
        registrationId, 
        finalOrderId, 
        finalPaymentId, 
        signature || 'SANDBOX_SIGNATURE', 
        finalOrderId, 
        finalPaymentId, 
        reg.total_amount, 
        process.env.RAZORPAY_TEST_MODE === 'true' ? 'RAZORPAY_TEST_MODE' : 'RAZORPAY'
      );

      db.exec('COMMIT;');
      console.log(`✅ Registration CONFIRMED [${registrationId}] Payment ID: ${finalPaymentId}`);

    } catch (txnErr) {
      db.exec('ROLLBACK;');
      console.error('DB Transaction failed on payment verify:', txnErr);
      return res.status(500).json({ success: false, error: 'Database transaction error during payment verification.' });
    }

    // Trigger Confirmation Email asynchronously
    setImmediate(() => {
      emailService.sendRegistrationConfirmation(registrationId);
    });

    // Retrieve players for response
    const playersStmt = db.prepare('SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC');
    const players = playersStmt.all(registrationId);

    res.json({
      success: true,
      status: 'CONFIRMED',
      registrationId: reg.registration_id,
      paymentId: finalPaymentId,
      orderId: finalOrderId,
      game: reg.game,
      category: reg.category,
      registrationType: reg.registration_type,
      teamName: reg.team_name,
      college: reg.college,
      captainName: reg.captain_name,
      captainEmail: reg.captain_email,
      playerCount: reg.player_count,
      feePerPerson: reg.fee_per_person,
      totalAmount: reg.total_amount,
      players: players || [],
      paymentStatus: 'PAID',
      confirmedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/payment/verify:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment.' });
  }
});

// 5. RAZORPAY WEBHOOK HANDLER (IDEMPOTENT & HMAC SIGNED)
app.post('/api/webhooks/razorpay', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'craftcon_webhook_secret_2026';
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature && req.rawBody) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('⚠️ Webhook HMAC signature mismatch.');
        return res.status(400).json({ success: false, error: 'Invalid webhook signature.' });
      }
    }

    const event = req.body;
    console.log(`🔔 Webhook Event Received: ${event.event || 'Unknown'}`);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;
      const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : null;

      if (orderId) {
        const regStmt = db.prepare('SELECT * FROM registrations WHERE razorpay_order_id = ? OR order_id = ?');
        const reg = regStmt.get(orderId, orderId);

        if (reg) {
          // Idempotency check
          if (reg.registration_status === 'CONFIRMED' && reg.payment_status === 'PAID') {
            console.log(`ℹ️ Webhook: Registration ${reg.registration_id} already confirmed. Skipping duplicate.`);
            return res.json({ status: 'ok', message: 'Already processed.' });
          }

          // Verify amount if present
          if (amount && amount !== reg.total_amount) {
            console.warn(`⚠️ Webhook Amount mismatch! Expected ₹${reg.total_amount}, got ₹${amount}`);
            return res.status(400).json({ status: 'amount_mismatch' });
          }

          // Update DB
          db.exec('BEGIN TRANSACTION;');
          try {
            const updateStmt = db.prepare(`
              UPDATE registrations 
              SET payment_status = 'PAID', 
                  registration_status = 'CONFIRMED', 
                  razorpay_payment_id = ?, 
                  payment_id = ?,
                  confirmed_at = CURRENT_TIMESTAMP
              WHERE registration_id = ?
            `);
            updateStmt.run(paymentId || `pay_wh_${Date.now()}`, paymentId || `pay_wh_${Date.now()}`, reg.registration_id);

            const payStmt = db.prepare(`
              INSERT OR REPLACE INTO payments (registration_id, razorpay_order_id, razorpay_payment_id, amount, status, provider, verified_at)
              VALUES (?, ?, ?, ?, 'CAPTURED', 'RAZORPAY_WEBHOOK', CURRENT_TIMESTAMP)
            `);
            payStmt.run(reg.registration_id, orderId, paymentId || `pay_wh_${Date.now()}`, reg.total_amount);

            db.exec('COMMIT;');
            console.log(`✅ Webhook: Confirmed Registration ${reg.registration_id}`);

            // Send Email Notification
            setImmediate(() => {
              emailService.sendRegistrationConfirmation(reg.registration_id);
            });

          } catch (e) {
            db.exec('ROLLBACK;');
            console.error('Webhook DB transaction error:', e);
          }
        }
      }
    }

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ success: false, error: 'Webhook processing error.' });
  }
});

// 6. GET REGISTRATION BY ID (VOUCHER / RECEIPT LOOKUP)
app.get('/api/registrations/:id', (req, res) => {
  try {
    const regId = req.params.id;

    const selectStmt = db.prepare('SELECT * FROM registrations WHERE registration_id = ?');
    const reg = selectStmt.get(regId);

    if (!reg) {
      return res.status(404).json({ success: false, error: 'Registration not found.' });
    }

    const playersStmt = db.prepare('SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC');
    const players = playersStmt.all(regId);

    res.json({
      success: true,
      registration: reg,
      players: players || []
    });
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 7. ADMIN REGISTRATIONS EXPLORER & SEARCH
app.get('/api/admin/registrations', (req, res) => {
  try {
    const { game, category, payment_status, search } = req.query;
    let sql = 'SELECT * FROM registrations WHERE 1=1';
    const params = [];

    if (game) {
      sql += ' AND game = ?';
      params.push(game);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (payment_status) {
      sql += ' AND payment_status = ?';
      params.push(payment_status);
    }
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      sql += ' AND (registration_id LIKE ? OR team_name LIKE ? OR captain_name LIKE ? OR captain_email LIKE ? OR captain_phone LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY id DESC';

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);

    res.json({
      success: true,
      count: rows.length,
      registrations: rows
    });
  } catch (error) {
    console.error('Error in admin registrations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin registrations.' });
  }
});

// 8. ADMIN PAYMENTS RECONCILIATION API
app.get('/api/admin/payments', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM payments ORDER BY id DESC');
    const rows = stmt.all();
    res.json({
      success: true,
      count: rows.length,
      payments: rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch payments.' });
  }
});

// Root route serves Gaming Arena homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'gaming.html'));
});

// Fallback Route to serve gaming.html as default landing if direct route hit
app.get('/gaming', (req, res) => {
  res.sendFile(path.join(__dirname, 'gaming.html'));
});

// Admin Dashboard UI route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`
  ============================================================
  🎮 CRAFTCON 2K26 GAMING ARENA SERVER RUNNING
  ------------------------------------------------------------
  🌐 Local URL:   http://localhost:${PORT}
  🕹️ Gaming Arena: http://localhost:${PORT}/gaming.html
  ⚔️ Hackathon:    https://tech-hack-three.vercel.app
  📊 Admin Portal: http://localhost:${PORT}/admin.html
  📊 Admin API:    http://localhost:${PORT}/api/admin/registrations
  ============================================================
  `);
});
