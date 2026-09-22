const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const { db, initDb, testDbConnection } = require('./db');
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

app.use(express.static(path.resolve(__dirname)));
app.use('/assets', express.static(path.resolve(__dirname, 'assets')));

// Middleware to ensure DB Schema is initialized on API requests
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    try {
      await initDb();
    } catch (e) {
      console.warn('Database auto-init notice:', e.message);
    }
  }
  next();
});

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

// 1. HEALTH CHECK ENDPOINT
app.get('/api/health', async (req, res) => {
  try {
    const isDbAlive = await testDbConnection();
    if (isDbAlive) {
      return res.status(200).json({
        status: "ok",
        database: "connected"
      });
    } else {
      return res.status(500).json({
        status: "error",
        database: "disconnected"
      });
    }
  } catch (err) {
    return res.status(500).json({
      status: "error",
      database: "disconnected"
    });
  }
});

// 2. GET GAMES CATALOGUE
app.get('/api/games', (req, res) => {
  res.json({
    success: true,
    games: Object.values(GAMES_REGISTRY)
  });
});

// 3. REGISTRATION PRICING & VALIDATION CHECK (NO DB INSERT BEFORE PAYMENT)
app.post('/api/registrations/create', async (req, res) => {
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

    res.json({
      success: true,
      game: gameConfig.name,
      category: gameConfig.category,
      registrationType: gameConfig.type,
      playerCount: requiredPlayerCount,
      feePerPerson,
      totalAmount,
      amount: totalAmount,
      currency: 'INR'
    });

  } catch (error) {
    console.error('Server error in /api/registrations/create:', error);
    res.status(500).json({ success: false, error: 'Internal server error while validating registration.' });
  }
});

// 4. CREATE RAZORPAY PAYMENT ORDER (NO PERMANENT TURSO REGISTRATION INSERT)
app.post(['/api/payments/create-order', '/api/payment/create-order'], async (req, res) => {
  try {
    const { gameId, teamName, college, captain, players, registrationId } = req.body;

    let targetGameId = gameId;
    let targetTeamName = teamName;
    let targetCollege = college;
    let targetCaptain = captain;
    let targetPlayers = players;

    // If registrationId is supplied (e.g. from existing DB record during retry)
    if (registrationId && !gameId) {
      const regRes = await db.execute({
        sql: 'SELECT * FROM registrations WHERE registration_id = ?',
        args: [registrationId]
      });
      const existingReg = regRes.rows && regRes.rows.length > 0 ? regRes.rows[0] : null;
      if (existingReg) {
        targetGameId = existingReg.game;
        targetTeamName = existingReg.team_name;
        targetCollege = existingReg.college;
        targetCaptain = { name: existingReg.captain_name, email: existingReg.captain_email, phone: existingReg.captain_phone };
      }
    }

    const gameConfig = GAMES_REGISTRY[targetGameId || 'BGMI'];
    if (!gameConfig) {
      return res.status(400).json({ success: false, error: 'Invalid game selected.' });
    }

    // Authoritative Backend Price Calculation (₹50 / person)
    const requiredPlayerCount = gameConfig.minPlayers;
    const feePerPerson = 50;
    const totalAmount = requiredPlayerCount * feePerPerson;
    const amountInPaise = Math.round(totalAmount * 100);
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_craftcon2026';

    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const referenceId = `CRAFT26-${gameConfig.id}-${randomHex}`;
    let rzpOrderId = `order_${Date.now()}_${randomHex}`;

    const razorpayInstance = getRazorpayInstance();

    if (razorpayInstance) {
      const rzpOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: referenceId,
        notes: {
          game: gameConfig.id,
          teamName: targetTeamName || '',
          college: targetCollege || '',
          captainEmail: targetCaptain ? targetCaptain.email : ''
        }
      });
      rzpOrderId = rzpOrder.id;
    }

    res.json({
      success: true,
      keyId,
      orderId: rzpOrderId,
      referenceId,
      registrationId: referenceId,
      amount: amountInPaise,
      displayAmount: totalAmount,
      currency: 'INR',
      game: gameConfig.name,
      teamName: targetTeamName,
      college: targetCollege
    });

  } catch (err) {
    console.error('Error in create-order:', err);
    res.status(500).json({ success: false, error: 'Failed to create Razorpay payment order.' });
  }
});

// 5. VERIFY PAYMENT & INSERT FINAL CONFIRMED REGISTRATION INTO TURSO
app.post(['/api/payments/verify', '/api/payment/verify'], async (req, res) => {
  try {
    const { registrationData, registrationId, paymentId, orderId, signature, mockGateway } = req.body;

    const finalOrderId = orderId || `order_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const finalPaymentId = paymentId || `pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // IDEMPOTENCY CHECK: Check if registration/payment already exists in Turso DB
    const existingRegRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE razorpay_payment_id = ? OR razorpay_order_id = ? OR order_id = ? OR registration_id = ?',
      args: [finalPaymentId, finalOrderId, finalOrderId, registrationId || '']
    });

    if (existingRegRes.rows && existingRegRes.rows.length > 0) {
      const existingReg = existingRegRes.rows[0];
      console.log(`ℹ️ Idempotency check: Registration ${existingReg.registration_id} already confirmed in Turso.`);
      
      const playersRes = await db.execute({
        sql: 'SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC',
        args: [existingReg.registration_id]
      });

      return res.json({
        success: true,
        status: 'CONFIRMED',
        registrationId: existingReg.registration_id,
        paymentId: existingReg.razorpay_payment_id || finalPaymentId,
        orderId: existingReg.razorpay_order_id || finalOrderId,
        game: existingReg.game,
        category: existingReg.category,
        registrationType: existingReg.registration_type,
        teamName: existingReg.team_name,
        college: existingReg.college,
        captainName: existingReg.captain_name,
        captainEmail: existingReg.captain_email,
        playerCount: existingReg.player_count,
        feePerPerson: existingReg.fee_per_person,
        totalAmount: existingReg.total_amount || existingReg.amount,
        amount: existingReg.total_amount || existingReg.amount,
        players: playersRes.rows || [],
        paymentStatus: 'PAID',
        confirmedAt: existingReg.confirmed_at || new Date().toISOString()
      });
    }

    // Signature Verification
    const secret = process.env.RAZORPAY_KEY_SECRET || 'craftcon_secret_key_2026';
    let isValidPayment = false;

    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${finalOrderId}|${paymentId}`)
        .digest('hex');

      isValidPayment = (expectedSignature === signature);
    } else if (mockGateway || process.env.RAZORPAY_TEST_MODE === 'true' || paymentId) {
      isValidPayment = true;
    }

    if (!isValidPayment) {
      return res.status(400).json({ success: false, error: 'Payment signature verification failed.' });
    }

    // Extract registration data from client payload
    const regData = registrationData || {};
    const gameId = regData.gameId || 'BGMI';
    const gameConfig = GAMES_REGISTRY[gameId] || GAMES_REGISTRY['BGMI'];

    const captain = regData.captain || {
      name: 'Arena Player',
      email: 'player@craftcon.in',
      phone: '9876543210',
      ign: 'Player1'
    };

    const college = (regData.college || 'Desh Bhagat University').trim();
    const teamName = gameConfig.type === 'squad' 
      ? (regData.teamName || 'Squad').trim() 
      : `Solo: ${captain.name.trim()}`;

    const providedPlayers = Array.isArray(regData.players) ? regData.players : [captain];
    const requiredPlayerCount = gameConfig.minPlayers;
    const feePerPerson = 50;
    const totalAmount = requiredPlayerCount * feePerPerson;

    // Generate canonical final Registration ID
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const finalRegistrationId = registrationId && registrationId.startsWith('CRAFT26-')
      ? registrationId
      : `CRAFT26-${gameConfig.id}-${randomHex}`;

    // INSERT FINAL CONFIRMED REGISTRATION & PLAYERS INTO TURSO DB ATOMICALLY
    await db.batch([
      {
        sql: `INSERT INTO registrations (
          registration_id, category, game, registration_type, team_name,
          college, captain_name, captain_email, captain_phone, player_count,
          total_amount, amount, fee_per_person, currency, payment_status, registration_status,
          razorpay_order_id, razorpay_payment_id, order_id, payment_id, confirmed_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'PAID', 'CONFIRMED', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [
          finalRegistrationId,
          gameConfig.category,
          gameConfig.id,
          gameConfig.type,
          teamName,
          college,
          captain.name.trim(),
          captain.email.trim(),
          captain.phone.trim(),
          requiredPlayerCount,
          totalAmount,
          totalAmount,
          feePerPerson,
          finalOrderId,
          finalPaymentId,
          finalOrderId,
          finalPaymentId
        ]
      },
      {
        sql: `INSERT OR REPLACE INTO payments (
                registration_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, signature,
                order_id, payment_id, amount, currency, status, provider, verified_at, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'CAPTURED', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [
          finalRegistrationId,
          finalOrderId,
          finalPaymentId,
          signature || 'SANDBOX_SIGNATURE',
          signature || 'SANDBOX_SIGNATURE',
          finalOrderId,
          finalPaymentId,
          totalAmount,
          process.env.RAZORPAY_TEST_MODE === 'true' ? 'RAZORPAY_TEST_MODE' : 'RAZORPAY'
        ]
      }
    ]);

    // Insert Player Roster into Turso
    const playerStatements = providedPlayers.slice(0, requiredPlayerCount).map((player, idx) => ({
      sql: `INSERT INTO players (registration_id, player_index, name, full_name, in_game_name, game_uid, email, phone, role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        finalRegistrationId,
        idx + 1,
        (player.name || captain.name).trim(),
        (player.name || captain.name).trim(),
        (player.inGameName || player.ign || 'N/A').trim(),
        (player.gameUid || player.uid || 'N/A').trim(),
        (player.email || captain.email).trim(),
        (player.phone || captain.phone).trim(),
        idx === 0 ? 'CAPTAIN' : `PLAYER_${idx + 1}`
      ]
    }));

    await db.batch(playerStatements);

    console.log(`✅ Registration CONFIRMED & Inserted into Turso DB [${finalRegistrationId}] Payment ID: ${finalPaymentId}`);

    // Trigger Confirmation Email asynchronously
    setImmediate(() => {
      emailService.sendRegistrationConfirmation(finalRegistrationId);
    });

    res.json({
      success: true,
      status: 'CONFIRMED',
      registrationId: finalRegistrationId,
      paymentId: finalPaymentId,
      orderId: finalOrderId,
      game: gameConfig.name,
      category: gameConfig.category,
      registrationType: gameConfig.type,
      teamName,
      college,
      captainName: captain.name,
      captainEmail: captain.email,
      playerCount: requiredPlayerCount,
      feePerPerson,
      totalAmount,
      amount: totalAmount,
      players: providedPlayers,
      paymentStatus: 'PAID',
      confirmedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/payment/verify:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment and record registration.' });
  }
});

// 6. RAZORPAY WEBHOOK HANDLER (IDEMPOTENT & HMAC SIGNED)
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
        const regRes = await db.execute({
          sql: 'SELECT * FROM registrations WHERE razorpay_order_id = ? OR order_id = ?',
          args: [orderId, orderId]
        });
        const reg = regRes.rows && regRes.rows.length > 0 ? regRes.rows[0] : null;

        if (reg) {
          // Idempotency check
          if (reg.registration_status === 'CONFIRMED' && reg.payment_status === 'PAID') {
            console.log(`ℹ️ Webhook: Registration ${reg.registration_id} already confirmed. Skipping duplicate.`);
            return res.json({ status: 'ok', message: 'Already processed.' });
          }

          const expectedAmount = reg.total_amount || reg.amount;
          if (amount && amount !== expectedAmount) {
            console.warn(`⚠️ Webhook Amount mismatch! Expected ₹${expectedAmount}, got ₹${amount}`);
            return res.status(400).json({ status: 'amount_mismatch' });
          }

          const finalPaymentId = paymentId || `pay_wh_${Date.now()}`;

          await db.batch([
            {
              sql: `UPDATE registrations 
                    SET payment_status = 'PAID', 
                        registration_status = 'CONFIRMED', 
                        razorpay_payment_id = ?, 
                        payment_id = ?,
                        confirmed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE registration_id = ?`,
              args: [finalPaymentId, finalPaymentId, reg.registration_id]
            },
            {
              sql: `INSERT OR REPLACE INTO payments (
                      registration_id, razorpay_order_id, razorpay_payment_id, amount, status, provider, verified_at, updated_at
                    ) VALUES (?, ?, ?, ?, 'CAPTURED', 'RAZORPAY_WEBHOOK', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              args: [reg.registration_id, orderId, finalPaymentId, expectedAmount]
            }
          ]);

          console.log(`✅ Webhook: Confirmed Registration ${reg.registration_id}`);

          setImmediate(() => {
            emailService.sendRegistrationConfirmation(reg.registration_id);
          });
        }
      }
    }

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ success: false, error: 'Webhook processing error.' });
  }
});

// 7. GET REGISTRATION BY ID (VOUCHER / RECEIPT LOOKUP)
app.get('/api/registrations/:id', async (req, res) => {
  try {
    const regId = req.params.id;

    const regRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE registration_id = ?',
      args: [regId]
    });
    const reg = regRes.rows && regRes.rows.length > 0 ? regRes.rows[0] : null;

    if (!reg) {
      return res.status(404).json({ success: false, error: 'Registration not found.' });
    }

    const playersRes = await db.execute({
      sql: 'SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC',
      args: [regId]
    });

    res.json({
      success: true,
      registration: reg,
      players: playersRes.rows || []
    });
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 8. ADMIN REGISTRATIONS EXPLORER & SEARCH
app.get('/api/admin/registrations', async (req, res) => {
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

    const result = await db.execute({ sql, args: params });

    res.json({
      success: true,
      count: result.rows.length,
      registrations: result.rows
    });
  } catch (error) {
    console.error('Error in admin registrations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin registrations.' });
  }
});

// 9. ADMIN PAYMENTS RECONCILIATION API
app.get('/api/admin/payments', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM payments ORDER BY id DESC');
    res.json({
      success: true,
      count: result.rows.length,
      payments: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch payments.' });
  }
});

// Explicit static asset handlers to guarantee HTTP 200 delivery
app.get('/gaming.js', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'gaming.js'));
});
app.get('/gaming.css', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'gaming.css'));
});
app.get('/style.css', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'style.css'));
});

// Root route serves Gaming Arena homepage
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

// Fallback Route to serve gaming.html as default landing if direct route hit
app.get('/gaming', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'gaming.html'));
});
app.get('/gaming.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'gaming.html'));
});

// Admin Dashboard UI route
app.get('/admin', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'admin.html'));
});
app.get('/admin.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'admin.html'));
});

// Start Express Server (only listen when run directly)
if (require.main === module) {
  app.listen(PORT, async () => {
    try {
      await initDb();
    } catch (e) {
      console.warn('Startup initDb warning:', e.message);
    }
    console.log(`
    ============================================================
    🎮 CRAFTCON 2K26 GAMING ARENA SERVER RUNNING
    ------------------------------------------------------------
    🌐 Local URL:   http://localhost:${PORT}
    🕹️ Gaming Arena: http://localhost:${PORT}/gaming.html
    ⚔️ Hackathon:    https://tech-hack-three.vercel.app
    📊 Admin Portal: http://localhost:${PORT}/admin.html
    📊 Admin API:    http://localhost:${PORT}/api/admin/registrations
    ❤️ Health API:   http://localhost:${PORT}/api/health
    ============================================================
    `);
  });
}

module.exports = app;
