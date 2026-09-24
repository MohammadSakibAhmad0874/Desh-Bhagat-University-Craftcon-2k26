/**
 * ============================================================
 * CRAFTCON '26  -  DESH BHAGAT UNIVERSITY
 * Google Apps Script Backend  -  Registration Data Engine
 * ============================================================
 *
 * SETUP GUIDE:
 * Step 1: Open Google Sheet (ID: 1aygA4U5Lcre_3thSZ-Snn26pkjlKHNyUw5SijtwoYCA)
 * Step 2: Extensions ? Apps Script
 * Step 3: Paste this entire file (replace existing code)
 * Step 4: Save (Ctrl+S)
 * Step 5: Deploy ? New Deployment ? Web App ? Execute as: Me ? Access: Anyone
 * Step 6: Authorize when prompted
 * Step 7: Copy the Web App URL
 * Step 8: Add to .env: GOOGLE_APPS_SCRIPT_URL=<url>
 */

const CONFIG = {
  SPREADSHEET_ID: '1aygA4U5Lcre_3thSZ-Snn26pkjlKHNyUw5SijtwoYCA',
  HACKATHON_SHEET: 'Hackathon Registrations',
  GAMING_SHEET: 'Gaming Registrations',
  SPONSOR_SHEET: 'Sponsor Enquiries',
  HACK_PREFIX: 'DBU-HACK-2026',
  GAMING_PREFIX: 'DBU-GAME-2026'
};

const HACKATHON_HEADERS = [
  'Registration ID','Timestamp','Category','Hackathon Theme / Track',
  'Team Name','Team Size','Leader Name','Leader Email','Leader Phone',
  'College / University','Member 2','Member 3','Member 4',
  'Concept / Idea Brief','Portfolio / GitHub URL','Payment Status',
  'Razorpay Payment ID','Payment Done','Source'
];

const GAMING_HEADERS = [
  'Registration ID','Timestamp','Category','Game','Registration Type',
  'Team Name','College / University','Captain Name','Captain Email',
  'Captain Phone','Captain IGN','Player 2','Player 3','Player 4','Player 5',
  'Total Players','Total Amount Rs','UTR Transaction ID','Payment Status',
  'Razorpay Payment ID','Payment Done','Source'
];

const SPONSOR_HEADERS = [
  'Timestamp','Company / Organisation','Contact Person Name',
  'Email','Phone','Sponsorship Interest','Message','Source'
];

function doGet(e) {
  return buildJsonResponse({ status: 'ok', service: "CRAFTCON 26 Apps Script API", timestamp: new Date().toISOString() });
}

function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    var type = (payload.type || '').toString().toUpperCase().trim();
    if (type === 'HACKATHON') return handleHackathonRegistration(payload);
    if (type === 'GAMING')    return handleGamingRegistration(payload);
    if (type === 'SPONSOR')   return handleSponsorEnquiry(payload);
    if (type === 'RAZORPAY_UPDATE') return handleRazorpayUpdate(payload);
    if (payload.game || payload.gameId || payload.game_id) return handleGamingRegistration(payload);
    if (payload.sponsorCompany) return handleSponsorEnquiry(payload);
    return handleHackathonRegistration(payload);
  } catch(err) {
    Logger.log('doPost error: ' + err.message);
    return buildJsonResponse({ success: false, message: 'Internal error: ' + err.message });
  }
}

function handleHackathonRegistration(data) {
  var leaderName  = sanitize(data.leader_name  || data.leaderName  || '');
  var leaderEmail = sanitize(data.leader_email || data.leaderEmail || '').toLowerCase();
  var leaderPhone = sanitize(data.leader_phone || data.leaderPhone || '');
  var college     = sanitize(data.college_name || data.college || data.collegeName || '');
  var teamName    = sanitize(data.team_name || data.teamName || '');
  var teamSize    = sanitize(String(data.team_size || data.teamSize || '1'));
  var track       = sanitize(data.primary_track || data.track || data.hackathon_theme || 'Open Sandbox & Civic Innovation');

  if (!leaderName || !leaderEmail || !leaderPhone || !college) {
    return buildJsonResponse({ success: false, message: 'Required fields missing: name, email, phone, college.' });
  }
  if (!isValidEmail(leaderEmail)) {
    return buildJsonResponse({ success: false, message: 'Invalid email address.' });
  }

  var sheet = getOrCreateSheet(CONFIG.HACKATHON_SHEET, HACKATHON_HEADERS);
  if (checkDuplicate(sheet, leaderEmail, 8)) {
    return buildJsonResponse({ success: false, message: 'This email is already registered for the hackathon.' });
  }

  var regId = generateRegistrationId(CONFIG.HACK_PREFIX, sheet);

  var row = [
    regId, new Date().toISOString(), 'HACKATHON', track,
    teamName || ('Team ' + leaderName), teamSize,
    leaderName, leaderEmail, leaderPhone, college,
    sanitize(data.member2 || data.member_2 || ''),
    sanitize(data.member3 || data.member_3 || ''),
    sanitize(data.member4 || data.member_4 || ''),
    sanitize(data.concept_brief || data.conceptBrief || ''),
    sanitize(data.portfolio_url || data.portfolioUrl || ''),
    sanitize(data.payment_status || data.paymentStatus || 'PENDING'),
    sanitize(data.razorpay_payment_id || data.paymentId || ''),
    (data.payment_done === true || data.payment_status === 'PAID' || data.paymentStatus === 'PAID') ? 'YES' : 'NO',
    data.source || 'website'
  ];

  sheet.appendRow(row);
  Logger.log('Hackathon saved: ' + regId);

  // Send automated confirmation email from 23322147019@deshbhagatuniversity.in
  sendConfirmationEmail(
    leaderEmail,
    leaderName,
    regId,
    'HACKATHON',
    track,
    '<strong>Team:</strong> ' + (teamName || 'Solo Builder') + ' &bull; <strong>Squad Size:</strong> ' + teamSize + ' Builders &bull; <strong>College:</strong> ' + college
  );

  return buildJsonResponse({ success: true, registrationId: regId, message: "Registration successful! Welcome to CRAFTCON '26.", category: 'HACKATHON', track: track });
}

function handleGamingRegistration(data) {
  var cap = data.captain || {};
  var captainName  = sanitize(data.captain_name  || cap.name  || data.captainName  || '');
  var captainEmail = sanitize(data.captain_email || cap.email || data.captainEmail || '').toLowerCase();
  var captainPhone = sanitize(data.captain_phone || cap.phone || data.captainPhone || '');
  var college      = sanitize(data.college_name  || data.college || data.collegeName || '');
  var game         = sanitize(data.game || data.gameId || data.game_id || 'Unknown');
  var teamName     = sanitize(data.team_name || data.teamName || data.squadName || ('Team ' + captainName));
  var regType      = sanitize(data.registration_type || data.registrationType || 'SQUAD');
  var captainIgn   = sanitize(cap.inGameName || cap.ign || data.captain_ign || '');
  var totalAmount  = sanitize(String(data.total_amount || data.totalAmount || data.amount || '0'));
  var utr          = sanitize(data.utr || data.utrTransactionId || '');
  var payStatus    = sanitize(data.payment_status || data.paymentStatus || (utr ? 'SUBMITTED' : 'PENDING'));

  if (!captainName || !captainEmail || !captainPhone || !college) {
    return buildJsonResponse({ success: false, message: 'Required fields missing: captain name, email, phone, college.' });
  }
  if (!isValidEmail(captainEmail)) {
    return buildJsonResponse({ success: false, message: 'Invalid email address.' });
  }

  var sheet = getOrCreateSheet(CONFIG.GAMING_SHEET, GAMING_HEADERS);
  if (checkDuplicateWithGame(sheet, captainEmail, game, 9, 4)) {
    return buildJsonResponse({ success: false, message: 'This email is already registered for ' + game + '.' });
  }

  var regId = generateRegistrationId(CONFIG.GAMING_PREFIX, sheet);
  var players = Array.isArray(data.players) ? data.players : [];

  var row = [
    regId, new Date().toISOString(), 'GAMING', game, regType.toUpperCase(),
    teamName, college,
    captainName, captainEmail, captainPhone, captainIgn,
    sanitize(players[1] ? (players[1].name || '') : (data.player2 || '')),
    sanitize(players[2] ? (players[2].name || '') : (data.player3 || '')),
    sanitize(players[3] ? (players[3].name || '') : (data.player4 || '')),
    sanitize(players[4] ? (players[4].name || '') : (data.player5 || '')),
    sanitize(String(data.player_count || data.playerCount || players.length || 1)),
    totalAmount, utr, payStatus,
    sanitize(data.razorpay_payment_id || data.paymentId || ''),
    (data.payment_status === 'PAID' || data.paymentStatus === 'PAID' || payStatus === 'PAID') ? 'YES' : 'NO',
    data.source || 'website'
  ];

  sheet.appendRow(row);
  Logger.log('Gaming saved: ' + regId);

  // Send automated confirmation email from 23322147019@deshbhagatuniversity.in
  sendConfirmationEmail(
    captainEmail,
    captainName,
    regId,
    'GAMING ARENA',
    game,
    '<strong>Team / Handle:</strong> ' + teamName + ' &bull; <strong>Format:</strong> ' + regType.toUpperCase() + ' &bull; <strong>Payment:</strong> ' + payStatus + (utr ? ' (UTR: ' + utr + ')' : '')
  );

  return buildJsonResponse({ success: true, registrationId: regId, message: 'Gaming registration successful for ' + game + '!', category: 'GAMING', game: game });
}

function handleSponsorEnquiry(data) {
  var name    = sanitize(data.name || data.contactName || '');
  var email   = sanitize(data.email || '').toLowerCase();
  if (!name || !email) {
    return buildJsonResponse({ success: false, message: 'Contact name and email are required.' });
  }
  var sheet = getOrCreateSheet(CONFIG.SPONSOR_SHEET, SPONSOR_HEADERS);
  sheet.appendRow([
    new Date().toISOString(),
    sanitize(data.company || data.sponsorCompany || ''),
    name, email,
    sanitize(data.phone || ''),
    sanitize(data.interest || data.sponsorship_interest || 'General Sponsorship'),
    sanitize(data.message || ''),
    data.source || 'website'
  ]);
  return buildJsonResponse({ success: true, message: "Thank you for your interest in sponsoring CRAFTCON '26! We'll contact you shortly." });
}

/**
 * handleRazorpayUpdate — Updates Payment ID + Payment Done status in Google Sheet
 * Called by server.js after Razorpay /api/payments/verify succeeds
 */
function handleRazorpayUpdate(data) {
  var registrationId = sanitize(data.registration_id || data.registrationId || '');
  var paymentId      = sanitize(data.payment_id || data.paymentId || data.razorpay_payment_id || '');
  var category       = (data.category || '').toString().toUpperCase().trim();

  if (!registrationId || !paymentId) {
    return buildJsonResponse({ success: false, message: 'registration_id and payment_id are required.' });
  }

  var updated = false;

  // Try specific sheet first, else try both
  var sheetsToTry = [];
  if (category === 'HACKATHON') {
    sheetsToTry = [CONFIG.HACKATHON_SHEET, CONFIG.GAMING_SHEET];
  } else if (category === 'GAMING') {
    sheetsToTry = [CONFIG.GAMING_SHEET, CONFIG.HACKATHON_SHEET];
  } else {
    sheetsToTry = [CONFIG.GAMING_SHEET, CONFIG.HACKATHON_SHEET];
  }

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  for (var s = 0; s < sheetsToTry.length; s++) {
    var sheet = ss.getSheetByName(sheetsToTry[s]);
    if (!sheet) continue;

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Find column indices (1-based)
    var regIdCol = -1, payIdCol = -1, payDoneCol = -1, payStatusCol = -1;
    for (var c = 0; c < headers.length; c++) {
      var h = (headers[c] || '').toString().toLowerCase().trim();
      if (h === 'registration id') regIdCol = c + 1;
      if (h === 'razorpay payment id') payIdCol = c + 1;
      if (h === 'payment done') payDoneCol = c + 1;
      if (h === 'payment status') payStatusCol = c + 1;
    }

    if (regIdCol < 0) continue;

    // Auto-create missing Razorpay columns in existing sheet if not present
    if (payIdCol < 0) {
      lastCol++;
      payIdCol = lastCol;
      sheet.getRange(1, payIdCol).setValue('Razorpay Payment ID').setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    }
    if (payDoneCol < 0) {
      lastCol++;
      payDoneCol = lastCol;
      sheet.getRange(1, payDoneCol).setValue('Payment Done').setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    }

    // Search for matching registration ID
    var regIds = sheet.getRange(2, regIdCol, lastRow - 1, 1).getValues();
    for (var r = 0; r < regIds.length; r++) {
      if ((regIds[r][0] || '').toString().trim() === registrationId) {
        var targetRow = r + 2; // +2 because header is row 1 + 0-index

        if (payIdCol > 0) sheet.getRange(targetRow, payIdCol).setValue(paymentId);
        if (payDoneCol > 0) sheet.getRange(targetRow, payDoneCol).setValue('YES');
        if (payStatusCol > 0) sheet.getRange(targetRow, payStatusCol).setValue('PAID');

        Logger.log('Razorpay update applied to row ' + targetRow + ' in ' + sheetsToTry[s] + ' for reg: ' + registrationId);
        updated = true;
        break;
      }
    }
    if (updated) break;
  }

  if (updated) {
    return buildJsonResponse({ success: true, message: 'Payment status updated to PAID for ' + registrationId + ' (Razorpay ID: ' + paymentId + ').' });
  } else {
    return buildJsonResponse({ success: false, message: 'Registration ID not found in sheet: ' + registrationId });
  }
}


function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      var r = sheet.getRange(1, 1, 1, headers.length);
      r.setValues([headers]);
      r.setFontWeight('bold');
      r.setBackground('#1a1a2e');
      r.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function generateRegistrationId(prefix, sheet) {
  var lastRow = sheet.getLastRow();
  var seq = String(lastRow).padStart(4, '0');
  return prefix + '-' + seq;
}

function checkDuplicate(sheet, email, emailColIndex) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var data = sheet.getRange(2, emailColIndex, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if ((data[i][0] || '').toString().toLowerCase().trim() === email) return true;
  }
  return false;
}

function checkDuplicateWithGame(sheet, email, game, emailColIndex, gameColIndex) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var cols = Math.max(emailColIndex, gameColIndex);
  var data = sheet.getRange(2, 1, lastRow - 1, cols).getValues();
  var ei = emailColIndex - 1;
  var gi = gameColIndex - 1;
  for (var i = 0; i < data.length; i++) {
    var rowEmail = (data[i][ei] || '').toString().toLowerCase().trim();
    var rowGame  = (data[i][gi] || '').toString().toUpperCase().trim();
    if (rowEmail === email && rowGame === game.toUpperCase().trim()) return true;
  }
  return false;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(value) {
  if (typeof value !== 'string') return String(value || '');
  return value.trim().replace(/<[^>]*>/g, '').substring(0, 500);
}

function buildJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sends official HTML confirmation email directly from the hosting Google account:
 * 23322147019@deshbhagatuniversity.in
 */
function sendConfirmationEmail(recipientEmail, recipientName, regId, category, eventName, details) {
  try {
    if (!recipientEmail || !isValidEmail(recipientEmail)) return;

    var subject = "Registration Confirmed: " + eventName + " [ID: " + regId + "] - CRAFTCON '26";
    var htmlBody = 
      "<div style='font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background-color: #09090e; color: #f1f5f9; padding: 30px 20px;'>" +
        "<div style='max-width: 600px; margin: 0 auto; background-color: #12121c; border: 1px solid rgba(157, 78, 221, 0.4); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 35px rgba(0,0,0,0.7);'>" +
          "<div style='background: linear-gradient(135deg, #1f0936 0%, #3c096c 100%); padding: 26px 22px; text-align: center; border-bottom: 2px solid #ffb703;'>" +
            "<h1 style='margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 1px;'>CRAFTCON '26</h1>" +
            "<p style='margin: 6px 0 0 0; color: #ffb703; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;'>Official Registration Confirmation</p>" +
          "</div>" +
          "<div style='padding: 24px 22px;'>" +
            "<p style='font-size: 16px; margin: 0 0 16px 0; color: #ffffff;'>Dear <strong>" + recipientName + "</strong>,</p>" +
            "<p style='color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 18px 0;'>Congratulations! Your registration for <strong>" + eventName + "</strong> at <strong>Desh Bhagat University</strong> has been verified and confirmed.</p>" +
            "<div style='background-color: #1a1a28; border: 1px solid rgba(255,255,255,0.1); border-left: 4px solid #70e000; border-radius: 8px; padding: 16px; margin: 20px 0;'>" +
              "<div style='margin-bottom: 8px;'><span style='color: #94a3b8; font-size: 12px;'>PASS ID / REGISTRATION ID:</span><br><strong style='color: #ffd600; font-family: monospace; font-size: 18px; letter-spacing: 1px;'>" + regId + "</strong></div>" +
              "<div style='margin-bottom: 8px;'><span style='color: #94a3b8; font-size: 12px;'>EVENT:</span><br><strong style='color: #ffffff; font-size: 14px;'>" + eventName + " (" + category + ")</strong></div>" +
              "<div style='margin-bottom: 8px;'><span style='color: #94a3b8; font-size: 12px;'>VENUE:</span><br><span style='color: #e2e8f0; font-size: 13px;'>Auditorium & Sports Complex, Desh Bhagat University, Punjab</span></div>" +
              (details ? "<div style='margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.15); color: #cbd5e1; font-size: 13px;'>" + details + "</div>" : "") +
            "</div>" +
            "<p style='color: #94a3b8; font-size: 13px; line-height: 1.5;'>Please keep this email and your <strong>Registration ID</strong> safe. You will be required to present it at the university registration desk during entry.</p>" +
            "<div style='text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08);'>" +
              "<p style='margin: 0; font-size: 12px; color: #64748b;'>Desh Bhagat University (NAAC Grade A+ Accredited)<br>Faculty of Computing & Information Technology<br>Sent by: <strong>23322147019@deshbhagatuniversity.in</strong></p>" +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>";

    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: "CRAFTCON '26 — Desh Bhagat University",
      replyTo: '23322147019@deshbhagatuniversity.in',
      noReply: false
    });
    Logger.log("Official confirmation email sent to " + recipientEmail + " for reg: " + regId);
  } catch (err) {
    Logger.log("Error sending email to " + recipientEmail + ": " + err.message);
  }
}

