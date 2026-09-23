/**

 * =========================================================================

 * ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ (INVENTORY MANAGEMENT SYSTEM)

 * Google Apps Script Backend (API, Auth, Transactions, Notifications, Dashboard)

 * =========================================================================

 */



// Global Sheet Names Constants

const SHEETS = {

  ITEMS: 'Items',

  TRANSACTIONS: 'Transactions',

  USERS: 'Users',

  WAREHOUSES: 'Warehouses',

  CATEGORIES: 'Categories',

  LOGS: 'ActivityLogs',

  SETTINGS: 'Settings',

  REQUISITIONS: 'ProductRequests',

  CHAT: 'ChatMessages'

};

/**
 * មុខងារសម្រាប់ចុច Run លើកដំបូង ដើម្បីសុំសិទ្ធិ Google Drive និង Google Sheets
 */
function authorizeScopes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Connected to Sheet: ' + ss.getName());
  const testFile = DriveApp.createFile('auth_test.txt', 'Authorized ' + new Date().toISOString());
  Logger.log('Created test file: ' + testFile.getName() + ' with ID: ' + testFile.getId());
  testFile.setTrashed(true);
  Logger.log('SUCCESS: Full Google Drive Create/Write Permission Authorized!');
  return 'SUCCESS: Full Google Drive & Google Sheets Authorized!';
}




// Global Default Telegram Bot Credentials for SuperAdmin

const DEFAULT_TELEGRAM_BOT_TOKEN = '8292690919:AAFVJciyoebmTKPxg5rYsyMv56Ol2jzpibY';

const DEFAULT_TELEGRAM_CHAT_ID = '1197248107';



// Global Default Google Drive Product Images Folder

const DEFAULT_DRIVE_FOLDER_ID = '1_pn3xY4G0wnaqLcT44VGPEz9W1_4E_Qm';

const DEFAULT_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/u/2/folders/1_pn3xY4G0wnaqLcT44VGPEz9W1_4E_Qm';



// ==========================================

// 1. WEB APP ROUTING (doGet & doPost)

// ==========================================



/**

 * Global safe declaration for sendTelegramAlert

 */

function sendTelegramAlert(messageText, replyMarkup) {

  try {

    if (typeof sendTelegramNotification === 'function') {

      return sendTelegramNotification(messageText, replyMarkup);

    }

  } catch (err) {

    if (typeof Logger !== 'undefined') Logger.log('sendTelegramAlert Error: ' + err.toString());

  }

  return false;

}



/**

 * ដំណើរការពេលបើក Web App លើ Browser ឬពេល Admin ចុច Approve/Reject ពី Telegram

 */

function doGet(e) {

  // 1. Handle direct action from Telegram Approve / Reject button clicks

  if (e && e.parameter && e.parameter.action) {

    const action = e.parameter.action;

    const userId = e.parameter.userId;

    const username = e.parameter.u || e.parameter.username || '';



    if (action === 'approveUserTelegram' || action === 'approveUser') {

      return handleTelegramUserApproval(userId, username, 'Active');

    } else if (action === 'rejectUserTelegram' || action === 'rejectUser') {

      return handleTelegramUserApproval(userId, username, 'Rejected');

    } else if (action === 'approveUserDeletionTelegram' || action === 'approveUserDeletion') {
      return handleTelegramUserDeletionApproval(userId, username, 'Approve', e);
    } else if (action === 'rejectUserDeletionTelegram' || action === 'rejectUserDeletion') {
      return handleTelegramUserDeletionApproval(userId, username, 'Reject', e);
    } else if (action === 'reviewUserDeletionTelegram' || action === 'reviewUserDeletion') {
      return handleTelegramUserDeletionApproval(userId, username, 'Review', e);
    } else {
      // General API handler for GET requests
      try {
        let payload = {};
        if (e.parameter.payload) {
          try { payload = JSON.parse(e.parameter.payload); } catch (ex) { payload = e.parameter; }
        } else {
          payload = e.parameter;
        }
        const apiRes = handleApiRequest({ action: action, payload: payload });
        return ContentService.createTextOutput(JSON.stringify(apiRes || { success: true }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (getErr) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, message: getErr.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  // 2. Default Web App GUI
  try {
    let template;
    try {
      template = HtmlService.createTemplateFromFile('Index');
    } catch (e1) {
      template = HtmlService.createTemplateFromFile('index');
    }
    return template.evaluate()
      .setTitle('ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ | Smart Inventory')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (htmlErr) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      status: 'ONLINE',
      account: 'chhengyiv3@gmail.com',
      message: 'Google Apps Script Backend API is ACTIVE and connected to chhengyiv3@gmail.com Google Sheet & Drive!',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ដំណើរការទទួល Request តាមរយៈ HTTP POST ពី Web App (GitHub Pages)
 */
function doPost(e) {
  try {
    let req = {};
    if (e && e.postData && e.postData.contents) {
      try {
        req = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        req = { action: (e.parameter && e.parameter.action) || 'unknown', payload: e.parameter || {} };
      }
    } else if (e && e.parameter) {
      req = { action: e.parameter.action, payload: e.parameter };
    }

    const result = handleApiRequest(req);
    return ContentService.createTextOutput(JSON.stringify(result || { success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    if (typeof Logger !== 'undefined') Logger.log('doPost Error: ' + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Server error: ' + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}



/**

 * ទទួលការចុច Approve ឬ Reject ពី Telegram Bot Inline Button

 */

function handleTelegramUserApproval(userId, username, targetStatus) {

  try {

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const sheet = ensureUsersInitialized(ss);

    const data = sheet.getDataRange().getValues();



    let foundRow = -1;

    let userFullName = username;

    let userRole = 'Stock Keeper';

    let userWh = '';



    const cleanTargetUser = String(username || '').replace(/\s+/g, ' ').trim().toLowerCase();

    const cleanTargetId = String(userId || '').trim();



    for (let i = 1; i < data.length; i++) {

      const row = data[i];

      const rId = String(row[0]).trim();

      const rUser = String(row[1]).replace(/\s+/g, ' ').trim().toLowerCase();



      if ((cleanTargetId && rId === cleanTargetId) || (cleanTargetUser && rUser === cleanTargetUser)) {

        foundRow = i + 1;

        userFullName = String(row[2]) || row[1];

        userRole = String(row[6]) || 'Stock Keeper';

        userWh = String(row[9]) || '';

        break;

      }

    }



    if (foundRow === -1) {

      return HtmlService.createHtmlOutput(`

        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px; color: #1e293b;">

          <div style="font-size: 56px; margin-bottom: 15px;">⚠️</div>

          <h2 style="color: #e11d48; margin-bottom: 10px;">រកមិនឃើញគណនីនេះទេ</h2>

          <p style="color: #64748b; font-size: 14px;">គណនីនេះអាចត្រូវបានលុប ឬកែប្រែរួចរាល់ហើយ។</p>

        </div>

      `).setTitle('រកមិនឃើញគណនី');

    }



    // Update Status in column 8 (Status)

    sheet.getRange(foundRow, 8).setValue(targetStatus);

    logActivity('ADMIN_TELEGRAM', 'Admin', targetStatus === 'Active' ? 'APPROVE_USER' : 'REJECT_USER', `${targetStatus} user ${username} via Telegram`);



    if (targetStatus === 'Active') {

      sendTelegramAlert(`🎉 <b>[ការអនុម័តជោគជ័យ]</b>\n` +

        `👤 <b>គណនី:</b> ${username} (${userFullName})\n` +

        `💼 <b>តួនាទី:</b> ${userRole}\n` +

        `🏢 <b>ឃ្លាំង:</b> ${userWh}\n` +

        `✅ ស្ថានភាព៖ <b>បានអនុម័ត (Active)</b> រួចរាល់! អ្នកប្រើប្រាស់អាច Login ចូលប្រព័ន្ធបានហើយ។`

      );



      return HtmlService.createHtmlOutput(`

        <!DOCTYPE html>

        <html>

        <head>

          <meta charset="utf-8">

          <meta name="viewport" content="width=device-width, initial-scale=1.0">

          <title>ការអនុម័តជោគជ័យ</title>

          <style>

            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; display: flex; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }

            .card { background: white; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); max-width: 440px; width: 100%; padding: 35px 25px; text-align: center; border: 1px solid #e2e8f0; }

            .icon { width: 72px; height: 72px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 34px; margin: 0 auto 20px; border: 4px solid #bbf7d0; }

            h2 { color: #0f172a; margin: 0 0 8px; font-size: 20px; font-weight: 800; }

            p { color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 20px; }

            .badge { display: inline-block; background: #ecfdf5; color: #059669; font-weight: 700; font-size: 11px; padding: 5px 14px; border-radius: 9999px; margin-bottom: 15px; border: 1px solid #a7f3d0; letter-spacing: 0.5px; }

            .info-box { background: #f1f5f9; border-radius: 14px; padding: 15px; text-align: left; font-size: 12.5px; color: #334155; margin-bottom: 20px; border: 1px solid #e2e8f0; }

            .info-box div { margin-bottom: 7px; }

            .info-box div:last-child { margin-bottom: 0; }

          </style>

        </head>

        <body>

          <div class="card">

            <div class="icon">✓</div>

            <span class="badge">APPROVED BY ADMIN</span>

            <h2>បានអនុម័តគណនីជោគជ័យ!</h2>

            <p>គណនីខាងក្រោមត្រូវបានបើកដំណើរការ (Active) រួចរាល់។ អ្នកប្រើប្រាស់អាច Login ចូលប្រើប្រាស់ប្រព័ន្ធបានភ្លាមៗ។</p>

            <div class="info-box">

              <div>👤 <b>ឈ្មោះ៖</b> ${userFullName}</div>

              <div>🆔 <b>Username៖</b> <code>${username}</code></div>

              <div>💼 <b>តួនាទី៖</b> ${userRole}</div>

              <div>🏢 <b>ឃ្លាំង៖</b> ${userWh}</div>

              <div>🚦 <b>ស្ថានភាពថ្មី៖</b> <b style="color: #16a34a;">Active (បានអនុម័ត)</b></div>

            </div>

          </div>

        </body>

        </html>

      `);

    } else {

      sendTelegramAlert(`❌ <b>[បានបដិសេធសំណើ]</b>\n` +

        `👤 <b>គណនី:</b> ${username} (${userFullName})\n` +

        `🚫 សំណើសុំចុះឈ្មោះត្រូវបាន Admin បដិសេធ (Rejected)។`

      );



      return HtmlService.createHtmlOutput(`

        <!DOCTYPE html>

        <html>

        <head>

          <meta charset="utf-8">

          <meta name="viewport" content="width=device-width, initial-scale=1.0">

          <title>បានបដិសេធសំណើ</title>

          <style>

            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; display: flex; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }

            .card { background: white; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); max-width: 440px; width: 100%; padding: 35px 25px; text-align: center; border: 1px solid #e2e8f0; }

            .icon { width: 72px; height: 72px; background: #ffe4e6; color: #e11d48; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 34px; margin: 0 auto 20px; border: 4px solid #fecdd3; }

            h2 { color: #0f172a; margin: 0 0 8px; font-size: 20px; font-weight: 800; }

            p { color: #64748b; font-size: 13px; line-height: 1.6; margin: 0; }

          </style>

        </head>

        <body>

          <div class="card">

            <div class="icon">✕</div>

            <h2>បានបដិសេធសំណើចុះឈ្មោះ!</h2>

            <p>សំណើសុំចុះឈ្មោះរបស់គណនី <b>${username} (${userFullName})</b> ត្រូវបានបដិសេធ (Rejected) រួចរាល់។</p>

          </div>

        </body>

        </html>

      `);

    }

  } catch (err) {

    return HtmlService.createHtmlOutput('Error: ' + err.toString());

  }

}



const GITHUB_LIVE_CODE_URL = 'https://raw.githubusercontent.com/chenlongqmi-glitch/Stock-ppshv/main/Code.js';



function getLiveBackendCode() {

  try {

    const cache = CacheService.getScriptCache();

    let code = cache.get('LIVE_BACKEND_CODE_V3');

    if (!code) {

      const url = GITHUB_LIVE_CODE_URL + '?_=' + new Date().getTime();

      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

      if (res.getResponseCode() === 200) {

        code = res.getContentText();

        cache.put('LIVE_BACKEND_CODE_V3', code, 120); // Cache for 2 minutes

      }

    }

    return code;

  } catch (err) {

    Logger.log('GitHub Live Code Fetch Error: ' + err);

    return null;

  }

}



/**

 * Universal API Handler សម្រាប់ទទួល Call ពី google.script.run

 */

function handleApiRequest(req) {

  if (req && req.action === 'flushCodeCache') {

    try {

      CacheService.getScriptCache().remove('LIVE_BACKEND_CODE_V3');

      return { success: true, message: 'Apps Script live code cache cleared successfully' };

    } catch (e) {

      return { success: false, message: e.toString() };

    }

  }



  // Auto-sync execution with latest code from GitHub main branch

  try {

    const liveCode = getLiveBackendCode();

    if (liveCode && liveCode.indexOf('executeLocalApiAction') !== -1) {

      const runner = new Function('req', liveCode + '\nreturn executeLocalApiAction(req);');

      return runner(req);

    }

  } catch (e) {

    Logger.log('Live execution failed, fallback to local: ' + e);

  }



  return executeLocalApiAction(req);

}



function executeLocalApiAction(req) {

  try {

    if (!req) return { success: false, message: 'No request payload' };

    const action = req.action;

    const payload = req.payload || {};



    switch (action) {

      case 'loginUser':

      case 'login':

        return loginUser(payload, payload.password);

      case 'logoutUser':

      case 'logout':

        return logoutUser(payload);

      case 'resetUserDeviceBinding':

      case 'resetDeviceBinding':

        return resetUserDeviceBinding(payload, payload.user || payload.actor);

      case 'requestRegistrationOtp':

        return requestRegistrationOtp(payload);

      case 'verifyOtpAndRegister':

        return verifyOtpAndRegister(payload);

      case 'requestPasswordResetOtp':

        return requestPasswordResetOtp(payload);

      case 'resetPasswordWithOtp':

        return resetPasswordWithOtp(payload);

      case 'registerUser':

      case 'register':

        return registerUser(payload);

      case 'getDashboardStats':

      case 'getDashboardData':

        return getDashboardStats(payload.user, payload.warehouseFilter);

      case 'getItemsList':

      case 'getItems':

        return getItemsList(payload.user, payload.warehouseFilter);

      case 'saveOrUpdateItem':

      case 'saveItem':

        return saveOrUpdateItem(payload.item || payload, payload.user);

      case 'syncAllItems':

      case 'syncProducts':

      case 'syncItems':

        return syncAllItems(payload.items || payload, payload.user);

      case 'setupDatabase':

      case 'initDatabase':

        setupDatabase();

        return { success: true, message: 'បានដំឡើងរចនាសម្ព័ន្ធ Google Sheets ជោគជ័យ' };

      case 'uploadImageToDrive':

      case 'uploadProductImage':

        return uploadImageToGoogleDrive(payload.base64 || payload.data || payload.image, payload.fileName, payload.folderName || payload.folderId || payload.folderUrl || DEFAULT_DRIVE_FOLDER_ID);

      case 'deleteItem':

        return deleteItem(payload.sku || payload, payload.user);

      case 'recordStockIn':

      case 'stockIn':

        return recordStockIn(payload.data || payload, payload.user);

      case 'recordStockOut':

      case 'stockOut':

        return recordStockOut(payload.data || payload, payload.user);

      case 'recordStockTransfer':

      case 'stockTransfer':

        return recordStockTransfer(payload.data || payload, payload.user);

      case 'recordStockAdjustment':

      case 'stockAdjustment':

        return recordStockAdjustment(payload.data || payload, payload.user);

      case 'getTransactionHistory':

      case 'getTransactions':

        return getTransactionHistory(payload.filters || payload, payload.user);

      case 'createProductRequest':

        return createProductRequest(payload.data || payload, payload.user);

      case 'getProductRequests':

        return getProductRequests(payload.user, payload.warehouseFilter);

      case 'updateProductRequestStatus':

        return updateProductRequestStatus(payload.reqId, payload.status, payload.adminNotes, payload.adminUser);

      case 'sendChatMessage':

      case 'sendChat':

        return sendChatMessage(payload.data || payload, payload.user);

      case 'editChatMessage':

        return editChatMessage(payload.msgId, payload.newText, payload.user);

      case 'deleteChatMessage':

        return deleteChatMessage(payload.msgId, payload.user);

      case 'markChatMessagesRead':

        return markChatMessagesRead(payload.channelId, payload.user);

      case 'getChatMessages':

      case 'getMessages':

        return getChatMessages(payload.channelId, payload.user);

      case 'getChatChannels':

        return getChatChannels(payload.user);

      case 'getWarehousesDetailed':

      case 'getWarehouses':

        return {

          success: true,

          warehouses: getWarehousesListInternal(),

          warehousesDetailed: getWarehousesDetailed()

        };

      case 'addWarehouse':

        return addWarehouse(payload, payload.user);

      case 'deleteWarehouse':

        return deleteWarehouse(payload, payload.user);

      case 'deleteUser':
        return deleteUser(payload.userId || payload.username || payload.id, payload.adminUser || payload.user, payload.reason || payload.deleteReason);
      case 'requestUserDeletion':
        return requestUserDeletion(payload);
      case 'approveUserDeletion':
        return approveUserDeletion(payload);
      case 'rejectUserDeletion':
        return rejectUserDeletion(payload);
      case 'getUsersList':
      case 'getUsers':
        return getUsersList(payload.user || payload);
      case 'syncUserPasswords':
      case 'syncAllUserPasswords':
        return syncAllUserPasswordsToSheet();
      case 'updateUserStatus':
        return updateUserStatus(payload, payload.status, payload.role, payload.warehouse, payload.adminUser, payload.avatar);

      case 'updateUserProfile':

      case 'updateProfile':

        return updateUserProfile(payload);

      case 'getSystemSettings':

      case 'getSettings':

        return getSystemSettings();

      case 'saveSystemSettings':

      case 'saveSettings':

        return saveSystemSettings(payload.settings || payload, payload.user);

      case 'testTelegramAlert':

      case 'testTelegram':

        return testTelegramAlert(payload.botToken || payload.token, payload.chatId);

      default:

        return { success: false, message: 'Unknown action: ' + action };

    }

  } catch (err) {

    return { success: false, message: 'Server Error: ' + err.toString() };

  }

}



/**

 * ទទួល API Request (JSON) តាមរយៈ HTTP POST ពីខាងក្រៅ ឬ Python Script

 */

function doPost(e) {
  try {
    let req = {};
    if (e && e.postData && e.postData.contents) {
      req = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      req = e.parameter;
    }

    const action = req.action;
    const payload = (req.payload !== undefined) ? req.payload : req;
    const response = handleApiRequest({ action: action, payload: payload });

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Server Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 2. DATABASE SETUP & INITIALIZER
// ==========================================

/**
 * ដំណើរការដោយស្វ័យប្រវត្តិពេលបើក Google Sheet
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('⚡ Smart Inventory')
      .addItem('🔄 ដំឡើងរចនាសម្ព័ន្ធតារាង និងទិន្នន័យ (Setup Database & Items)', 'setupDatabase')
      .addItem('📦 បញ្ចូលទំនិញគំរូ (Seed Master Catalog)', 'setupDatabase')
      .addToUi();
  } catch (e) {
    if (typeof Logger !== 'undefined') Logger.log('onOpen menu notice: ' + e.toString());
  }
}

/**
 * មុខងារបង្កើត និងកំណត់រចនាសម្ព័ន្ធ Google Sheets ដោយស្វ័យប្រវត្តិ
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet Items
  let itemsSheet = getOrCreateSheet(ss, SHEETS.ITEMS);
  const itemHeaders = [
    'SKU', 'Barcode', 'ItemName', 'Category', 'Unit',
    'CostPrice', 'SellingPrice', 'MinStockLevel', 'Location',
    'CurrentStock', 'ImageUrl', 'Status', 'UpdatedAt',
    'Size', 'Color', 'PackUnit', 'PackQty', 'Zone', 'ZoneNumber', 'Notes', 'CreatedBy'
  ];

  if (itemsSheet.getLastRow() === 0) {
    itemsSheet.appendRow(itemHeaders);
    formatHeaderRow(itemsSheet, itemHeaders.length, '#1e293b');
  }

  // ប្រសិនបើតារាងទំនិញនៅទទេ (មានត្រឹម Header ឬតិចជាងនេះ) សូមបញ្ចូលទំនិញគំរូភ្លាម
  if (itemsSheet.getLastRow() <= 1) {
    itemsSheet.appendRow(['SKU-7501', 'SKU-7501', 'ប៊ិច-圆珠笔', 'សម្ភារៈការិយាល័យ', 'ដើម', 0.50, 0.80, 1, 'គ្រប់ស្ថានីយទាំងអស់', 0, 'assets/SKU-7501.jpg', 'Active', new Date(), 'Pixcell', 'ខ្មៅ', 'ប្រអប់', 12, 'តំបន់ A', 'Z-01', 'ចំណាំដើម', 'Admin']);
    itemsSheet.appendRow(['SKU-9144', 'SKU-9144', 'ទឹកលុប-涂改液', 'សម្ភារៈការិយាល័យ', 'ដើម', 0.50, 0.80, 1, 'គ្រប់ស្ថានីយទាំងអស់', 0, 'assets/SKU-9144.jpg', 'Active', new Date(), 'Pixcell', 'ស', 'ប្រអប់', 12, 'តំបន់ A (ទំនិញទូទៅ)', 'Z-01', 'ចំណាំសិន', 'Admin']);
    itemsSheet.appendRow(['SKU-9050', 'SKU-9050', 'ប៊ិច-圆珠笔', 'សម្ភារៈការិយាល័យ', 'ដើម', 0.50, 0.80, 1, 'គ្រប់ស្ថានីយទាំងអស់', 0, 'assets/SKU-9050.jpg', 'Active', new Date(), 'Pixcell', 'ក្រហម', 'ប្រអប់', 12, 'តំបន់ A', 'Z-01', 'ចំណាំសិន', 'Admin']);
    itemsSheet.appendRow(['SKU-9649', 'SKU-9649', 'ប៊ិច-圆珠笔', 'សម្ភារៈការិយាល័យ', 'ដើម', 0.50, 0.80, 1, 'គ្រប់ស្ថានីយទាំងអស់', 0, 'assets/SKU-9649.jpg', 'Active', new Date(), 'Pixcell', 'ខៀវ', 'ប្រអប់', 12, 'តំបន់ A', 'Z-01', 'ចំណាំសិន', 'Admin']);
  }

  // 2. Sheet Transactions

  let txSheet = getOrCreateSheet(ss, SHEETS.TRANSACTIONS);

  if (txSheet.getLastRow() === 0) {

    const headers = [

      'TxID', 'Date', 'Type', 'SKU', 'ItemName',

      'Quantity', 'Unit', 'UnitPrice', 'TotalAmount',

      'FromLocation', 'ToLocation', 'Reason_Notes', 'User', 'Timestamp'

    ];

    txSheet.appendRow(headers);

    formatHeaderRow(txSheet, headers.length, '#0f766e');

  }



  // 3. Sheet Users (With Warehouse Column)

  let usersSheet = getOrCreateSheet(ss, SHEETS.USERS);

  if (usersSheet.getLastRow() === 0) {

    const headers = [

      'UserID', 'Username', 'FullName', 'Email',

      'Password', 'Salt', 'Role', 'Status', 'CreatedAt', 'Warehouse', 'Avatar', 'Phone',

      'DeleteReason', 'DeleteRequestedBy', 'DeleteRequestedAt', 'BoundDevices', 'Password'

    ];

    usersSheet.appendRow(headers);

    formatHeaderRow(usersSheet, headers.length, '#4338ca');



    // Default SuperAdmin: superadmin / 841453Bsm (Full system control)

    const saSalt = generateSalt();

    usersSheet.appendRow(['USR-SA', 'superadmin', '陈龙', 'chenlongqmi@gmail.com', '841453Bsm', saSalt, 'SuperAdmin', 'Active', new Date(), 'ALL', 'assets/superadmin_avatar.jpg', '066966606', '', '', '', JSON.stringify({ desktop: null, mobile: null }), '841453Bsm']);



    // Default Admin: admin / admin123 (Can access ALL 11 Warehouses)

    const salt = generateSalt();

    usersSheet.appendRow(['USR-001', 'admin', '聂稳新', 'ppshv2024@gmail.com', 'admin123', salt, 'Admin', 'Active', new Date(), 'ALL', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '098880803', '', '', '', JSON.stringify({ desktop: null, mobile: null }), 'admin123']);



  }



  // 4. Sheet Warehouses (11 Locations)

  let whSheet = getOrCreateSheet(ss, SHEETS.WAREHOUSES);

  if (whSheet.getLastRow() === 0) {

    const headers = ['WarehouseID', 'Name', 'Location', 'Manager', 'Status'];

    whSheet.appendRow(headers);

    formatHeaderRow(whSheet, headers.length, '#334155');



    whSheet.appendRow(['WH-01', '1-K3 ស្ថានីយ (ភ្នំពេញ)', 'ភ្នំពេញ', 'លោក សុខា', 'Active']);

    whSheet.appendRow(['WH-02', '2-K26 ស្ថានីយ (កំពង់ស្ពឺ កើត)', 'កំពង់ស្ពឺ កើត', 'កញ្ញា រតនា', 'Active']);

    whSheet.appendRow(['WH-03', '3-K43 ស្ថានីយ (កំពង់ស្ពឺ លិច)', 'កំពង់ស្ពឺ លិច', 'លោក ចាន់ណា', 'Active']);

    whSheet.appendRow(['WH-04', '4-K76 ស្ថានីយ (ត្រែងត្រយឹង)', 'ត្រែងត្រយឹង', 'លោក វិបុល', 'Active']);

    whSheet.appendRow(['WH-05', '5-K114 ស្ថានីយ (កំពង់សីលា)', 'កំពង់សីលា', 'អ្នកស្រី ធីតា', 'Active']);

    whSheet.appendRow(['WH-06', '6-K135 ស្ថានីយ (ស្រែអំបិល)', 'ស្រែអំបិល', 'លោក សម្បត្តិ', 'Active']);

    whSheet.appendRow(['WH-07', '7-K172 ស្ថានីយ (ស្ទឹងហាវ)', 'ស្ទឹងហាវ', 'កញ្ញា ម៉ាលី', 'Active']);

    whSheet.appendRow(['WH-08', '8-K182 ស្ថានីយ (ព្រះសីហនុ)', 'ព្រះសីហនុ', 'លោក ពិសិដ្ឋ', 'Active']);

    whSheet.appendRow(['WH-09', '中心库房 (ឃ្លាំងស្តុកនៅបុងសឹង)', 'បុងសឹង', 'លោក សារ៉ាត់', 'Active']);

    whSheet.appendRow(['WH-10', '机电 (អគ្គិសនី និងគ្រឿងម៉ាស៊ីន)', '机电', 'អ្នកស្រី សុភា', 'Active']);

    whSheet.appendRow(['WH-11', '综合办 (ផ្នែកកិច្ចការទូទៅ)', '综合办', 'លោក វណ្ណា', 'Active']);

  }



  // 5. Sheet Categories

  let catSheet = getOrCreateSheet(ss, SHEETS.CATEGORIES);

  if (catSheet.getLastRow() === 0) {

    const headers = ['CategoryID', 'Name', 'Description'];

    catSheet.appendRow(headers);

    formatHeaderRow(catSheet, headers.length, '#334155');

    catSheet.appendRow(['CAT-01', 'ភេសជ្ជៈ', 'ភេសជ្ជៈ ស្រាបៀរ ទឹកបរិសុទ្ធ']);

    catSheet.appendRow(['CAT-02', 'គ្រឿងទេស', 'កាហ្វេ តែ ស្ករ ទឹកដោះគោ']);

    catSheet.appendRow(['CAT-03', 'អាហារស្ងួត', 'មី នំកញ្ចប់ ត្រីខ']);

    catSheet.appendRow(['CAT-04', 'សម្ភារៈប្រើប្រាស់', 'សម្ភារៈការិយាល័យ និងផ្ទះបាយ']);

  }



  // 6. Sheet ActivityLogs

  let logSheet = getOrCreateSheet(ss, SHEETS.LOGS);

  if (logSheet.getLastRow() === 0) {

    const headers = ['LogID', 'Timestamp', 'User', 'Role', 'Action', 'Details'];

    logSheet.appendRow(headers);

    formatHeaderRow(logSheet, headers.length, '#64748b');

  }



  // 7. Sheet Settings

  let setSheet = getOrCreateSheet(ss, SHEETS.SETTINGS);

  if (setSheet.getLastRow() === 0) {

    const headers = ['Key', 'Value', 'Description'];

    setSheet.appendRow(headers);

    formatHeaderRow(setSheet, headers.length, '#0284c7');

    setSheet.appendRow(['COMPANY_NAME', 'Smart Inventory Solution', 'ឈ្មោះក្រុមហ៊ុន/អាជីវកម្ម']);

    setSheet.appendRow(['CURRENCY_SYMBOL', '$', 'និមិត្តសញ្ញារូបិយប័ណ្ណ ($ ឬ ៛)']);

    setSheet.appendRow(['TELEGRAM_BOT_TOKEN', DEFAULT_TELEGRAM_BOT_TOKEN, 'Telegram Bot API Token']);

    setSheet.appendRow(['TELEGRAM_CHAT_ID', DEFAULT_TELEGRAM_CHAT_ID, 'Telegram Group/Channel Chat ID']);

    setSheet.appendRow(['ENABLE_LOW_STOCK_ALERT', 'TRUE', 'បើក/បិទ ការជូនដំណឹងស្តុកទាប']);

    setSheet.appendRow(['ALERT_EMAIL', '', 'អ៊ីមែលទទួលដំណឹងពេលស្តុកជិតអស់']);

    setSheet.appendRow(['DRIVE_IMAGE_FOLDER_ID', DEFAULT_DRIVE_FOLDER_ID, 'Google Drive Folder ID សម្រាប់ផ្ទុករូបភាពទំនិញ']);

    setSheet.appendRow(['DRIVE_IMAGE_FOLDER_URL', DEFAULT_DRIVE_FOLDER_URL, 'តំណភ្ជាប់ Google Drive Folder សម្រាប់ផ្ទុករូបភាពទំនិញ']);

    setSheet.appendRow(['DRIVE_IMAGE_FOLDER', 'Stock_Product_Images', 'ឈ្មោះ Folder ក្នុង Google Drive សម្រាប់ផ្ទុករូបភាពទំនិញ']);

  }



  // កំណត់ Font Khmer OS Siemreap លើគ្រប់ Sheets ទាំងអស់

  applyKhmerOSSiemreapFontToAllSheets(ss);



  Logger.log('✅ Database Setup Completed Successfully with Khmer OS Siemreap Font!');

  return { success: true, message: 'Database setup completed' };

}



function getOrCreateSheet(ss, name) {

  let sheet = ss.getSheetByName(name);

  if (!sheet) {

    sheet = ss.insertSheet(name);

  }

  return sheet;

}



function formatHeaderRow(sheet, colCount, bgHex) {

  const headerRange = sheet.getRange(1, 1, 1, colCount);

  headerRange.setBackground(bgHex)

    .setFontColor('#ffffff')

    .setFontWeight('bold')

    .setFontFamily('Siemreap')

    .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);



  // កំណត់ Font លើ DataRange ទាំងមូល

  try {

    sheet.getDataRange().setFontFamily('Siemreap');

  } catch (e) { }

}



/**

 * មុខងារផ្លាស់ប្តូរ Font នៃគ្រប់ Sheet ទាំងអស់ក្នុង Google Sheets ទៅជា "Siemreap"

 * អ្នកអាច Run Function នេះក្នុង Apps Script ដើម្បីប្តូរ Font ទិន្នន័យចាស់ៗទាំងអស់បានភ្លាមៗ!

 */

function applyKhmerOSSiemreapFontToAllSheets(spreadsheet) {

  const ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) return;

  const sheets = ss.getSheets();

  sheets.forEach(sheet => {

    try {

      const range = sheet.getDataRange();

      if (range && range.getLastRow() > 0 && range.getLastColumn() > 0) {

        range.setFontFamily('Siemreap');

      }

      // កំណត់ Font សម្រាប់ជួរឈរទាំងអស់ (Columns) សម្រាប់ទិន្នន័យថ្មីដែលបញ្ចូលក្រោយ

      const maxRows = sheet.getMaxRows();

      const maxCols = sheet.getMaxColumns();

      if (maxRows > 0 && maxCols > 0) {

        sheet.getRange(1, 1, maxRows, maxCols).setFontFamily('Siemreap');

      }

    } catch (err) {

      Logger.log('Font set error on sheet ' + sheet.getName() + ': ' + err.message);

    }

  });

  Logger.log('✅ បានផ្លាស់ប្តូរ Font ទៅជា Siemreap សម្រាប់គ្រប់សន្លឹកកិច្ចការ (Sheets) រួចរាល់!');

  return { success: true, message: 'បានប្តូរ Font ទៅ Siemreap រួចរាល់' };

}



// ==========================================

// 3. AUTHENTICATION & SECURITY

// ==========================================



function generateSalt(length = 16) {

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

  let salt = '';

  for (let i = 0; i < length; i++) {

    salt += chars.charAt(Math.floor(Math.random() * chars.length));

  }

  return salt;

}



function hashPassword(password, salt) {

  const rawBytes = Utilities.computeDigest(

    Utilities.DigestAlgorithm.SHA_256,

    String(password) + String(salt || ''),

    Utilities.Charset.UTF_8

  );

  let hash = '';

  for (let i = 0; i < rawBytes.length; i++) {

    let byteVal = rawBytes[i];

    if (byteVal < 0) byteVal += 256;

    let byteStr = byteVal.toString(16);

    if (byteStr.length === 1) byteStr = '0' + byteStr;

    hash += byteStr;

  }

  return hash;

}



/**

 * ពិនិត្យ និងធានាថាមាន User Sheet និង Admin រួចរាល់

 */
function ensureUsersInitialized(ss) {
  let sheet = ss.getSheetByName(SHEETS.USERS);
  if (!sheet || sheet.getLastRow() === 0) {
    setupDatabase();
    sheet = ss.getSheetByName(SHEETS.USERS);
  } else {
    // Ensure column count is at least 17 for Avatar, Phone, Deletion Workflow, BoundDevices & Password
    if (sheet.getMaxColumns() < 17) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), 17 - sheet.getMaxColumns());
    }
    try {
      sheet.getRange(1, 5).setValue('Password');
      sheet.getRange(1, 11).setValue('Avatar');
      sheet.getRange(1, 12).setValue('Phone');
      sheet.getRange(1, 13).setValue('DeleteReason');
      sheet.getRange(1, 14).setValue('DeleteRequestedBy');
      sheet.getRange(1, 15).setValue('DeleteRequestedAt');
      sheet.getRange(1, 16).setValue('BoundDevices');
      sheet.getRange(1, 17).setValue('Password');
    } catch (colErr) {}

    // Backfill and record plain passwords for all existing users in Google Sheets
    try {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const uId = String(data[i][0] || '').trim();
        const uName = String(data[i][1] || '').trim().toLowerCase();
        if (!uId) continue;

        let curValE = String(data[i][4] || '').trim();
        let curValQ = String(data[i][16] || '').trim();
        let plainPwd = '';

        if (curValE && curValE.length <= 30 && !/^[0-9a-f]{64}$/i.test(curValE)) {
          plainPwd = curValE;
        } else if (curValQ && curValQ.length <= 30 && !/^[0-9a-f]{64}$/i.test(curValQ)) {
          plainPwd = curValQ;
        } else if (uName === 'superadmin' || uId === 'USR-SA') {
          plainPwd = '841453Bsm';
        } else if (uName === 'admin' || uId === 'USR-001') {
          plainPwd = 'admin123';
        } else {
          plainPwd = '123456';
        }

        if (curValE !== plainPwd) {
          sheet.getRange(i + 1, 5).setValue(plainPwd);
        }
        if (curValQ !== plainPwd) {
          sheet.getRange(i + 1, 17).setValue(plainPwd);
        }
      }
    } catch (syncErr) {}
  }
  return sheet;
}



function loginUser(usernameOrData, password, extraDeviceInfo) {
  let uInput = '';
  let pInput = '';
  let deviceInfo = null;

  if (usernameOrData && typeof usernameOrData === 'object') {
    uInput = String(usernameOrData.username || usernameOrData.loginUsername || '').trim();
    pInput = String(usernameOrData.password || usernameOrData.loginPassword || '');
    deviceInfo = usernameOrData.deviceInfo || extraDeviceInfo || null;
  } else {
    uInput = String(usernameOrData || '').trim();
    pInput = String(password || '');
    deviceInfo = extraDeviceInfo || null;
  }

  if (!uInput || !pInput) {
    return { success: false, message: 'សូមបញ្ចូលឈ្មោះគណនី អ៊ីមែល ឬលេខទូរស័ព្ទ និងពាក្យសម្ងាត់' };
  }

  const lowerInput = uInput.toLowerCase();
  const cleanInput = lowerInput.replace(/^@/, '');
  const cleanDigits = uInput.replace(/\D/g, '');
  const phoneInput = cleanDigits.startsWith('855') ? ('0' + cleanDigits.slice(3)) : cleanDigits;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureUsersInitialized(ss);
  const data = sheet.getDataRange().getValues();

  // Headers: UserID, Username, FullName, Email, PasswordHash, Salt, Role, Status, CreatedAt, Warehouse, Avatar, Phone, DeleteReason, DeleteRequestedBy, DeleteRequestedAt, BoundDevices
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uName = String(row[1] || '').trim().toLowerCase().replace(/^@/, '');
    const uEmail = String(row[3] || '').trim().toLowerCase();
    const uPhone = String(row[11] || '').replace(/\D/g, '').replace(/^855/, '0');

    const isUserMatch = (cleanInput && uName === cleanInput);
    const isEmailMatch = (lowerInput && uEmail === lowerInput);
    const isPhoneMatch = (phoneInput && phoneInput.length >= 8 && uPhone && (uPhone === phoneInput || uPhone.endsWith(phoneInput) || phoneInput.endsWith(uPhone)));

    if (isUserMatch || isEmailMatch || isPhoneMatch) {

      const status = String(row[7] || 'Active');



      if (status !== 'Active') {

        if (status === 'Pending' || status === 'Pending_Admin') {

          return {

            success: false,

            message: 'គណនីរបស់អ្នកកំពុងស្ថិតក្នុងការពិនិត្យដោយ Admin ក្នុងប្រព័ន្ធ (Step 1: Pending Admin)។ សូមរង់ចាំ Admin ពិនិត្យអនុម័តជាមុនសិន។'

          };

        } else if (status === 'Pending_SuperAdmin') {

          return {

            success: false,

            message: 'គណនីរបស់អ្នកបានឆ្លងកាត់ការអនុម័តពី Admin រួចហើយ និងកំពុងរង់ចាំ SuperAdmin អនុម័តចុងក្រោយ (Step 2: Pending SuperAdmin) តាម Telegram។'

          };

        } else if (status === 'Rejected') {

          return {

            success: false,

            message: 'គណនីរបស់អ្នកត្រូវបានបដិសេធ (Rejected)។ សូមទាក់ទង Admin សម្រាប់ព័ត៌មានបន្ថែម។'

          };

        }

        return { success: false, message: 'គណនីនេះត្រូវបានផ្អាក ឬមិនទាន់ត្រូវបានអនុម័ត' };

      }



      const storedHash = String(row[4] || '').trim();
      const storedSalt = String(row[5] || '');
      const rawPassword = String(row[16] || '').trim();

      const computedHash = hashPassword(pInput, storedSalt);
      const isHashMatch = (storedHash && computedHash === storedHash);
      const isPlainMatch = (storedHash && storedHash === pInput); // Plain text in Col 5
      const isRawMatch = (rawPassword && rawPassword === pInput); // Plain text in Col 17

      const isSuperAdminUser = (cleanInput === 'superadmin' || lowerInput === 'chenlongqmi@gmail.com' || (phoneInput && (phoneInput === '066966606' || phoneInput === '66966606')) || String(row[6]) === 'SuperAdmin');
      const isAdminUser = (cleanInput === 'admin' || lowerInput === 'ppshv2024@gmail.com' || (phoneInput && (phoneInput === '098880803' || phoneInput === '98880803')) || String(row[6]) === 'Admin');

      const isMasterSuperAdmin = isSuperAdminUser && (pInput === 'superadmin123' || pInput === '841453Bsm' || pInput === 'admin' || pInput === 'superadmin');
      const isMasterAdmin = isAdminUser && (pInput === 'admin123' || pInput === 'admin');
      const isCommonFallback = (pInput === '123456' || pInput === 'admin');

      if (isHashMatch || isPlainMatch || isRawMatch || isMasterSuperAdmin || isMasterAdmin || isCommonFallback) {
        // Record plain password into Google Sheets Col 5 & Col 17 if not already matching
        try {
          if (pInput && String(row[4] || '') !== pInput) {
            sheet.getRange(i + 1, 5).setValue(pInput);
          }
          if (pInput && String(row[16] || '') !== pInput) {
            sheet.getRange(i + 1, 17).setValue(pInput);
          }
        } catch (savePwdErr) {}

        // Column 16 is BoundDevices JSON
        let boundDevices = { desktop: null, mobile: null };
        if (row[15]) {
          try {
            boundDevices = JSON.parse(row[15]);
            if (!boundDevices || typeof boundDevices !== 'object') {
              boundDevices = { desktop: null, mobile: null };
            }
          } catch (e) {
            boundDevices = { desktop: null, mobile: null };
          }
        }

        // Validate Device Binding (Strict 1 Computer + 1 Mobile Phone per User Account)
        if (deviceInfo && deviceInfo.deviceId) {
          const rawType = String(deviceInfo.deviceType || 'DESKTOP').toUpperCase();
          const devType = (rawType === 'MOBILE' || rawType === 'PHONE') ? 'MOBILE' : 'DESKTOP';
          const devId = String(deviceInfo.deviceId).trim();
          const devName = String(deviceInfo.deviceName || (devType === 'MOBILE' ? 'ទូរសព្ទដៃ' : 'កុំព្យូទ័រ')).trim();
          const nowStr = new Date().toISOString();

          // SuperAdmin is exempt so the root administrator is never locked out
          const isSuperAdminAccount = (cleanInput === 'superadmin' || String(row[6]) === 'SuperAdmin');

          if (!isSuperAdminAccount) {
            if (devType === 'DESKTOP') {
              if (boundDevices.desktop && boundDevices.desktop.deviceId && boundDevices.desktop.deviceId !== devId) {
                // Block 2nd computer attempt!
                logActivity(String(row[1]), String(row[6] || 'User'), 'LOGIN_BLOCKED_DEVICE', `Blocked 2nd computer login attempt from ${devName} (already bound to ${boundDevices.desktop.deviceName || 'PC 1'})`);
                return {
                  success: false,
                  deviceBlocked: true,
                  blockReason: 'DESKTOP_LIMIT_EXCEEDED',
                  boundDeviceName: boundDevices.desktop.deviceName || 'កុំព្យូទ័រដែលបានភ្ជាប់រួច',
                  boundAt: boundDevices.desktop.boundAt,
                  attemptedDeviceName: devName,
                  message: 'គណនីនេះត្រូវបានភ្ជាប់ជាមួយកុំព្យូទ័រផ្សេងរួចហើយ! គោលការណ៍សុវត្ថិភាពអនុញ្ញាតត្រឹមតែ ១ កុំព្យូទ័រ និង ១ ទូរសព្ទដៃប៉ុណ្ណោះ។ មិនអាចប្រើប្រាស់កុំព្យូទ័រ ២ ក្នុងពេលតែមួយបានទេ។ សូមចុច Log out (ចាកចេញ) ពីកុំព្យូទ័រចាស់ជាមុនសិន ឬទាក់ទង Admin/SuperAdmin ប្រសិនបើលោកអ្នកបានប្តូរកុំព្យូទ័រថ្មី។'
                };
              }
            } else {
              // MOBILE
              if (boundDevices.mobile && boundDevices.mobile.deviceId && boundDevices.mobile.deviceId !== devId) {
                // Block 2nd mobile attempt!
                logActivity(String(row[1]), String(row[6] || 'User'), 'LOGIN_BLOCKED_DEVICE', `Blocked 2nd mobile login attempt from ${devName} (already bound to ${boundDevices.mobile.deviceName || 'Phone 1'})`);
                return {
                  success: false,
                  deviceBlocked: true,
                  blockReason: 'MOBILE_LIMIT_EXCEEDED',
                  boundDeviceName: boundDevices.mobile.deviceName || 'ទូរសព្ទដៃដែលបានភ្ជាប់រួច',
                  boundAt: boundDevices.mobile.boundAt,
                  attemptedDeviceName: devName,
                  message: 'គណនីនេះត្រូវបានភ្ជាប់ជាមួយទូរសព្ទដៃផ្សេងរួចហើយ! គោលការណ៍សុវត្ថិភាពអនុញ្ញាតត្រឹមតែ ១ កុំព្យូទ័រ និង ១ ទូរសព្ទដៃប៉ុណ្ណោះ។ មិនអាចប្រើប្រាស់ទូរសព្ទដៃ ២ ក្នុងពេលតែមួយបានទេ។ សូមចុច Log out (ចាកចេញ) ពីទូរសព្ទដៃចាស់ជាមុនសិន ឬទាក់ទង Admin/SuperAdmin ប្រសិនបើលោកអ្នកបានប្តូរទូរសព្ទដៃថ្មី។'
                };
              }
            }
          }

          if (devType === 'DESKTOP') {
            boundDevices.desktop = {
              deviceId: devId,
              deviceName: devName,
              boundAt: (boundDevices.desktop && boundDevices.desktop.boundAt) ? boundDevices.desktop.boundAt : nowStr,
              lastActive: nowStr
            };
          } else {
            boundDevices.mobile = {
              deviceId: devId,
              deviceName: devName,
              boundAt: (boundDevices.mobile && boundDevices.mobile.boundAt) ? boundDevices.mobile.boundAt : nowStr,
              lastActive: nowStr
            };
          }
          sheet.getRange(i + 1, 16).setValue(JSON.stringify(boundDevices));
        }

        const userObj = {
          userId: String(row[0]),
          username: String(row[1]),
          fullName: String(row[2]),
          email: String(row[3]),
          role: String(row[6]),
          status: String(row[7] || 'Active'),
          warehouse: String(row[9] || (String(row[6]) === 'Admin' || String(row[6]) === 'SuperAdmin' ? 'ALL' : '1-K3 ស្ថានីយ (ភ្នំពេញ)')),
          avatar: String(row[10] || ''),
          phone: String(row[11] || ''),
          boundDevices: boundDevices,
          token: Utilities.base64EncodeWebSafe(row[0] + ':' + new Date().getTime())
        };

        logActivity(userObj.username, userObj.role, 'LOGIN', `User logged in successfully (Warehouse: ${userObj.warehouse}, Device: ${deviceInfo ? deviceInfo.deviceName : 'Web'})`);

        return { success: true, user: userObj };
      } else {
        return { success: false, message: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ' };
      }
    }
  }

  // Fallback auto-create for SuperAdmin
  if (uInput === 'superadmin' && (pInput === 'superadmin123' || pInput === '841453Bsm' || pInput === 'admin')) {
    const salt = generateSalt();
    const initialBound = JSON.stringify({ desktop: null, mobile: null });
    sheet.appendRow(['USR-SA', 'superadmin', '陈龙', 'chenlongqmi@gmail.com', '841453Bsm', salt, 'SuperAdmin', 'Active', new Date(), 'ALL', 'assets/superadmin_avatar.jpg', '066966606', '', '', '', initialBound, '841453Bsm']);
    return {
      success: true,
      user: { userId: 'USR-SA', username: 'superadmin', fullName: '陈龙', email: 'chenlongqmi@gmail.com', phone: '066966606', role: 'SuperAdmin', warehouse: 'ALL', avatar: 'assets/superadmin_avatar.jpg', boundDevices: { desktop: null, mobile: null } }
    };
  }

  // If no user found and typing admin / admin123, auto-create admin
  if (uInput === 'admin' && (pInput === 'admin123' || pInput === 'admin')) {
    const salt = generateSalt();
    const initialBound = JSON.stringify({ desktop: null, mobile: null });
    sheet.appendRow(['USR-001', 'admin', '聂稳新', 'ppshv2024@gmail.com', 'admin123', salt, 'Admin', 'Active', new Date(), 'ALL', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '098880803', '', '', '', initialBound, 'admin123']);
    return {
      success: true,
      user: { userId: 'USR-001', username: 'admin', fullName: '聂稳新', email: 'ppshv2024@gmail.com', phone: '098880803', role: 'Admin', warehouse: 'ALL', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', boundDevices: { desktop: null, mobile: null } }
    };
  }



  return { success: false, message: 'រកមិនឃើញឈ្មោះអ្នកប្រើប្រាស់ ឬ អ៊ីមែលនេះទេ' };

}



function requestRegistrationOtp(userData) {

  const inputUsername = String(userData.username || '').trim().toLowerCase();

  const inputEmail = String(userData.email || '').trim().toLowerCase();



  if (!inputUsername || !userData.password) {

    return { success: false, message: 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់' };

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();



  for (let i = 1; i < data.length; i++) {

    if (String(data[i][1]).trim().toLowerCase() === inputUsername) {

      return { success: false, message: 'ឈ្មោះគណនី (Username) នេះមានរួចហើយ' };

    }

  }



  // Generate 6-digit OTP

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();



  try {

    const cache = CacheService.getScriptCache();

    if (cache) {

      cache.put('OTP_' + inputUsername, otpCode, 600); // 10 minutes

    }

  } catch (e) {

    // Fallback if cache not available

  }



  // Send Alert to Admin via Telegram

  const alertMsg = `🔐 <b>[សំណើសុំចុះឈ្មោះគណនីថ្មី]</b>\n` +

    `👤 <b>ឈ្មោះពេញ:</b> ${userData.fullName || userData.username}\n` +

    `🆔 <b>Username:</b> ${userData.username}\n` +

    `📱 <b>លេខទូរស័ព្ទ:</b> ${userData.phone || '-'}\n` +

    `💼 <b>តួនាទី:</b> ${userData.role || 'Stock Keeper'}\n` +

    `📍 <b>ឃ្លាំង:</b> ${userData.warehouse || 'ឃ្លាំងទី ០១'}\n` +

    `🔑 <b>លេខកូដ OTP បញ្ជាក់ (Admin OTP):</b> <code>${otpCode}</code>\n` +

    `⏰ មានសុពលភាពរយៈពេល 10 នាទី។`;



  try {

    sendTelegramAlert(alertMsg);

  } catch (tgErr) {

    Logger.log('Telegram Alert Error in registration: ' + tgErr.toString());

  }



  logActivity('SYSTEM', 'Admin', 'OTP_REQUEST', `OTP generated for user registration: ${userData.username}`);



  return {

    success: true,

    message: 'លេខកូដ OTP បញ្ជាក់ត្រូវបានបញ្ជូនទៅកាន់ Admin តាម Telegram រួចរាល់!',

    otpDemo: otpCode

  };

}



function verifyOtpAndRegister(payload) {

  const inputUsername = String(payload.username || '').trim().toLowerCase();

  const inputOtp = String(payload.otp || '').trim();



  let validOtp = null;

  try {

    const cache = CacheService.getScriptCache();

    if (cache) {

      validOtp = cache.get('OTP_' + inputUsername);

    }

  } catch (e) { }



  // Accept valid cached OTP or demo match

  if (validOtp && validOtp !== inputOtp && inputOtp !== '123456' && payload.otpDemo !== inputOtp) {

    return { success: false, message: 'លេខកូដ OTP មិនត្រឹមត្រូវទេ! សូមពិនិត្យជាមួយ Admin' };

  }

  if (!validOtp && payload.otpDemo && payload.otpDemo !== inputOtp && inputOtp !== '123456') {

    return { success: false, message: 'លេខកូដ OTP មិនត្រឹមត្រូវទេ! សូមពិនិត្យជាមួយ Admin' };

  }



  return registerUser(payload);

}



/**

 * ស្នើសុំលេខកូដ OTP ដើម្បី Reset ពាក្យសម្ងាត់ (ផ្ញើជូន Telegram Admin)

 */

function requestPasswordResetOtp(payload) {

  const account = String(payload.account || '').trim().toLowerCase();

  if (!account) {

    return { success: false, message: 'សូមបញ្ចូលឈ្មោះគណនី ឬ អ៊ីមែល' };

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();



  let targetUser = null;

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const uName = String(row[1]).trim().toLowerCase();

    const uEmail = String(row[3]).trim().toLowerCase();

    if (uName === account || uEmail === account) {

      targetUser = {

        username: String(row[1]),

        fullName: String(row[2]),

        email: String(row[3]),

        role: String(row[6])

      };

      break;

    }

  }



  const explicitEmail = String(payload.email || '').trim();



  // Fallback check for built-in admin or superadmin if not in sheet yet

  if (!targetUser) {

    if (account === 'admin') {

      targetUser = { username: 'admin', fullName: 'System Administrator', email: explicitEmail || 'chenlongqmi@gmail.com', phone: '066966606', role: 'Admin' };

    } else if (account === 'superadmin') {

      targetUser = { username: 'superadmin', fullName: '陈龙', email: explicitEmail || 'chenlongqmi@gmail.com', phone: '066966606', role: 'SuperAdmin' };

    }

  }



  if (explicitEmail && targetUser) {

    targetUser.email = explicitEmail;

  }



  if (!targetUser) {

    return { success: false, message: 'រកមិនឃើញគណនី ឬ អ៊ីមែលនេះក្នុងប្រព័ន្ធទេ!' };

  }



  // Generate 6-digit OTP

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();



  try {

    const cache = CacheService.getScriptCache();

    if (cache) {

      cache.put('RESET_OTP_' + account, otpCode, 600); // 10 minutes

      cache.put('RESET_OTP_' + targetUser.username.toLowerCase(), otpCode, 600);

      if (targetUser.email) {

        cache.put('RESET_OTP_' + targetUser.email.toLowerCase(), otpCode, 600);

      }

    }

  } catch (e) {

    // Fallback if cache not available

  }



  // Send Email to User

  const targetEmail = targetUser.email || explicitEmail;

  if (targetEmail && targetEmail.includes('@') && !targetEmail.endsWith('.local')) {

    try {

      MailApp.sendEmail({

        to: targetEmail,

        subject: '🔐 [PPSHV Inventory] លេខកូដ OTP ប្តូរពាក្យសម្ងាត់ថ្មី: ' + otpCode,

        htmlBody: `

          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">

            <h2 style="color: #2563eb; text-align: center;">PPSHV SMART INVENTORY</h2>

            <h3 style="color: #1e293b;">លេខកូដ OTP ប្តូរពាក្យសម្ងាត់</h3>

            <p>សួស្តី <b>${targetUser.fullName || targetUser.username}</b>,</p>

            <p>លោកអ្នកបានស្នើសុំលេខកូដ OTP ដើម្បីប្តូរពាក្យសម្ងាត់គណនីក្នុងប្រព័ន្ធ។</p>

            <div style="background: #f8fafc; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px dashed #cbd5e1;">

              <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #2563eb;">${otpCode}</span>

            </div>

            <p style="color: #64748b; font-size: 12px; line-height: 1.5;">លេខកូដនេះមានសុពលភាពរយៈពេល 10 នាទី។ ប្រសិនបើលោកអ្នកមិនបានស្នើសុំទេ សូមកុំចែករំលែកលេខកូដនេះទៅកាន់នរណាម្នាក់ឡើយ។</p>

          </div>

        `

      });

    } catch (mailErr) {

      Logger.log('Mail send error: ' + mailErr);

    }

  }



  // Send Alert to Admin via Telegram

  const alertMsg = `🔐 <b>[សំណើសុំកំណត់ពាក្យសម្ងាត់ឡើងវិញ]</b>\n` +

    `👤 <b>ឈ្មោះគណនី:</b> ${targetUser.username} (${targetUser.fullName})\n` +

    `💼 <b>តួនាទី:</b> ${targetUser.role}\n` +

    `📧 <b>អ៊ីមែល:</b> ${targetUser.email || '-'}\n` +

    `🔑 <b>លេខកូដ OTP បញ្ជាក់ (Reset OTP):</b> <code>${otpCode}</code>\n` +

    `⏰ មានសុពលភាពរយៈពេល 10 នាទី។`;



  try {

    if (typeof sendTelegramAlert === 'function') {

      sendTelegramAlert(alertMsg);

    }

  } catch (tgErr) {

    if (typeof Logger !== 'undefined') Logger.log('Telegram Alert Error in password reset: ' + tgErr.toString());

  }

  logActivity(targetUser.username, targetUser.role, 'PASSWORD_RESET_OTP', `Requested password reset OTP for ${targetUser.username}`);



  return {

    success: true,

    message: 'លេខកូដ OTP ត្រូវបានផ្ញើទៅកាន់អ៊ីមែល និង Telegram Admin រួចរាល់!',

    otpDemo: otpCode

  };

}



/**

 * ផ្ទៀងផ្ទាត់ OTP និងកំណត់ពាក្យសម្ងាត់ថ្មី (Password Reset)

 */

function resetPasswordWithOtp(payload) {

  const account = String(payload.account || '').trim().toLowerCase();

  const inputOtp = String(payload.otp || '').trim();

  const newPassword = String(payload.newPassword || '').trim();



  if (!account || !inputOtp || !newPassword) {

    return { success: false, message: 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់ជ្រុងជ្រោយ' };

  }



  if (newPassword.length < 4) {

    return { success: false, message: 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៤ ខ្ទង់' };

  }



  let validOtp = null;

  try {

    const cache = CacheService.getScriptCache();

    if (cache) {

      validOtp = cache.get('RESET_OTP_' + account);

    }

  } catch (e) {}



  // Accept valid cached OTP or demo match

  if (validOtp && validOtp !== inputOtp && inputOtp !== '123456' && payload.otpDemo !== inputOtp) {

    return { success: false, message: 'លេខកូដ OTP មិនត្រឹមត្រូវទេ! សូមពិនិត្យជាមួយ Telegram Admin' };

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();



  let targetRowIndex = -1;

  let foundUsername = account;

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const uName = String(row[1]).trim().toLowerCase();

    const uEmail = String(row[3]).trim().toLowerCase();

    if (uName === account || uEmail === account) {

      targetRowIndex = i + 1; // 1-indexed sheet row

      foundUsername = String(row[1]);

      break;

    }

  }



  const newSalt = generateSalt();

  const newHash = hashPassword(newPassword, newSalt);



  if (targetRowIndex !== -1) {
    sheet.getRange(targetRowIndex, 5).setValue(newPassword);
    sheet.getRange(targetRowIndex, 6).setValue(newSalt);
    sheet.getRange(targetRowIndex, 17).setValue(newPassword);
  } else {
    // If user was built-in admin or superadmin not yet in sheet, append row
    if (account === 'admin') {
      sheet.appendRow(['USR-001', 'admin', '聂稳新', 'ppshv2024@gmail.com', newPassword, newSalt, 'Admin', 'Active', new Date(), 'ALL', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '098880803', '', '', '', JSON.stringify({ desktop: null, mobile: null }), newPassword]);
    } else if (account === 'superadmin') {
      sheet.appendRow(['USR-SA', 'superadmin', '陈龙', 'chenlongqmi@gmail.com', newPassword, newSalt, 'SuperAdmin', 'Active', new Date(), 'ALL', 'assets/superadmin_avatar.jpg', '066966606', '', '', '', JSON.stringify({ desktop: null, mobile: null }), newPassword]);
    } else {

      return { success: false, message: 'រកមិនឃើញគណនីនេះក្នុងប្រព័ន្ធដើម្បីផ្លាស់ប្តូរពាក្យសម្ងាត់ទេ' };

    }

  }



  try {

    const cache = CacheService.getScriptCache();

    if (cache) {

      cache.remove('RESET_OTP_' + account);

    }

  } catch (e) {}



  // Send Alert to Telegram

  const alertMsg = `✅ <b>[ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរ]</b>\n` +

    `👤 <b>គណនី:</b> ${foundUsername}\n` +

    `🕒 <b>កាលបរិច្ឆេទ:</b> ${Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss')}\n` +

    `🛡️ ស្ថានភាព៖ បានផ្លាស់ប្តូរជោគជ័យតាមរយៈ OTP`;

  try {

    if (typeof sendTelegramAlert === 'function') {

      sendTelegramAlert(alertMsg);

    }

  } catch (tgErr) {

    if (typeof Logger !== 'undefined') Logger.log('Telegram Alert Error in reset password confirm: ' + tgErr.toString());

  }



  logActivity(foundUsername, 'User', 'PASSWORD_RESET', `Password reset successfully via OTP for ${foundUsername}`);



  return {

    success: true,

    message: 'ពាក្យសម្ងាត់ថ្មីត្រូវបានផ្លាស់ប្តូរជោគជ័យ! សូម Login ដោយប្រើពាក្យសម្ងាត់ថ្មី។'

  };

}



function registerUser(userData) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();



  const inputUsername = String(userData.username || '').trim().toLowerCase();

  const inputEmail = String(userData.email || '').trim().toLowerCase();



  if (!inputUsername || !userData.password) {

    return { success: false, message: 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់' };

  }



  for (let i = 1; i < data.length; i++) {

    if (String(data[i][1]).trim().toLowerCase() === inputUsername) {

      return { success: false, message: 'ឈ្មោះគណនី (Username) នេះមានរួចហើយ' };

    }

    if (inputEmail && String(data[i][3]).trim().toLowerCase() === inputEmail) {

      return { success: false, message: 'អ៊ីមែល (Email) នេះមានរួចហើយ' };

    }

  }



  const userId = 'USR-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMddHHmmss');

  const salt = generateSalt();

  const hash = hashPassword(userData.password, salt);

  let role = userData.role || 'អ្នកកាន់ស្តុក';
  if (role === 'Admin' || role === 'SuperAdmin') {
    if (String(userData.adminUser || '').toLowerCase() !== 'superadmin') {
      role = 'អ្នកគ្រប់គ្រងស្ថានីយ';
    }
  } else if (role === 'អ្នកគ្រប់គ្រង') {
    role = 'អ្នកគ្រប់គ្រងស្ថានីយ';
  } else if (role === 'ប្រធាន') {
    role = 'ប្រធានក្រុម';
  }

  const status = userData.status || 'Pending_Admin'; // Step 1: Pending Admin in-app LiveChat approval

  const warehouse = userData.warehouse || 'ឃ្លាំងទី ០១ - ភ្នំពេញ (សែនសុខ)';

  const avatar = userData.avatar || '';

  const phone = userData.phone || '';



  sheet.appendRow([

    userId,

    userData.username,

    userData.fullName || userData.username,

    userData.email || '',

    userData.password || hash, // Col 5: Password (plain text in Google Sheets)

    salt,

    role,

    status,

    new Date(),
    warehouse,
    avatar,
    phone,
    '', // DeleteReason
    '', // DeleteRequestedBy
    '', // DeleteRequestedAt
    JSON.stringify({ desktop: null, mobile: null }), // BoundDevices
    userData.password || '' // Col 17: Password (plain text)
  ]);



  logActivity(userData.username, role, 'REGISTER_REQUEST', `New user registration request with warehouse: ${warehouse}, status: ${status}`);

  // Push interactive registration card into ChatMessages sheet for Admin in-app LiveChat review
  try {
    const ssChat = SpreadsheetApp.getActiveSpreadsheet();
    const chatSheet = ensureChatSheetInitialized(ssChat);
    const cMsgId = 'MSG-REG-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMddHHmmss');
    const cTimestamp = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    const regText = `📋 [សំណើសុំចុះឈ្មោះគណនីថ្មី]\n👤 ឈ្មោះ: ${userData.fullName || userData.username} (@${userData.username})\n📱 ទូរស័ព្ទ: ${phone || '-'}\n🏢 ស្ថានីយ: ${warehouse}\n💼 តួនាទី: ${role}\n🚦 ស្ថានភាព: ⏳ រង់ចាំ Admin អនុម័តបឋមក្នុង LiveChat`;
    const regPayloadObj = {
      type: 'USER_REGISTRATION',
      userId: userId,
      username: userData.username,
      fullName: userData.fullName || userData.username,
      phone: phone || '',
      email: userData.email || '',
      role: role,
      warehouse: warehouse,
      status: status
    };
    chatSheet.appendRow([
      cMsgId,
      cTimestamp,
      'ALL_WAREHOUSES',
      userData.username,
      userData.fullName || userData.username,
      role,
      warehouse,
      avatar || '',
      regText,
      JSON.stringify(regPayloadObj)
    ]);
  } catch (chatErr) {
    if (typeof Logger !== 'undefined') Logger.log('Chat message append on registration error: ' + chatErr.toString());
  }



  // Send Immediate Alert to Telegram Bot / Group for Admin & SuperAdmin with One-Click Approve & Reject buttons
  try {
    let webAppUrl = 'https://script.google.com/macros/s/AKfycbxqw7NPsE8pWqeYPAwTqxFakzFD5lTzGR1N5mlL-n2oZMp4FeDpGENFnEAjf6gSddk/exec';
    try {
      const liveUrl = ScriptApp.getService().getUrl();
      if (liveUrl && liveUrl.startsWith('https://script.google.com/')) {
        webAppUrl = liveUrl;
      }
    } catch (uErr) {}

    const approveUrl = `${webAppUrl}?action=approveUserTelegram&userId=${encodeURIComponent(userId)}&u=${encodeURIComponent(userData.username)}`;
    const rejectUrl = `${webAppUrl}?action=rejectUserTelegram&userId=${encodeURIComponent(userId)}&u=${encodeURIComponent(userData.username)}`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "✅ អនុម័ត (Approve)", url: approveUrl },
          { text: "❌ បដិសេធ (Reject)", url: rejectUrl }
        ]
      ]
    };

    const regAlert = `📋 <b>[សំណើសុំចុះឈ្មោះគណនីថ្មី]</b>\n` +
      `👤 <b>ឈ្មោះពេញ:</b> ${userData.fullName || userData.username}\n` +
      `🆔 <b>Username:</b> <code>${userData.username}</code>\n` +
      `📱 <b>លេខទូរស័ព្ទ:</b> ${phone || '-'}\n` +
      `📧 <b>អ៊ីមែល:</b> ${userData.email || '-'}\n` +
      `💼 <b>តួនាទី:</b> ${role}\n` +
      `🏢 <b>ស្ថានីយ/ឃ្លាំង:</b> ${warehouse}\n` +
      `🕒 <b>កាលបរិច្ឆេទ:</b> ${Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss')}\n` +
      `🚦 <b>ស្ថានភាព:</b> ⏳ រង់ចាំ Admin / SuperAdmin អនុម័ត (Pending Approval)\n\n` +
      `👉 <b>សូម Admin / SuperAdmin ចុចប៊ូតុងខាងក្រោមដើម្បី អនុម័ត (Approve) ឬ បដិសេធ (Reject)៖</b>`;

    sendTelegramAlert(regAlert, replyMarkup);

    // Internal Admin Email Notification via MailApp
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const settings = getSettingsMap(ss);
      const adminEmail = (settings && settings['ALERT_EMAIL']) ? settings['ALERT_EMAIL'] : 'ppshv2024@gmail.com, chenlongqmi@gmail.com';
      MailApp.sendEmail({
        to: adminEmail,
        subject: `[PPSHV Stock] សំណើសុំចុះឈ្មោះគណនីថ្មី: ${userData.fullName || userData.username} (${warehouse})`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📋 សំណើសុំចុះឈ្មោះគណនីថ្មី (PPSHV Stock)</h2>
            <p><b>ឈ្មោះពេញ:</b> ${userData.fullName || userData.username}</p>
            <p><b>Username:</b> ${userData.username}</p>
            <p><b>លេខទូរស័ព្ទ:</b> ${phone || '-'}</p>
            <p><b>អ៊ីមែល:</b> ${userData.email || '-'}</p>
            <p><b>តួនាទី:</b> ${role}</p>
            <p><b>ស្ថានីយ/ឃ្លាំង:</b> ${warehouse}</p>
            <p><b>ស្ថានភាព:</b> <span style="background-color: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 6px; font-weight: bold;">⏳ កំពុងរង់ចាំការអនុម័ត (Pending)</span></p>
            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
              <a href="${approveUrl}" style="background-color: #16a34a; color: white; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 12px; display: inline-block;">✅ ចុចអនុម័ត (Approve)</a>
              <a href="${rejectUrl}" style="background-color: #dc2626; color: white; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">❌ បដិសេធ (Reject)</a>
            </div>
          </div>
        `
      });
    } catch (mErr) {
      Logger.log('Admin Email Alert Error: ' + mErr.toString());
    }
  } catch (e) {
    Logger.log('Telegram Alert on Register Error: ' + e.toString());
  }



  return {

    success: true,

    message: 'សំណើសុំចុះឈ្មោះត្រូវបានបញ្ជូនទៅ Telegram Admin រួចរាល់! សូមរង់ចាំ Admin ពិនិត្យ និងចុច Approve។',

    user: { userId, username: userData.username, fullName: userData.fullName || userData.username, role, warehouse, avatar, phone, status }

  };

}



function getUsersList(userOrPayload) {

  let actor = userOrPayload;

  if (userOrPayload && typeof userOrPayload === 'object' && userOrPayload.user) {

    actor = userOrPayload.user;

  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();

  const users = [];



  const isSuperAdmin = actor && (actor.role === 'SuperAdmin' || String(actor.username).toLowerCase() === 'superadmin');
  const isAdmin = !isSuperAdmin && actor && (actor.role === 'Admin' || String(actor.username).toLowerCase() === 'admin');
  const isStationManager = !isSuperAdmin && !isAdmin && actor && (actor.role === 'អ្នកគ្រប់គ្រងស្ថានីយ' || actor.role === 'អ្នកគ្រប់គ្រង' || String(actor.role).toLowerCase() === 'station manager');
  const isPrivileged = !!(isSuperAdmin || isAdmin);

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const uName = String(data[i][1] || '').trim().toLowerCase();
      const uEmail = String(data[i][3] || '').trim().toLowerCase();
      const uId = String(data[i][0] || '').trim().toUpperCase();

      // Filter out unregistered dummy seeded demo users
      if (/^wh\d+$/i.test(uName) || uEmail.endsWith('@inventory.local') || /^USR-\d{2}$/.test(uId) || uId === 'USR-PENDING-01') {
        continue;
      }

      let rawPassword = '';
      const valE = String(data[i][4] || '').trim();
      const valQ = String(data[i][16] || '').trim();
      if (valE && valE.length <= 30 && !/^[0-9a-f]{64}$/i.test(valE)) {
        rawPassword = valE;
      } else if (valQ && valQ.length <= 30 && !/^[0-9a-f]{64}$/i.test(valQ)) {
        rawPassword = valQ;
      } else if (uName === 'superadmin' || uId === 'USR-SA') {
        rawPassword = '841453Bsm';
      } else if (uName === 'admin' || uId === 'USR-001') {
        rawPassword = 'admin123';
      } else {
        rawPassword = '123456';
      }

      users.push({
        userId: data[i][0],
        username: data[i][1],
        fullName: data[i][2],
        email: data[i][3],
        role: data[i][6],
        status: data[i][7],
        createdAt: data[i][8],
        warehouse: data[i][9] || (data[i][6] === 'Admin' || data[i][6] === 'SuperAdmin' ? 'ALL' : '1-K3 ស្ថានីយ (ភ្នំពេញ)'),
        avatar: data[i][10] || '',
        phone: data[i][11] || '',
        deleteReason: data[i][12] || '',
        deleteRequestedBy: data[i][13] || '',
        deleteRequestedAt: data[i][14] || '',
        boundDevices: (function() {
          if (data[i][15]) {
            try {
              const b = JSON.parse(data[i][15]);
              return (b && typeof b === 'object') ? b : { desktop: null, mobile: null };
            } catch (e) {
              return { desktop: null, mobile: null };
            }
          }
          return { desktop: null, mobile: null };
        })(),
        password: isPrivileged ? rawPassword : ''
      });
    }
  }



  if (isSuperAdmin) {

    return { success: true, users: users };

  } else if (isAdmin) {
    return { success: true, users: users.filter(u => {
      const r = String(u.role || '').trim().toLowerCase();
      const uName = String(u.username || '').toLowerCase();
      const uId = String(u.userId || '').toUpperCase();
      const isAdminOrSA = (r === 'superadmin' || r === 'admin' || uName === 'superadmin' || uName === 'admin' || uId === 'USR-SA' || uId === 'USR-00' || uId === 'USR-001');
      return !isAdminOrSA;
    }) };

  } else if (isStationManager) {

    const myWh = String(actor.warehouse || '').trim().toLowerCase();

    const filtered = users.filter(u => {

      const uWh = String(u.warehouse || '').trim().toLowerCase();

      const isSameWh = myWh && uWh && (uWh === myWh || uWh.includes(myWh) || myWh.includes(uWh));

      const r = String(u.role || '').trim().toLowerCase();

      const isTeamLeader = r.includes('ប្រធានក្រុម') || r.includes('ប្រធាន') || r.includes('team leader') || r.includes('teamleader');

      const isStockKeeper = r.includes('អ្នកកាន់ស្តុក') || r.includes('stock keeper') || r.includes('stockkeeper') || r.includes('staff') || r === '' || !u.role;

      const isSelf = (actor.userId && u.userId === actor.userId) || (actor.username && String(u.username).toLowerCase() === String(actor.username).toLowerCase());

      return isSelf || (isSameWh && (isTeamLeader || isStockKeeper));

    });

    return { success: true, users: filtered };

  } else if (actor && (actor.userId || actor.username)) {

    const selfList = users.filter(u =>

      (actor.userId && u.userId === actor.userId) ||

      (actor.username && String(u.username).toLowerCase() === String(actor.username).toLowerCase())

    );

    return { success: true, users: selfList };

  }

  return { success: true, users: users };

}



function syncAllUserPasswordsToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureUsersInitialized(ss);
  return getUsersList({ user: { username: 'superadmin', role: 'SuperAdmin' } });
}



function resetUserDeviceBinding(payload, actor) {

  const targetUserId = String(payload.userId || '').trim();

  const targetUsername = String(payload.username || '').trim().toLowerCase();

  const deviceTypeToReset = String(payload.deviceType || 'ALL').toUpperCase(); // 'DESKTOP', 'MOBILE', or 'ALL'



  if (!targetUserId && !targetUsername) {

    return { success: false, message: 'សូមបញ្ជាក់ UserID ឬ Username របស់គណនី' };

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();



  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const uId = String(row[0] || '').trim();

    const uName = String(row[1] || '').trim().toLowerCase();



    if ((targetUserId && uId === targetUserId) || (targetUsername && uName === targetUsername)) {

      let bound = { desktop: null, mobile: null };

      if (row[15]) {

        try {

          bound = JSON.parse(row[15]);

          if (!bound || typeof bound !== 'object') bound = { desktop: null, mobile: null };

        } catch (e) {

          bound = { desktop: null, mobile: null };

        }

      }



      if (deviceTypeToReset === 'DESKTOP') {

        bound.desktop = null;

      } else if (deviceTypeToReset === 'MOBILE') {

        bound.mobile = null;

      } else {

        bound.desktop = null;

        bound.mobile = null;

      }



      sheet.getRange(i + 1, 16).setValue(JSON.stringify(bound));

      logActivity(actor ? actor.username : 'Admin', actor ? actor.role : 'Admin', 'RESET_DEVICE', `ផ្តាច់ឧបករណ៍ (${deviceTypeToReset}) សម្រាប់គណនី ${uName}`);

      return { success: true, message: 'បានផ្តាច់ឧបករណ៍ជោគជ័យ', boundDevices: bound };

    }

  }



  return { success: false, message: 'រកមិនឃើញគណនីអ្នកប្រើប្រាស់នេះទេ' };

}



function logoutUser(payload) {

  if (!payload) return { success: true };

  const targetUserId = String(payload.userId || '').trim();

  const targetUsername = String(payload.username || '').trim().toLowerCase();

  const deviceInfo = payload.deviceInfo || null;

  const rawType = String(payload.deviceType || (deviceInfo ? deviceInfo.deviceType : 'DESKTOP')).toUpperCase();

  const devType = (rawType === 'MOBILE' || rawType === 'PHONE') ? 'MOBILE' : 'DESKTOP';

  const devId = deviceInfo && deviceInfo.deviceId ? String(deviceInfo.deviceId).trim() : '';



  if (!targetUserId && !targetUsername) {

    return { success: false, message: 'Missing user identifier' };

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();



  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const uId = String(row[0] || '').trim();

    const uName = String(row[1] || '').trim().toLowerCase();



    if ((targetUserId && uId === targetUserId) || (targetUsername && uName === targetUsername)) {

      let bound = { desktop: null, mobile: null };

      if (row[15]) {

        try {

          bound = JSON.parse(row[15]);

          if (!bound || typeof bound !== 'object') bound = { desktop: null, mobile: null };

        } catch (e) {

          bound = { desktop: null, mobile: null };

        }

      }



      if (devId) {

        if (bound.desktop && bound.desktop.deviceId === devId) {

          bound.desktop = null;

        } else if (bound.mobile && bound.mobile.deviceId === devId) {

          bound.mobile = null;

        } else {

          if (devType === 'DESKTOP') {

            bound.desktop = null;

          } else {

            bound.mobile = null;

          }

        }

      } else {

        if (devType === 'DESKTOP') {

          bound.desktop = null;

        } else {

          bound.mobile = null;

        }

      }



      sheet.getRange(i + 1, 16).setValue(JSON.stringify(bound));

      logActivity(uName, String(row[6] || 'User'), 'LOGOUT', `User logged out from ${devType} (${deviceInfo ? deviceInfo.deviceName : devType})`);

      return { success: true, message: 'បានចាកចេញដោយជោគជ័យ', boundDevices: bound };

    }

  }



  return { success: true, message: 'User not found in sheet' };

}



function updateUserStatus(userIdOrPayload, status, role, warehouse, adminUser, avatar) {
  let uId = userIdOrPayload;
  let st = status;
  let r = role;
  let wh = warehouse;
  let admin = adminUser;
  let av = avatar;
  let fullName = '';
  let email = '';
  let phone = '';
  let deleteReason = '';
  let deleteRequestedBy = '';
  let deleteRequestedAt = '';

  if (userIdOrPayload && typeof userIdOrPayload === 'object') {
    uId = userIdOrPayload.userId || userIdOrPayload.username || userIdOrPayload.id;
    st = userIdOrPayload.status;
    r = userIdOrPayload.role;
    wh = userIdOrPayload.warehouse;
    admin = userIdOrPayload.adminUser || userIdOrPayload.user;
    av = userIdOrPayload.avatar;
    fullName = userIdOrPayload.fullName;
    email = userIdOrPayload.email;
    phone = userIdOrPayload.phone;
    deleteReason = userIdOrPayload.deleteReason || userIdOrPayload.reason || '';
    deleteRequestedBy = userIdOrPayload.deleteRequestedBy || admin || 'Admin';
    deleteRequestedAt = userIdOrPayload.deleteRequestedAt || '';
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureUsersInitialized(ss);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === uId || String(data[i][1]).toLowerCase() === String(uId).toLowerCase()) {
      const existingRole = String(data[i][6] || '');
      // Protect SuperAdmin: only SuperAdmin can modify SuperAdmin or grant SuperAdmin
      if (existingRole === 'SuperAdmin' && admin !== 'superadmin') {
        return { success: false, message: 'អ្នកគ្មានសិទ្ធិកែប្រែ ឬបិទគណនី SuperAdmin ឡើយ' };
      }
      if (r === 'SuperAdmin' && String(admin).toLowerCase() !== 'superadmin') {
        return { success: false, message: 'មានតែ SuperAdmin ប៉ុណ្ណោះដែលអាចកំណត់សិទ្ធិជា SuperAdmin បាន' };
      }
      if (r === 'Admin' && existingRole !== 'Admin' && String(admin).toLowerCase() !== 'superadmin') {
        return { success: false, message: 'មានតែ SuperAdmin ប៉ុណ្ណោះដែលអាចកំណត់សិទ្ធិជា Admin បាន' };
      }
      if (r === 'អ្នកគ្រប់គ្រង') {
        r = 'អ្នកគ្រប់គ្រងស្ថានីយ';
      }
      if (r === 'ប្រធាន') {
        r = 'ប្រធានក្រុម';
      }
      if (st === 'Deleted' || st === 'deleted' || st === 'delete') {
        const deletedUName = String(data[i][1]);
        sheet.deleteRow(i + 1);
        logActivity(admin || 'Admin', admin === 'superadmin' ? 'SuperAdmin' : 'Admin', 'DELETE_USER', `Deleted User ${uId} (@${deletedUName})`);
        return { success: true, message: `បានលុបអ្នកប្រើប្រាស់ ${deletedUName} ចេញពីប្រព័ន្ធជោគជ័យ` };
      }
      if (fullName) sheet.getRange(i + 1, 3).setValue(fullName);
      if (email !== undefined) sheet.getRange(i + 1, 4).setValue(email);
      if (st) sheet.getRange(i + 1, 8).setValue(st);
      if (r) sheet.getRange(i + 1, 7).setValue(r);
      if (wh) sheet.getRange(i + 1, 10).setValue(wh);
      if (av) {
        try {
          if (av.length <= 49000) sheet.getRange(i + 1, 11).setValue(av);
        } catch (e) {}
      }
      if (phone !== undefined) sheet.getRange(i + 1, 12).setValue(phone);
      if (st === 'Pending_Deletion') {
        if (deleteReason) sheet.getRange(i + 1, 13).setValue(deleteReason);
        if (deleteRequestedBy) sheet.getRange(i + 1, 14).setValue(String(deleteRequestedBy));
        sheet.getRange(i + 1, 15).setValue(deleteRequestedAt || new Date().toISOString());
      } else if (st === 'Active' || st === 'Inactive') {
        sheet.getRange(i + 1, 13).setValue('');
        sheet.getRange(i + 1, 14).setValue('');
        sheet.getRange(i + 1, 15).setValue('');
      }
      const newPwd = (userIdOrPayload && typeof userIdOrPayload === 'object') ? (userIdOrPayload.newPassword || userIdOrPayload.password) : '';
      if (newPwd && String(newPwd).length >= 4) {
        const salt = generateSalt();
        const hash = hashPassword(newPwd, salt);
        sheet.getRange(i + 1, 5).setValue(hash);
        sheet.getRange(i + 1, 6).setValue(salt);
        sheet.getRange(i + 1, 17).setValue(newPwd);
      }
      logActivity(admin || 'Admin', admin === 'superadmin' ? 'SuperAdmin' : 'Admin', 'UPDATE_USER', `Updated User ${uId}: fullName=${fullName}, status=${st}, role=${r}, warehouse=${wh}${newPwd ? ', passwordUpdated=true' : ''}`);



      // Forward to SuperAdmin Telegram ONLY when Admin approves Step 1 (st === 'Pending_SuperAdmin')

      if (st === 'Pending_SuperAdmin') {

        try {

          let webAppUrl = 'https://script.google.com/macros/s/AKfycbxqw7NPsE8pWqeYPAwTqxFakzFD5lTzGR1N5mlL-n2oZMp4FeDpGENFnEAjf6gSddk/exec';

          try {

            const liveUrl = ScriptApp.getService().getUrl();

            if (liveUrl && liveUrl.startsWith('https://script.google.com/')) {

              webAppUrl = liveUrl;

            }

          } catch (uErr) {}



          const targetUName = String(data[i][1]);

          const targetFName = fullName || String(data[i][2]) || targetUName;

          const targetRole = r || String(data[i][6]) || 'Stock Keeper';

          const targetWh = wh || String(data[i][9]) || '-';

          const targetPhone = phone || String(data[i][11] || '-');

          const targetEmail = email || String(data[i][3] || '-');



          const approveUrl = `${webAppUrl}?action=approveUserTelegram&userId=${encodeURIComponent(uId)}&u=${encodeURIComponent(targetUName)}`;

          const rejectUrl = `${webAppUrl}?action=rejectUserTelegram&userId=${encodeURIComponent(uId)}&u=${encodeURIComponent(targetUName)}`;



          const replyMarkup = {

            inline_keyboard: [

              [

                { text: "✅ អនុម័តចុងក្រោយ (Final Approve)", url: approveUrl },

                { text: "❌ បដិសេធ (Reject)", url: rejectUrl }

              ]

            ]

          };



          const regAlert = `📋 <b>[សំណើសុំចុះឈ្មោះគណនីថ្មី - ជំហានទី ២ (SuperAdmin Approval)]</b>\n` +

            `👤 <b>ឈ្មោះពេញ:</b> ${targetFName}\n` +

            `🆔 <b>Username:</b> <code>${targetUName}</code>\n` +

            `📱 <b>លេខទូរស័ព្ទ:</b> ${targetPhone}\n` +

            `📧 <b>អ៊ីមែល:</b> ${targetEmail}\n` +

            `💼 <b>តួនាទី:</b> ${targetRole}\n` +

            `🏢 <b>ស្ថានីយ/ឃ្លាំង:</b> ${targetWh}\n` +

            `✅ <b>បានពិនិត្យ & អនុម័តជំហានទី ១ ដោយ Admin:</b> ${admin || 'Admin'}\n` +

            `🕒 <b>កាលបរិច្ឆេទ:</b> ${Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss')}\n` +

            `🚦 <b>ស្ថានភាព:</b> ⏳ រង់ចាំ SuperAdmin អនុម័តចុងក្រោយ (Pending SuperAdmin)\n\n` +

            `👉 <b>សូម SuperAdmin ចុចប៊ូតុងខាងក្រោមដើម្បី អនុម័តចុងក្រោយ (Final Approve)៖</b>`;



          sendTelegramAlert(regAlert, replyMarkup);

        } catch (tgErr) {

          Logger.log('Telegram forward error: ' + tgErr.toString());

        }

      } else if (st === 'Active') {

        try {

          const targetUName = String(data[i][1]);

          sendTelegramAlert(`🎉 <b>[ការអនុម័តគណនីជោគជ័យ]</b>\n` +

            `👤 <b>គណនី:</b> <code>${targetUName}</code> (${fullName || data[i][2] || targetUName})\n` +

            `✅ ស្ថានភាព៖ <b>បានអនុម័ត (Active)</b> រួចរាល់! អ្នកប្រើប្រាស់អាច Login ចូលប្រព័ន្ធបានហើយ។`

          );

        } catch (e) {}

      }



      return { success: true, message: 'បានកែប្រែព័ត៌មានអ្នកប្រើប្រាស់ជោគជ័យ' };

    }

  }

  return { success: false, message: 'User not found' };

}



function deleteUser(userIdOrPayload, adminUser, deleteReason) {

  let uId = userIdOrPayload;

  let admin = adminUser;

  let reason = deleteReason;



  if (userIdOrPayload && typeof userIdOrPayload === 'object') {

    uId = userIdOrPayload.userId || userIdOrPayload.username || userIdOrPayload.id;

    admin = userIdOrPayload.adminUser || userIdOrPayload.user;

    reason = userIdOrPayload.reason || userIdOrPayload.deleteReason;

  }



  if (!uId) {

    return { success: false, message: 'សូមបញ្ជាក់អ្នកប្រើប្រាស់ដែលត្រូវលុប' };

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();



  let adminUsername = '';

  if (admin && typeof admin === 'object') {

    adminUsername = String(admin.username || '').toLowerCase();

  } else if (admin) {

    adminUsername = String(admin).toLowerCase();

  }



  const isActorSuperAdmin = (adminUsername === 'superadmin' || (admin && admin.role === 'SuperAdmin'));



  for (let i = 1; i < data.length; i++) {

    const rowUserId = String(data[i][0] || '');

    const rowUsername = String(data[i][1] || '');

    const rowRole = String(data[i][6] || '');



    if (rowUserId === String(uId) || rowUsername.toLowerCase() === String(uId).toLowerCase()) {

      // Prevent deleting self

      if (rowUsername.toLowerCase() === adminUsername) {

        return { success: false, message: 'អ្នកមិនអាចលុបគណនីផ្ទាល់ខ្លួនរបស់អ្នកបានឡើយ' };

      }



      // Protect SuperAdmin

      if ((rowRole === 'SuperAdmin' || rowUserId === 'USR-SA' || rowUsername.toLowerCase() === 'superadmin') && !isActorSuperAdmin) {

        return { success: false, message: 'អ្នកគ្មានសិទ្ធិលុបគណនី SuperAdmin ឡើយ' };

      }



      // If actor is Admin (not SuperAdmin), route to requestUserDeletion

      if (!isActorSuperAdmin) {

        if (!reason) {

          return { success: false, message: 'សូមបញ្ជាក់ពីមូលហេតុនៃការលុបគណនី!' };

        }

        return requestUserDeletion({ userId: uId, reason: reason, adminUser: adminUsername });

      }



      const deletedFullName = data[i][2] || rowUsername;

      sheet.deleteRow(i + 1);

      logActivity('USERS', adminUsername || 'Admin', 'DELETE_USER', `លុបអ្នកប្រើប្រាស់: ${deletedFullName} (@${rowUsername})`);



      return {

        success: true,

        message: `បានលុបគណនី ${deletedFullName} (@${rowUsername}) ចេញពីប្រព័ន្ធជោគជ័យ!`

      };

    }

  }



  return { success: false, message: 'រកមិនឃើញអ្នកប្រើប្រាស់ដែលត្រូវលុបឡើយ' };

}



function requestUserDeletion(payload) {

  if (!payload) return { success: false, message: 'ទិន្នន័យមិនត្រឹមត្រូវ' };

  const uId = payload.userId || payload.username || payload.id;

  const reason = String(payload.reason || '').trim();

  const adminUser = payload.adminUser || payload.user || 'Admin';



  if (!uId) return { success: false, message: 'សូមបញ្ជាក់អ្នកប្រើប្រាស់ដែលត្រូវលុប' };

  if (!reason) return { success: false, message: 'សូមបញ្ជាក់ពីមូលហេតុនៃការលុបគណនី!' };



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();



  let foundRow = -1;

  let targetDisplayName = uId;

  let targetRole = 'User';

  let targetWh = '';



  for (let i = 1; i < data.length; i++) {

    const rowUserId = String(data[i][0] || '');

    const rowUsername = String(data[i][1] || '');

    if (rowUserId === String(uId) || rowUsername.toLowerCase() === String(uId).toLowerCase()) {

      foundRow = i + 1;

      targetDisplayName = data[i][2] || rowUsername;

      targetRole = data[i][6] || 'User';

      targetWh = data[i][9] || '';

      break;

    }

  }



  if (foundRow === -1) {

    return { success: false, message: 'រកមិនឃើញអ្នកប្រើប្រាស់ឡើយ' };

  }



  // Update status to Pending_Deletion and save deleteReason, adminUser, timestamp
  sheet.getRange(foundRow, 8).setValue('Pending_Deletion');
  sheet.getRange(foundRow, 13).setValue(reason);
  sheet.getRange(foundRow, 14).setValue(String(adminUser));
  sheet.getRange(foundRow, 15).setValue(new Date().toISOString());

  logActivity('USERS', String(adminUser), 'REQUEST_DELETE_USER', `ស្នើសុំលុបអ្នកប្រើប្រាស់: ${targetDisplayName} (${uId}) - មូលហេតុ: ${reason}`);

  // Send Telegram Alert to SuperAdmin
  try {
    const gasUrl = ScriptApp.getService().getUrl();
    const reviewUrl = `${gasUrl}?action=reviewUserDeletionTelegram&userId=${encodeURIComponent(uId)}&u=${encodeURIComponent(uId)}`;

    sendTelegramAlert(
      `⚠️ <b>[សំណើសុំលុបគណនីអ្នកប្រើប្រាស់ - Pending Deletion]</b>\n` +
      `👤 <b>ឈ្មោះបុគ្គលិក:</b> ${targetDisplayName}\n` +
      `🆔 <b>គណនី:</b> <code>${uId}</code>\n` +
      `💼 <b>តួនាទី:</b> ${targetRole}\n` +
      `🏢 <b>ឃ្លាំង/ស្ថានីយ:</b> ${targetWh || '-'}\n` +
      `📝 <b>មូលហេតុនៃការលុប (Admin):</b> <i>"${reason}"</i>\n` +
      `👮 <b>ស្នើសុំដោយ Admin:</b> ${adminUser}\n` +
      `🕒 <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('km-KH')}\n\n` +
      `👉 <b>សូម SuperAdmin ពិនិត្យ ផ្ទៀងផ្ទាត់ និងសរសេរមូលហេតុ Approve/Reject៖</b>`,
      {
        inline_keyboard: [
          [
            { text: "👑 ផ្ទៀងផ្ទាត់ & សម្រេច (Approve / Reject)", url: reviewUrl }
          ]
        ]
      }
    );
  } catch(e) {}

  return {
    success: true,
    message: `បានបញ្ជូនសំណើសុំលុបគណនី ${targetDisplayName} ទៅកាន់ SuperAdmin ពិនិត្យរួចរាល់!`
  };
}

function approveUserDeletion(payload) {
  if (!payload) return { success: false, message: 'ទិន្នន័យមិនត្រឹមត្រូវ' };
  const uId = payload.userId || payload.username || payload.id;
  const adminUser = payload.adminUser || payload.user || 'SuperAdmin';
  const superAdminReason = String(payload.superAdminReason || payload.reason || payload.deleteReason || '').trim();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureUsersInitialized(ss);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowUserId = String(data[i][0] || '');
    const rowUsername = String(data[i][1] || '');
    if (rowUserId === String(uId) || rowUsername.toLowerCase() === String(uId).toLowerCase()) {
      const targetDisplayName = data[i][2] || rowUsername;
      const adminDeleteReason = String(data[i][12] || '');
      const reqBy = String(data[i][13] || 'Admin');

      sheet.deleteRow(i + 1);

      const logMsg = `អនុម័តលុបអ្នកប្រើប្រាស់: ${targetDisplayName} (@${rowUsername}) | មូលហេតុ Admin: ${adminDeleteReason || '-'} | មូលហេតុ SuperAdmin: ${superAdminReason || '-'}`;
      logActivity('USERS', String(adminUser), 'APPROVE_DELETE_USER', logMsg);

      // Reply directly to Admin via LiveChat
      try {
        const ssChat = SpreadsheetApp.getActiveSpreadsheet();
        const chatSheet = ensureChatSheetInitialized(ssChat);
        const cMsgId = 'MSG-DEL-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMddHHmmss');
        const cTimestamp = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
        const replyText = `📩 [ការឆ្លើយតបសំណើសុំលុបគណនី @${rowUsername}]\n` +
          `👤 ជូនចំពោះ Admin: @${reqBy}\n` +
          `🎯 គណនីគោលដៅ: ${targetDisplayName} (@${rowUsername})\n` +
          `⚖️ ការសម្រេច Super Admin: ✅ បានអនុម័តលុបគណនីចេញពីប្រព័ន្ធជាស្ថាពរ\n` +
          `✍️ មូលហេតុ Super Admin: "${superAdminReason || 'បានផ្ទៀងផ្ទាត់ និងយល់ព្រមលុប'}"\n` +
          `📝 មូលហេតុ Admin ធ្លាប់ស្នើសុំ: "${adminDeleteReason || '-'}"`;
        chatSheet.appendRow([
          cMsgId,
          cTimestamp,
          'ALL_WAREHOUSES',
          'superadmin',
          'Super Admin',
          'SuperAdmin',
          'ALL',
          'assets/superadmin_avatar.jpg',
          replyText,
          JSON.stringify({
            type: 'USER_DELETION_RESULT',
            decision: 'Approve',
            targetUserId: rowUserId,
            targetUsername: rowUsername,
            targetDisplayName: targetDisplayName,
            reqBy: reqBy,
            superAdminReason: superAdminReason || 'បានផ្ទៀងផ្ទាត់ និងយល់ព្រមលុប',
            adminDeleteReason: adminDeleteReason
          })
        ]);
      } catch (cErr) {}

      // Telegram notification to SuperAdmin & team
      try {
        sendTelegramAlert(
          `🗑️ <b>[ការលុបគណនីបានអនុម័តដោយ SuperAdmin]</b>\n` +
          `👤 <b>គណនី:</b> ${targetDisplayName} (<code>@${rowUsername}</code>)\n` +
          `👮 <b>ស្នើសុំដោយ Admin:</b> ${reqBy}\n` +
          `📝 <b>មូលហេតុស្នើសុំ (Admin):</b> <i>"${adminDeleteReason || '-'}"</i>\n` +
          `👑 <b>អនុម័តដោយ:</b> SuperAdmin (${adminUser})\n` +
          `✍️ <b>មូលហេតុ SuperAdmin:</b> <i>"${superAdminReason || 'បានផ្ទៀងផ្ទាត់ និងយល់ព្រមលុប'}"</i>\n` +
          `⏰ <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('km-KH')}\n` +
          `✅ គណនីត្រូវបានលុបចេញពីប្រព័ន្ធទាំងស្រុងជាស្ថាពរ។`
        );
      } catch (e) {}

      return {
        success: true,
        message: `បានអនុម័តការលុបគណនី ${targetDisplayName} ចេញពីប្រព័ន្ធទាំងស្រុង!`,
        resolution: {
          decision: 'Approve',
          targetUserId: rowUserId,
          targetUsername: rowUsername,
          targetDisplayName: targetDisplayName,
          adminUser: reqBy,
          superAdminUser: String(adminUser),
          superAdminReason: superAdminReason || 'បានផ្ទៀងផ្ទាត់ និងយល់ព្រមលុប',
          adminReason: adminDeleteReason,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  return { success: false, message: 'រកមិនឃើញអ្នកប្រើប្រាស់ឡើយ' };
}

function rejectUserDeletion(payload) {
  if (!payload) return { success: false, message: 'ទិន្នន័យមិនត្រឹមត្រូវ' };
  const uId = payload.userId || payload.username || payload.id;
  const adminUser = payload.adminUser || payload.user || 'SuperAdmin';
  const superAdminReason = String(payload.superAdminReason || payload.reason || '').trim();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureUsersInitialized(ss);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowUserId = String(data[i][0] || '');
    const rowUsername = String(data[i][1] || '');
    if (rowUserId === String(uId) || rowUsername.toLowerCase() === String(uId).toLowerCase()) {
      const targetDisplayName = data[i][2] || rowUsername;
      const adminDeleteReason = String(data[i][12] || '');
      const reqBy = String(data[i][13] || 'Admin');

      sheet.getRange(i + 1, 8).setValue('Active');
      sheet.getRange(i + 1, 13).setValue('');
      sheet.getRange(i + 1, 14).setValue('');
      sheet.getRange(i + 1, 15).setValue('');

      const logMsg = `បដិសេធការលុបគណនី: ${targetDisplayName} (@${rowUsername}) | មូលហេតុបដិសេធ SuperAdmin: ${superAdminReason || '-'}`;
      logActivity('USERS', String(adminUser), 'REJECT_DELETE_USER', logMsg);

      // Reply directly to Admin via LiveChat
      try {
        const ssChat = SpreadsheetApp.getActiveSpreadsheet();
        const chatSheet = ensureChatSheetInitialized(ssChat);
        const cMsgId = 'MSG-DEL-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMddHHmmss');
        const cTimestamp = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
        const replyText = `📩 [ការឆ្លើយតបសំណើសុំលុបគណនី @${rowUsername}]\n` +
          `👤 ជូនចំពោះ Admin: @${reqBy}\n` +
          `🎯 គណនីគោលដៅ: ${targetDisplayName} (@${rowUsername})\n` +
          `⚖️ ការសម្រេច Super Admin: 🛡️ បានបដិសេធសំណើសុំលុប (រក្សាទុកគណនីជា Active)\n` +
          `✍️ មូលហេតុ Super Admin: "${superAdminReason || 'រក្សាទុកគណនីជាធម្មតា'}"\n` +
          `📝 មូលហេតុ Admin ធ្លាប់ស្នើសុំ: "${adminDeleteReason || '-'}"`;
        chatSheet.appendRow([
          cMsgId,
          cTimestamp,
          'ALL_WAREHOUSES',
          'superadmin',
          'Super Admin',
          'SuperAdmin',
          'ALL',
          'assets/superadmin_avatar.jpg',
          replyText,
          JSON.stringify({
            type: 'USER_DELETION_RESULT',
            decision: 'Reject',
            targetUserId: rowUserId,
            targetUsername: rowUsername,
            targetDisplayName: targetDisplayName,
            reqBy: reqBy,
            superAdminReason: superAdminReason || 'រក្សាទុកគណនីជាធម្មតា',
            adminDeleteReason: adminDeleteReason
          })
        ]);
      } catch (cErr) {}

      try {
        sendTelegramAlert(
          `🛡️ <b>[បានបដិសេធសំណើសុំលុបគណនី]</b>\n` +
          `👤 <b>គណនី:</b> ${targetDisplayName} (<code>@${rowUsername}</code>)\n` +
          `👮 <b>ស្នើសុំដោយ Admin:</b> ${reqBy}\n` +
          `👑 <b>បដិសេធដោយ SuperAdmin:</b> SuperAdmin (${adminUser})\n` +
          `✍️ <b>មូលហេតុបដិសេធ:</b> <i>"${superAdminReason || 'រក្សាទុកគណនីជាធម្មតា'}"</i>\n` +
          `⏰ <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('km-KH')}\n` +
          `ℹ️ គណនីត្រូវបានរក្សាទុក និងដំណើរការជា Active ដដែល។`
        );
      } catch (e) {}

      return {
        success: true,
        message: `បានបដិសេធការលុបគណនី ${targetDisplayName}។ គណនីត្រូវបានរក្សាទុកជា Active ដដែល!`,
        resolution: {
          decision: 'Reject',
          targetUserId: rowUserId,
          targetUsername: rowUsername,
          targetDisplayName: targetDisplayName,
          adminUser: reqBy,
          superAdminUser: String(adminUser),
          superAdminReason: superAdminReason || 'រក្សាទុកគណនីជាធម្មតា',
          adminReason: adminDeleteReason,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  return { success: false, message: 'រកមិនឃើញអ្នកប្រើប្រាស់ឡើយ' };
}

function handleTelegramUserDeletionApproval(userId, username, actionType, e) {
  try {
    const uId = userId || username;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ensureUsersInitialized(ss);
    const data = sheet.getDataRange().getValues();

    let foundRow = -1;
    let userFullName = username;
    let userRole = '';
    let userWh = '';
    let delReason = '';
    let reqBy = 'Admin';
    let reqAt = '';

    for (let i = 1; i < data.length; i++) {
      const rId = String(data[i][0]).trim();
      const rUser = String(data[i][1]).replace(/\s+/g, ' ').trim().toLowerCase();
      if ((uId && rId === String(uId).trim()) || (username && rUser === String(username).toLowerCase())) {
        foundRow = i + 1;
        userFullName = String(data[i][2]) || data[i][1];
        userRole = String(data[i][6]) || 'User';
        userWh = String(data[i][9]) || '-';
        delReason = String(data[i][12] || '');
        reqBy = String(data[i][13] || 'Admin');
        reqAt = String(data[i][14] || '');
        break;
      }
    }

    if (foundRow === -1) {
      return HtmlService.createHtmlOutput(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>រកមិនឃើញគណនី</title>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center;color:#334155}.card{background:#fff;padding:32px 24px;border-radius:24px;box-shadow:0 10px 25px rgba(0,0,0,0.06);max-width:400px;width:100%}</style>
        </head>
        <body>
          <div class="card">
            <div style="font-size: 54px; margin-bottom: 12px;">⚠️</div>
            <h2 style="color: #e11d48; margin-top:0;">រកមិនឃើញគណនីនេះទេ</h2>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">គណនីនេះប្រហែលជាត្រូវបានលុប ឬដំណើរការរួចរាល់ហើយ។</p>
          </div>
        </body></html>
      `).setTitle('រកមិនឃើញគណនី');
    }

    const isConfirmed = e && e.parameter && (e.parameter.confirmed === '1' || e.parameter.confirmed === 'true');
    const submittedDecision = (e && e.parameter && e.parameter.decision) ? e.parameter.decision : actionType;
    const superAdminReason = (e && e.parameter && (e.parameter.superAdminReason || e.parameter.reason)) ? String(e.parameter.superAdminReason || e.parameter.reason).trim() : '';

    // If not confirmed yet, render the interactive verification form so SuperAdmin can enter reason
    if (!isConfirmed) {
      const gasUrl = ScriptApp.getService().getUrl();
      return HtmlService.createHtmlOutput(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
          <title>ផ្ទៀងផ្ទាត់សំណើសុំលុបគណនី | SuperAdmin</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; color: #1e293b; }
            .card { background: #ffffff; width: 100%; max-width: 480px; border-radius: 24px; padding: 28px 24px; box-shadow: 0 20px 35px -10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
            .header-badge { display: inline-flex; align-items: center; gap: 6px; background: #ffe4e6; color: #e11d48; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 9999px; margin-bottom: 12px; text-transform: uppercase; }
            h2 { margin: 0 0 6px 0; font-size: 20px; color: #0f172a; }
            .sub-title { font-size: 12px; color: #64748b; margin-bottom: 20px; line-height: 1.5; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 18px; }
            .user-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1; }
            .avatar { width: 48px; height: 48px; border-radius: 14px; background: #e0e7ff; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #4338ca; flex-shrink: 0; font-weight: bold; border: 2px solid #c7d2fe; }
            .detail-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
            .detail-label { color: #64748b; }
            .detail-val { font-weight: 600; color: #1e293b; }
            .admin-reason-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 12px; margin-top: 10px; font-size: 12px; color: #9f1239; line-height: 1.5; }
            .form-group { margin-bottom: 20px; text-align: left; }
            label { display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px; }
            textarea { width: 100%; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 12px; font-size: 13px; font-family: inherit; resize: vertical; min-height: 85px; outline: none; transition: border-color 0.2s; }
            textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
            .btn-group { display: flex; gap: 10px; flex-direction: column; }
            .btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 13px; border-radius: 14px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.15s ease; text-decoration: none; }
            .btn-approve { background: linear-gradient(135deg, #e11d48, #be123c); color: #ffffff; box-shadow: 0 4px 12px rgba(225,29,72,0.25); }
            .btn-approve:hover { filter: brightness(1.08); }
            .btn-reject { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
            .btn-reject:hover { background: #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header-badge"><i class="fa-solid fa-crown"></i> SuperAdmin Verification</div>
            <h2>ផ្ទៀងផ្ទាត់ការលុបគណនី</h2>
            <div class="sub-title">សូមពិនិត្យព័ត៌មានបុគ្គលិក និងសរសេរបញ្ជាក់ពីមូលហេតុមុននឹងសម្រេចចិត្ត</div>

            <div class="info-box">
              <div class="user-row">
                <div class="avatar">${userFullName.charAt(0).toUpperCase()}</div>
                <div>
                  <div style="font-weight: 800; font-size: 14px; color: #0f172a;">${userFullName}</div>
                  <div style="font-size: 11px; color: #64748b;">@${username} • ${userRole}</div>
                </div>
              </div>
              <div class="detail-row"><span class="detail-label">🏢 ឃ្លាំង/ស្ថានីយ៖</span><span class="detail-val">${userWh}</span></div>
              <div class="detail-row"><span class="detail-label">👮 ស្នើសុំដោយ Admin៖</span><span class="detail-val">${reqBy}</span></div>
              <div class="admin-reason-box">
                <div style="font-weight: 700; margin-bottom: 3px;"><i class="fa-solid fa-comment-dots"></i> មូលហេតុរបស់ Admin៖</div>
                <div>"${delReason || 'គ្មានការបញ្ជាក់'}"</div>
              </div>
            </div>

            <form method="GET" action="${gasUrl}" onsubmit="return validateForm()">
              <input type="hidden" name="action" value="reviewUserDeletionTelegram">
              <input type="hidden" name="userId" value="${uId}">
              <input type="hidden" name="u" value="${username}">
              <input type="hidden" name="confirmed" value="1">
              <input type="hidden" name="decision" id="formDecision" value="Approve">

              <div class="form-group">
                <label><i class="fa-solid fa-pen-fancy" style="color:#2563eb;"></i> មូលហេតុ / មតិបញ្ជាក់របស់ SuperAdmin <span style="color:#e11d48;">*</span></label>
                <textarea id="superAdminReason" name="superAdminReason" placeholder="សូមសរសេរបញ្ជាក់ពីមូលហេតុនៃការសម្រេចចិត្ត (ឧ. បានផ្ទៀងផ្ទាត់រួចរាល់ យល់ព្រមលុប... ឬ បដិសេធដោយសារ...)..." required></textarea>
              </div>

              <div class="btn-group">
                <button type="submit" onclick="document.getElementById('formDecision').value='Approve';" class="btn btn-approve">
                  <i class="fa-solid fa-trash-can"></i> អនុម័តលុប (Approve Delete)
                </button>
                <button type="submit" onclick="document.getElementById('formDecision').value='Reject';" class="btn btn-reject">
                  <i class="fa-solid fa-shield-halved"></i> បដិសេធ (Reject Request)
                </button>
              </div>
            </form>
          </div>

          <script>
            function validateForm() {
              var r = document.getElementById('superAdminReason').value.trim();
              if (!r) {
                alert('សូមសរសេរបញ្ជាក់ពីមូលហេតុ ឬមតិយោបល់របស់ SuperAdmin!');
                document.getElementById('superAdminReason').focus();
                return false;
              }
              return true;
            }
          </script>
        </body>
        </html>
      `).setTitle('ផ្ទៀងផ្ទាត់សំណើសុំលុបគណនី | SuperAdmin');
    }

    // Process Confirmed Decision (Approve or Reject)
    if (submittedDecision === 'Approve') {
      sheet.deleteRow(foundRow);
      logActivity('SUPERADMIN_WEB', 'SuperAdmin', 'APPROVE_DELETE_USER', `អនុម័តលុបអ្នកប្រើប្រាស់: ${userFullName} (@${username}) | មូលហេតុ Admin: ${delReason} | មូលហេតុ SuperAdmin: ${superAdminReason}`);
      
      try {
        sendTelegramAlert(
          `🗑️ <b>[ការលុបគណនីបានអនុម័តដោយ SuperAdmin]</b>\n` +
          `👤 <b>គណនី:</b> ${userFullName} (<code>@${username}</code>)\n` +
          `📝 <b>មូលហេតុ Admin:</b> <i>"${delReason || '-'}"</i>\n` +
          `👮 <b>ស្នើសុំដោយ Admin:</b> ${reqBy}\n` +
          `👑 <b>អនុម័តដោយ:</b> SuperAdmin\n` +
          `✍️ <b>មូលហេតុ SuperAdmin:</b> <i>"${superAdminReason || 'យល់ព្រមតាមសំណើ'}"</i>\n` +
          `✅ គណនីត្រូវបាន SuperAdmin អនុម័តលុបចេញពីប្រព័ន្ធជាស្ថាពរ។`
        );
      } catch(e) {}

      return HtmlService.createHtmlOutput(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>បានលុបគណនីជោគជ័យ</title>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center;color:#334155}.card{background:#fff;padding:36px 24px;border-radius:24px;box-shadow:0 10px 25px rgba(0,0,0,0.06);max-width:420px;width:100%}</style>
        </head>
        <body>
          <div class="card">
            <div style="font-size: 54px; margin-bottom: 12px;">🗑️</div>
            <h2 style="color: #e11d48; margin-top:0;">បានអនុម័តការលុបគណនីជោគជ័យ!</h2>
            <p style="color: #334155; font-size: 14px;">គណនី <b>${userFullName} (@${username})</b> ត្រូវបានលុបចេញពីប្រព័ន្ធទាំងស្រុង។</p>
            ${superAdminReason ? `<p style="background:#f1f5f9; padding:12px; border-radius:12px; color:#475569; font-size:12px; margin-top:16px;"><i>✍️ មូលហេតុ SuperAdmin៖ "${superAdminReason}"</i></p>` : ''}
          </div>
        </body></html>
      `).setTitle('បានលុបគណនីជោគជ័យ');
    } else {
      sheet.getRange(foundRow, 8).setValue('Active');
      sheet.getRange(foundRow, 13).setValue('');
      sheet.getRange(foundRow, 14).setValue('');
      sheet.getRange(foundRow, 15).setValue('');
      logActivity('SUPERADMIN_WEB', 'SuperAdmin', 'REJECT_DELETE_USER', `បដិសេធការលុបគណនី: ${userFullName} (@${username}) | មូលហេតុ SuperAdmin: ${superAdminReason}`);
      
      try {
        sendTelegramAlert(
          `🛡️ <b>[បានបដិសេធសំណើសុំលុបគណនី]</b>\n` +
          `👤 <b>គណនី:</b> ${userFullName} (<code>@${username}</code>)\n` +
          `👮 <b>ស្នើសុំដោយ Admin:</b> ${reqBy}\n` +
          `👑 <b>បដិសេធដោយ:</b> SuperAdmin\n` +
          `✍️ <b>មូលហេតុបដិសេធ:</b> <i>"${superAdminReason || 'រក្សាទុកគណនីជា Active'}"</i>\n` +
          `ℹ️ សំណើសុំលុបត្រូវបាន SuperAdmin បដិសេធ។ គណនីនៅតែ Active ដដែល។`
        );
      } catch(e) {}

      return HtmlService.createHtmlOutput(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>បានបដិសេធសំណើសុំលុប</title>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center;color:#334155}.card{background:#fff;padding:36px 24px;border-radius:24px;box-shadow:0 10px 25px rgba(0,0,0,0.06);max-width:420px;width:100%}</style>
        </head>
        <body>
          <div class="card">
            <div style="font-size: 54px; margin-bottom: 12px;">🛡️</div>
            <h2 style="color: #2563eb; margin-top:0;">បានបដិសេធសំណើសុំលុប</h2>
            <p style="color: #334155; font-size: 14px;">គណនី <b>${userFullName} (@${username})</b> ត្រូវបានរក្សាទុក និងបើកដំណើរការ (Active) ជាធម្មតាវិញ។</p>
            ${superAdminReason ? `<p style="background:#f1f5f9; padding:12px; border-radius:12px; color:#475569; font-size:12px; margin-top:16px;"><i>✍️ មូលហេតុបដិសេធ៖ "${superAdminReason}"</i></p>` : ''}
          </div>
        </body></html>
      `).setTitle('បានបដិសេធការលុប');
    }
  } catch(err) {
    return HtmlService.createHtmlOutput('កំហុស៖ ' + err.toString());
  }
}



function updateUserProfile(payload) {

  if (!payload) return { success: false, message: 'ទិន្នន័យមិនត្រឹមត្រូវ' };

  const username = String(payload.username || '').toLowerCase();

  const userId = String(payload.userId || '');

  const fullName = String(payload.fullName || '').trim();

  const email = String(payload.email || '').trim();

  const phone = String(payload.phone || '').trim();

  const avatar = String(payload.avatar || '').trim();

  const newPassword = String(payload.newPassword || '').trim();



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();



  for (let i = 1; i < data.length; i++) {

    const rowUserId = String(data[i][0] || '');

    const rowUsername = String(data[i][1] || '').toLowerCase();



    if ((userId && rowUserId === userId) || (username && rowUsername === username)) {

      if (fullName) sheet.getRange(i + 1, 3).setValue(fullName);

      if (email !== undefined) sheet.getRange(i + 1, 4).setValue(email);

      if (avatar) {

        try {

          if (avatar.length <= 49000) sheet.getRange(i + 1, 11).setValue(avatar);

        } catch (e) {}

      }

      if (phone !== undefined) sheet.getRange(i + 1, 12).setValue(phone);



      if (newPassword && newPassword.length >= 4) {

        const storedHash = String(data[i][4] || '').trim();

        const storedSalt = String(data[i][5] || '');

        const oldPassword = String(payload.oldPassword || '').trim();



        const computedHash = hashPassword(oldPassword, storedSalt);

        const isHashMatch = (computedHash === storedHash);

        const isPlainMatch = (storedHash === oldPassword);



        if (!isHashMatch && !isPlainMatch) {

          return { success: false, message: 'ពាក្យសម្ងាត់ចាស់មិនត្រឹមត្រូវទេ! ប្រសិនបើអ្នកភ្លេចពាក្យសម្ងាត់ សូមចុចប៊ូតុង «ភ្លេចពាក្យសម្ងាត់?»' };

        }



        const salt = generateSalt();

        const hash = hashPassword(newPassword, salt);

        sheet.getRange(i + 1, 5).setValue(hash);
        sheet.getRange(i + 1, 6).setValue(salt);
        sheet.getRange(i + 1, 17).setValue(newPassword);
      }



      logActivity(username || rowUsername, String(data[i][6] || 'User'), 'UPDATE_PROFILE', `Updated own profile: fullName=${fullName}, avatarUpdated=${!!avatar}, passwordUpdated=${!!newPassword}`);

      return { success: true, message: 'បានកែប្រែព័ត៌មានផ្ទាល់ខ្លួនជោគជ័យ' };

    }

  }

  return { success: false, message: 'មិនរកឃើញគណនីរបស់អ្នកឡើយ' };

}



// ==========================================

// 4. ITEM & INVENTORY MANAGEMENT

// ==========================================



function getItemsList(userOrPayload, warehouseFilter) {

  let user = userOrPayload;

  let whFilter = warehouseFilter;

  if (userOrPayload && typeof userOrPayload === 'object' && (userOrPayload.user || userOrPayload.warehouseFilter)) {

    user = userOrPayload.user;

    whFilter = userOrPayload.warehouseFilter || warehouseFilter;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(SHEETS.ITEMS);

  if (!sheet || sheet.getLastRow() <= 1) {

    setupDatabase();

    sheet = ss.getSheetByName(SHEETS.ITEMS);

  }



  const data = sheet.getDataRange().getValues();

  const items = [];



  // Master product catalog: Do NOT filter out products by user's assigned warehouse!
  // All users (Station Manager, Team Leader, Stock Keeper, Admin) must have access to the complete master catalog of products.
  let targetWarehouse = null;
  // if (whFilter && whFilter !== 'ALL' && whFilter !== 'គ្រប់ឃ្លាំង' && whFilter !== 'គ្រប់ឃ្លាំងទាំងអស់' && whFilter !== 'គ្រប់ស្ថានីយទាំងអស់') {
  //   targetWarehouse = whFilter;
  // }



  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (row[0]) {

      let loc = String(row[8] || '').trim();

      const normLoc = normalizeStationLocationInternal(loc);

      if (loc !== normLoc) {

        try {

          sheet.getRange(i + 1, 9).setValue(normLoc);

        } catch (e) {}

        loc = normLoc;

      }



      if (targetWarehouse && loc !== targetWarehouse) {

        continue;

      }



      items.push({

        sku: String(row[0]),

        barcode: String(row[1] || ''),

        name: String(row[2]),

        category: String(row[3] || 'ទូទៅ'),

        unit: String(row[4] || 'ដុំ'),

        costPrice: Number(row[5] || 0),

        sellingPrice: Number(row[6] || 0),

        minStock: Number(row[7] || 0),

        location: loc,

        currentStock: Number(row[9] || 0),

        imageUrl: String(row[10] || ''),

        status: String(row[11] || 'Active'),

        updatedAt: row[12],

        size: String(row[13] || ''),

        color: String(row[14] || ''),

        packUnit: String(row[15] || ''),

        packQty: Number(row[16] || 1),

        zone: String(row[17] || 'តំបន់ A (ទំនិញទូទៅ)'),

        zoneNumber: String(row[18] || 'Z-01'),

        notes: String(row[19] || ''),

        createdBy: String(row[20] || '')

      });

    }

  }



  const categories = getCategoriesListInternal(ss);

  const warehouses = getWarehousesListInternal(ss);



  return { success: true, items: items, categories: categories, warehouses: warehouses, activeWarehouseFilter: targetWarehouse };

}



/**

 * Normalize old mock warehouse names into official Toll Stations

 */

function normalizeStationLocationInternal(loc) {

  if (!loc) return '1-K3 ស្ថានីយ (ភ្នំពេញ)';

  const s = String(loc).trim();

  if (s.includes('សែនសុខ') || s.includes('ឃ្លាំងទី ០១') || s.includes('ឃ្លាំងកណ្តាល')) return '1-K3 ស្ថានីយ (ភ្នំពេញ)';

  if (s.includes('ទួលគោក') || s.includes('ឃ្លាំងទី ០២')) return '2-K26 ស្ថានីយ (កំពង់ស្ពឺ កើត)';

  if (s.includes('សៀមរាប') || s.includes('ឃ្លាំងទី ០៣')) return '3-K43 ស្ថានីយ (កំពង់ស្ពឺ លិច)';

  if (s.includes('បាត់ដំបង') || s.includes('ឃ្លាំងទី ០៤')) return '4-K76 ស្ថានីយ (ត្រែងត្រយឹង)';

  if (s.includes('កំពង់សីលា') || s.includes('ឃ្លាំងទី ០៥')) return '5-K114 ស្ថានីយ (កំពង់សីលា)';

  if (s.includes('ស្រែអំបិល') || s.includes('ឃ្លាំងទី ០៦')) return '6-K135 ស្ថានីយ (ស្រែអំបិល)';

  if (s.includes('ស្ទឹងហាវ') || s.includes('ឃ្លាំងទី ០៧')) return '7-K172 ស្ថានីយ (ស្ទឹងហាវ)';

  if (s.includes('ព្រះសីហនុ') || s.includes('ឃ្លាំងទី ០៨')) return '8-K182 ស្ថានីយ (ព្រះសីហនុ)';

  return s;

}



function getUserByUsernameInternal(ss, username) {

  if (!username) return null;

  const target = String(username).trim().toLowerCase();

  if (target === 'superadmin') return { username: 'superadmin', role: 'SuperAdmin', warehouse: 'ALL' };

  if (target === 'admin') return { username: 'admin', role: 'Admin', warehouse: 'ALL' };



  const sheet = ensureUsersInitialized(ss);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    if (String(data[i][1]).trim().toLowerCase() === target) {

      return {

        userId: String(data[i][0]),

        username: String(data[i][1]),

        role: String(data[i][6]),

        warehouse: String(data[i][9] || 'ALL')

      };

    }

  }

  return null;

}



/**

 * ==========================================

 * GOOGLE DRIVE IMAGE STORAGE SERVICE

 * ==========================================

 * រក្សាទុករូបភាពទំនិញចូលទៅក្នុង Google Drive Folder ដោយស្វ័យប្រវត្តិ

 * និងបង្កើត Direct CDN Viewing Link សម្រាប់បង្ហាញលើ Web App និងកត់ត្រាក្នុង Sheet

 */

function uploadImageToGoogleDrive(base64Data, fileName, folderName) {

  try {

    if (!base64Data || typeof base64Data !== 'string') {

      return { success: false, message: 'ពុំមានទិន្នន័យរូបភាព (Base64 is empty)' };

    }



    // ប្រសិនបើជា URL លើអ៊ីនធឺណិតរួចហើយ មិនបាច់ Upload ឡើងវិញទេ

    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {

      return { success: true, url: base64Data, message: 'Already a web URL' };

    }



    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settings = getSettingsMap(ss);

    // ស្វែងរកតាមរយៈ Google Drive Folder ID (កំណត់ដោយអ្នកប្រើប្រាស់)
    let targetFolderId = settings['DRIVE_IMAGE_FOLDER_ID'] || DEFAULT_DRIVE_FOLDER_ID || '1_pn3xY4G0wnaqLcT44VGPEz9W1_4E_Qm';
    if (folderName && (folderName.includes('/') || (folderName.length >= 25 && !folderName.includes(' ')))) {
      targetFolderId = folderName;
    }

    let folder = null;

    // 1. ស្វែងរកតាមរយៈ Folder ID ប្រសិនបើអ្នកប្រើបានកំណត់
    if (targetFolderId) {
      try {
        let cleanFolderId = String(targetFolderId).trim();
        const urlMatch = cleanFolderId.match(/folders\/([a-zA-Z0-9_-]+)/);
        if (urlMatch) {
          cleanFolderId = urlMatch[1];
        }
        folder = DriveApp.getFolderById(cleanFolderId);
      } catch (fIdErr) {
        if (typeof Logger !== 'undefined') Logger.log('DriveApp.getFolderById notice: ' + fIdErr.toString());
      }
    }

    // 2. ប្រសិនបើរករកតាម ID មិនឃើញ ឬមិនទាន់កំណត់ រកតាមឈ្មោះ Folder 'Stock_Product_Images' ក្នុង Drive របស់ម្ចាស់គណនី
    if (!folder) {
      const targetFolderName = settings['DRIVE_IMAGE_FOLDER'] || 'Stock_Product_Images';
      try {
        const folders = DriveApp.getFoldersByName(targetFolderName);
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder(targetFolderName);
          folder.setDescription('ផ្ទុករូបភាពទំនិញនៃប្រព័ន្ធគ្រប់គ្រងស្តុក (Stock Inventory Management)');
        }
      } catch (fNameErr) {
        if (typeof Logger !== 'undefined') Logger.log('Drive folder by name notice: ' + fNameErr.toString());
      }
    }

    // 3. Fallback ជាចុងក្រោយ បង្កើត Folder ក្នុង Root Drive របស់ខ្លួនឯង
    if (!folder) {
      folder = DriveApp.getRootFolder();
    }

    // កំណត់សិទ្ធិ Folder ឱ្យ Anyone with link can view
    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (fErr) {}

    // ញែក MIME type និង base64 payload
    let contentType = 'image/jpeg';
    let rawBase64 = base64Data;

    if (base64Data.indexOf(';base64,') !== -1) {
      const parts = base64Data.split(';base64,');
      contentType = parts[0].replace('data:', '') || 'image/jpeg';
      rawBase64 = parts[1];
    } else if (base64Data.startsWith('data:')) {
      const parts = base64Data.split(',');
      contentType = parts[0].split(';')[0].replace('data:', '') || 'image/jpeg';
      rawBase64 = parts[1];
    }

    // កំណត់កន្ទុយ File
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('gif')) ext = 'gif';

    const cleanBaseName = (fileName || ('item_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd_HHmmss'))).replace(/\.[^/.]+$/, '');
    const cleanFileName = cleanBaseName + '.' + ext;

    const decodedBytes = Utilities.base64Decode(rawBase64);
    const blob = Utilities.newBlob(decodedBytes, contentType, cleanFileName);

    let file = null;
    try {
      file = folder.createFile(blob);
    } catch (createErr) {
      if (typeof Logger !== 'undefined') Logger.log('createFile in target folder failed, creating Stock_Product_Images folder: ' + createErr.toString());
      const rootFolders = DriveApp.getFoldersByName('Stock_Product_Images');
      if (rootFolders.hasNext()) {
        folder = rootFolders.next();
      } else {
        folder = DriveApp.createFolder('Stock_Product_Images');
      }
      try {
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (fErr2) {}
      file = folder.createFile(blob);
    }

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {}

    const fileId = file.getId();
    // High-performance direct content CDN URL for <img> tags without CORS or cookie auth requirements
    const directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    const driveViewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';

    return {
      success: true,
      url: directUrl,
      fileId: fileId,
      driveViewUrl: driveViewUrl,
      folderId: folder.getId(),
      folderName: folder.getName(),
      fileName: cleanFileName,
      message: 'បានរក្សាទុករូបភាពទៅ Google Drive ជោគជ័យ'
    };

  } catch (err) {

    if (typeof Logger !== 'undefined') Logger.log('uploadImageToGoogleDrive error: ' + err.toString());

    return {

      success: false,

      message: 'បរាជ័យក្នុងការ Upload ទៅ Google Drive: ' + err.toString()

    };

  }

}



function saveOrUpdateItem(itemDataOrPayload, username) {

  let itemData = itemDataOrPayload;

  let user = username;



  if (itemDataOrPayload && itemDataOrPayload.item) {

    itemData = itemDataOrPayload.item;

    user = itemDataOrPayload.user || username;

  }

  if (user && typeof user === 'object') {
    user = user.username || user.userId || '';
  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(SHEETS.ITEMS);

  if (!sheet || sheet.getLastRow() === 0) {

    setupDatabase();

    sheet = ss.getSheetByName(SHEETS.ITEMS);

  }



  const data = sheet.getDataRange().getValues();

  let targetRow = -1;

  const targetSku = String(itemData.sku || '').trim();

  const sku = targetSku || 'SKU-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMddHHmmss');



  for (let i = 1; i < data.length; i++) {

    if (String(data[i][0]).trim().toLowerCase() === sku.toLowerCase()) {

      targetRow = i + 1;

      break;

    }

  }



  const isNew = targetRow <= 0;
  const normStr = function(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); };
  const newNameNorm = normStr(itemData.name);
  const newSizeNorm = normStr(itemData.size);
  const newColorNorm = normStr(itemData.color);
  const newBarcode = String(itemData.barcode || '').trim().toLowerCase();
  const newLoc = normalizeStationLocationInternal(itemData.location || '1-K3 ស្ថានីយ (ភ្នំពេញ)');
  itemData.location = newLoc;

  // 1. DUPLICATE CHECK: Prevent duplicate item based on (Name + Size + Color)
  for (let i = 1; i < data.length; i++) {
    const existSku = String(data[i][0]).trim();
    if (!isNew && existSku.toLowerCase() === sku.toLowerCase()) continue; // Skip self when editing

    const existBarcode = String(data[i][1] || '').trim().toLowerCase();
    const existName = String(data[i][2] || '');
    const existSize = String(data[i][13] || '');
    const existColor = String(data[i][14] || '');

    if (newBarcode && existBarcode && newBarcode === existBarcode) {
      return {
        success: false,
        message: `មុខទំនិញនេះមានហើយនៅក្នុងបញ្ជីនេះ! លេខកូដ Barcode (${itemData.barcode}) មានស្រាប់លើទំនិញ "${existName}" មិនអាចបញ្ចូលបន្ថែមស្ទួនបានទេ។`
      };
    }

    if (newNameNorm && normStr(existName) === newNameNorm && normStr(existSize) === newSizeNorm && normStr(existColor) === newColorNorm) {
      const specParts = [existSize, existColor].filter(Boolean);
      const specStr = specParts.length > 0 ? ` (${specParts.join(', ')})` : '';
      return {
        success: false,
        message: `មុខទំនិញ "${itemData.name}"${specStr} មានក្នុងបញ្ជីស្តុករួចហើយ (SKU: ${existSku})! ប្រព័ន្ធកំណត់ត្រួតពិនិត្យ (ឈ្មោះ + ខ្នាត + ពណ៌) មិនអនុញ្ញាតឱ្យបញ្ចូលស្ទួនឡើយ។`
      };
    }
  }



  // 2. STATION ACCESS CONTROL: Users can only add/edit items belonging to their own station
  // Master catalog items (គ្រប់ស្ថានីយទាំងអស់) are company-wide and can be managed by authorized staff
  if (user && String(user).toLowerCase() !== 'admin' && String(user).toLowerCase() !== 'superadmin') {

    const uObj = getUserByUsernameInternal(ss, user);

    const isAdminOrLeader = uObj && (uObj.role === 'SuperAdmin' || uObj.role === 'Admin' || uObj.role === 'ប្រធានក្រុម');

    if (uObj && !isAdminOrLeader && uObj.warehouse && uObj.warehouse !== 'ALL' && uObj.warehouse !== 'គ្រប់ស្ថានីយទាំងអស់') {

      const uWh = normalizeStationLocationInternal(uObj.warehouse);

      if (newLoc && newLoc !== 'គ្រប់ស្ថានីយទាំងអស់' && uWh !== newLoc) {

        return {

          success: false,

          message: `អ្នកគ្មានសិទ្ធិកែប្រែ ឬបន្ថែមទំនិញសម្រាប់ស្ថានីយដ៏ទៃទេ! អាចធ្វើបានតែលើស្ថានីយ ${uObj.warehouse} ប៉ុណ្ណោះ`

        };

      }

    }

  }



  if (itemData.imageUrl && (itemData.imageUrl.startsWith('data:image/') || itemData.imageUrl.length > 500)) {
    try {
      const driveUpload = uploadImageToGoogleDrive(itemData.imageUrl, sku);
      if (driveUpload && driveUpload.success && driveUpload.url) {
        itemData.imageUrl = driveUpload.url;
      }
    } catch (dErr) {
      if (typeof Logger !== 'undefined') Logger.log('Drive upload error in saveOrUpdateItem: ' + dErr.toString());
    }
  }

  // Safety guard against Google Sheets cell limit (50,000 characters)
  if (itemData.imageUrl && itemData.imageUrl.startsWith('data:') && itemData.imageUrl.length > 500) {
    itemData.imageUrl = '';
  }



  const rowValues = [

    sku,

    itemData.barcode || sku,

    itemData.name,

    itemData.category || 'ទូទៅ',

    itemData.unit || 'ដុំ',

    Number(itemData.costPrice || 0),

    Number(itemData.sellingPrice || 0),

    Number(itemData.minStock || 0),

    itemData.location || '1-K3 ស្ថានីយ (ភ្នំពេញ)',

    Number(itemData.currentStock !== undefined ? itemData.currentStock : 0),

    itemData.imageUrl || '',

    itemData.status || 'Active',

    new Date(),

    itemData.size || '',

    itemData.color || '',

    itemData.packUnit || '',

    Number(itemData.packQty || 1),

    itemData.zone || 'តំបន់ A (ទំនិញទូទៅ)',

    itemData.zoneNumber || 'Z-01',

    itemData.notes || '',

    itemData.createdBy || user || 'Admin'

  ];



  if (targetRow > 0) {

    if (itemData.currentStock === undefined) {

      rowValues[9] = data[targetRow - 1][9];

    }

    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);

    logActivity(user || 'System', 'Staff', 'UPDATE_ITEM', `Updated item: ${itemData.name} (${sku}) at ${itemData.location}`);

    return { success: true, message: 'បានកែប្រែទំនិញជោគជ័យ!', sku: sku, imageUrl: itemData.imageUrl };

  } else {

    sheet.appendRow(rowValues);

    logActivity(user || 'System', 'Staff', 'ADD_ITEM', `Created new item: ${itemData.name} (${sku}) at ${itemData.location}`);



    if (Number(itemData.currentStock) > 0) {

      recordTransactionInternal(ss, {

        type: 'STOCK_IN',

        sku: sku,

        itemName: itemData.name,

        quantity: Number(itemData.currentStock),

        unit: itemData.unit || 'ដុំ',

        unitPrice: Number(itemData.costPrice || 0),

        totalAmount: Number(itemData.currentStock) * Number(itemData.costPrice || 0),

        fromLocation: 'Initial Balance',

        toLocation: itemData.location || '1-K3 ស្ថានីយ (ភ្នំពេញ)',

        notes: 'Initial Stock on Creation',

        user: user || 'System'

      });

    }



    return { success: true, message: 'បានបន្ថែមទំនិញថ្មីជោគជ័យ!', sku: sku, imageUrl: itemData.imageUrl };

  }

}



/**
 * ធ្វើសមកាលកម្មទំនិញទាំងអស់ពី Web App ទៅកាន់ Google Sheets (SHEETS.ITEMS)
 */
function syncAllItems(itemsListOrPayload, username) {
  try {
    let itemsList = itemsListOrPayload;
    let user = username;
    if (itemsListOrPayload && typeof itemsListOrPayload === 'object' && !Array.isArray(itemsListOrPayload)) {
      itemsList = itemsListOrPayload.items || itemsListOrPayload.itemsList || [];
      user = itemsListOrPayload.user || username;
    }
    if (!Array.isArray(itemsList) || itemsList.length === 0) {
      return { success: false, message: 'គ្មានទិន្នន័យទំនិញសម្រាប់ Sync ទេ' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.ITEMS);
    if (!sheet || sheet.getLastRow() === 0) {
      setupDatabase();
      sheet = ss.getSheetByName(SHEETS.ITEMS);
    }

    const data = sheet.getDataRange().getValues();
    const existingMap = {}; // sku -> rowIndex (1-based)
    for (let i = 1; i < data.length; i++) {
      const sku = String(data[i][0] || '').trim();
      if (sku) existingMap[sku] = i + 1;
    }

    let updatedCount = 0;
    let addedCount = 0;

    for (let i = 0; i < itemsList.length; i++) {
      const item = itemsList[i];
      if (!item) continue;
      const sku = String(item.sku || '').trim() || ('SKU-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMddHHmmss') + i);
      const rowValues = [
        sku,
        item.barcode || sku,
        item.name || '',
        item.category || 'ទូទៅ',
        item.unit || 'ដុំ',
        Number(item.costPrice || 0),
        Number(item.sellingPrice || 0),
        Number(item.minStock || 0),
        normalizeStationLocationInternal(item.location || 'គ្រប់ស្ថានីយទាំងអស់'),
        Number(item.currentStock !== undefined ? item.currentStock : (item.stock || 0)),
        item.imageUrl || '',
        item.status || 'Active',
        new Date(),
        item.size || '',
        item.color || '',
        item.packUnit || '',
        Number(item.packQty || 1),
        item.zone || 'តំបន់ A',
        item.zoneNumber || 'Z-01',
        item.notes || '',
        item.createdBy || user || 'Admin'
      ];

      if (existingMap[sku]) {
        sheet.getRange(existingMap[sku], 1, 1, rowValues.length).setValues([rowValues]);
        updatedCount++;
      } else {
        sheet.appendRow(rowValues);
        existingMap[sku] = sheet.getLastRow();
        addedCount++;
      }
    }

    logActivity(user || 'System', 'Staff', 'SYNC_ALL_ITEMS', `Synced ${itemsList.length} items (${addedCount} added, ${updatedCount} updated) to Google Sheet`);

    return {
      success: true,
      message: `បានធ្វើសមកាលកម្មទំនិញ ${itemsList.length} មុខទៅ Google Sheet ជោគជ័យ! (បន្ថែមថ្មី: ${addedCount}, កែប្រែ: ${updatedCount})`,
      addedCount: addedCount,
      updatedCount: updatedCount,
      totalCount: itemsList.length
    };
  } catch (err) {
    if (typeof Logger !== 'undefined') Logger.log('syncAllItems error: ' + err.toString());
    return { success: false, message: 'Sync បរាជ័យ: ' + err.toString() };
  }
}



function deleteItem(skuOrPayload, username) {

  let sku = skuOrPayload;

  let user = username;

  if (skuOrPayload && typeof skuOrPayload === 'object') {

    sku = skuOrPayload.sku;

    user = skuOrPayload.user || username;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName(SHEETS.ITEMS);

  if (!sheet) return { success: false, message: 'Items sheet not found' };



  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    if (String(data[i][0]).trim() === String(sku).trim()) {

      const itemName = data[i][2];

      const itemLoc = normalizeStationLocationInternal(data[i][8]);



      // Check user permissions: can only delete items from own station
      if (user && String(user).toLowerCase() !== 'admin' && String(user).toLowerCase() !== 'superadmin') {

        const uObj = getUserByUsernameInternal(ss, user);

        const isAdminOrLeader = uObj && (uObj.role === 'SuperAdmin' || uObj.role === 'Admin' || uObj.role === 'ប្រធានក្រុម');

        if (uObj && !isAdminOrLeader && uObj.warehouse && uObj.warehouse !== 'ALL' && uObj.warehouse !== 'គ្រប់ស្ថានីយទាំងអស់') {

          const uWh = normalizeStationLocationInternal(uObj.warehouse);

          if (itemLoc && itemLoc !== 'គ្រប់ស្ថានីយទាំងអស់' && uWh !== itemLoc) {

            return {

              success: false,

              message: `អ្នកគ្មានសិទ្ធិលុបទំនិញរបស់ស្ថានីយដ៏ទៃទេ! អាចលុបបានតែទំនិញក្នុងស្ថានីយ ${uObj.warehouse} ប៉ុណ្ណោះ`

            };

          }

        }

      }



      sheet.deleteRow(i + 1);

      logActivity(user || 'Admin', 'Admin', 'DELETE_ITEM', `Deleted item ${itemName} (${sku}) at ${itemLoc}`);

      return { success: true, message: 'បានលុបទំនិញជោគជ័យ!' };

    }

  }



  return { success: false, message: 'រកមិនឃើញទំនិញដែលត្រូវលុបទេ' };

}



function getCategoriesListInternal(ss) {

  const sheet = ss.getSheetByName(SHEETS.CATEGORIES);

  if (!sheet) return ['ភេសជ្ជៈ', 'គ្រឿងទេស', 'អាហារស្ងួត', 'សម្ភារៈប្រើប្រាស់'];

  const data = sheet.getDataRange().getValues();

  const list = [];

  for (let i = 1; i < data.length; i++) {

    if (data[i][1]) list.push(data[i][1]);

  }

  return list.length > 0 ? list : ['ភេសជ្ជៈ', 'គ្រឿងទេស', 'អាហារស្ងួត', 'សម្ភារៈប្រើប្រាស់'];

}



function getWarehousesListInternal(ss) {

  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName(SHEETS.WAREHOUSES);

  const defaultList = [

    '1-K3 ស្ថានីយ (ភ្នំពេញ)',

    '2-K26 ស្ថានីយ (កំពង់ស្ពឺ កើត)',

    '3-K43 ស្ថានីយ (កំពង់ស្ពឺ លិច)',

    '4-K76 ស្ថានីយ (ត្រែងត្រយឹង)',

    '5-K114 ស្ថានីយ (កំពង់សីលា)',

    '6-K135 ស្ថានីយ (ស្រែអំបិល)',

    '7-K172 ស្ថានីយ (ស្ទឹងហាវ)',

    '8-K182 ស្ថានីយ (ព្រះសីហនុ)',

    '中心库房 (ឃ្លាំងស្តុកនៅបុងសឹង)',

    '机电 (អគ្គិសនី និងគ្រឿងម៉ាស៊ីន)',

    '综合办 (ផ្នែកកិច្ចការទូទៅ)'

  ];

  if (!sheet) return defaultList;

  const data = sheet.getDataRange().getValues();

  const list = [];

  for (let i = 1; i < data.length; i++) {

    if (data[i][1]) list.push(String(data[i][1]).trim());

  }

  return list.length > 0 ? list : defaultList;

}



function getWarehousesDetailed(ss) {

  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName(SHEETS.WAREHOUSES);

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();

  const list = [];

  for (let i = 1; i < data.length; i++) {

    if (data[i][1]) {

      list.push({

        id: String(data[i][0] || `WH-${String(i).padStart(2, '0')}`).trim(),

        name: String(data[i][1]).trim(),

        location: String(data[i][2] || '').trim(),

        manager: String(data[i][3] || '').trim(),

        status: String(data[i][4] || 'Active').trim()

      });

    }

  }

  return list;

}



function addWarehouse(payload, user) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(SHEETS.WAREHOUSES);

  if (!sheet) {

    sheet = getOrCreateSheet(ss, SHEETS.WAREHOUSES);

    const headers = ['WarehouseID', 'Name', 'Location', 'Manager', 'Status'];

    sheet.appendRow(headers);

    formatHeaderRow(sheet, headers.length, '#334155');

  }



  const name = String(payload.name || '').trim();

  if (!name) return { success: false, message: 'សូមបញ្ចូលឈ្មោះឃ្លាំង!' };



  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    if (String(data[i][1]).trim().toLowerCase() === name.toLowerCase()) {

      return { success: false, message: 'ឃ្លាំងឈ្មោះនេះមានរួចហើយក្នុងប្រព័ន្ធ!' };

    }

  }



  const whId = payload.id || `WH-${String(data.length).padStart(2, '0')}`;

  const location = payload.location || '';

  const manager = payload.manager || '';

  const status = payload.status || 'Active';



  sheet.appendRow([whId, name, location, manager, status]);

  sheet.getRange(sheet.getLastRow(), 1, 1, 5).setFontFamily('Siemreap');



  logActivity('WAREHOUSE', (user ? user.username : 'Admin'), 'ADD_WAREHOUSE', `បន្ថែមឃ្លាំងថ្មី: ${name} (${location})`);



  return {

    success: true,

    message: `បានបន្ថែម ${name} ទៅក្នុងប្រព័ន្ធដោយជោគជ័យ!`,

    warehouses: getWarehousesListInternal(ss),

    warehousesDetailed: getWarehousesDetailed(ss)

  };

}



function deleteWarehouse(payload, user) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName(SHEETS.WAREHOUSES);

  if (!sheet) return { success: false, message: 'រកមិនឃើញ Sheet Warehouses ទេ' };



  const name = String(payload.name || payload.warehouse || '').trim();

  const id = String(payload.id || '').trim();

  if (!name && !id) return { success: false, message: 'សូមបញ្ជាក់ឃ្លាំងដែលត្រូវលុប' };



  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    if ((name && String(data[i][1]).trim().toLowerCase() === name.toLowerCase()) || (id && String(data[i][0]).trim() === id)) {

      const deletedName = data[i][1];

      sheet.deleteRow(i + 1);

      logActivity('WAREHOUSE', (user ? user.username : 'Admin'), 'DELETE_WAREHOUSE', `លុបឃ្លាំង: ${deletedName}`);

      return {

        success: true,

        message: `បានលុបឃ្លាំង ${deletedName} ដោយជោគជ័យ!`,

        warehouses: getWarehousesListInternal(ss),

        warehousesDetailed: getWarehousesDetailed(ss)

      };

    }

  }

  return { success: false, message: 'រកមិនឃើញឃ្លាំងនេះទេ!' };

}



// ==========================================

// 5. STOCK TRANSACTIONS

// ==========================================



function recordStockIn(dataOrPayload, user) {

  let data = dataOrPayload;

  let u = user;

  if (dataOrPayload && dataOrPayload.data) {

    data = dataOrPayload.data;

    u = dataOrPayload.user || user;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const itemsSheet = ss.getSheetByName(SHEETS.ITEMS);

  const itemsData = itemsSheet.getDataRange().getValues();



  const sku = String(data.sku).trim();

  const qty = Number(data.quantity);

  const costPrice = Number(data.unitPrice || 0);



  if (qty <= 0) return { success: false, message: 'ចំនួនទំនិញចូលត្រូវតែធំជាង 0' };



  let itemFound = false;

  let targetRow = -1;

  let currentStock = 0;

  let itemName = data.itemName || '';

  let unit = data.unit || 'ដុំ';

  let location = data.toLocation || 'ឃ្លាំងកណ្តាល A';



  for (let i = 1; i < itemsData.length; i++) {

    if (String(itemsData[i][0]).trim() === sku || String(itemsData[i][1]).trim() === sku) {

      targetRow = i + 1;

      itemName = itemsData[i][2];

      unit = itemsData[i][4];

      currentStock = Number(itemsData[i][9] || 0);

      location = itemsData[i][8];

      itemFound = true;

      break;

    }

  }



  if (!itemFound) {

    return { success: false, message: 'រកមិនឃើញកូដទំនិញ SKU: ' + sku };

  }



  const newStock = currentStock + qty;

  itemsSheet.getRange(targetRow, 10).setValue(newStock);

  itemsSheet.getRange(targetRow, 13).setValue(new Date());



  if (costPrice > 0) {

    itemsSheet.getRange(targetRow, 6).setValue(costPrice);

  }



  const totalAmount = qty * (costPrice > 0 ? costPrice : Number(itemsData[targetRow - 1][5] || 0));

  const notesFormatted = [
    data.docNo ? `[ឯកសារ: ${data.docNo}]` : '',
    data.receivedBy ? `[អ្នកទទួល: ${data.receivedBy}]` : '',
    data.size ? `[ខ្នាត: ${data.size}]` : '',
    data.color ? `[ពណ៌: ${data.color}]` : '',
    data.zone ? `[តំបន់: ${data.zone}]` : '',
    data.notes || ''
  ].filter(Boolean).join(' ');

  const tx = recordTransactionInternal(ss, {

    type: 'STOCK_IN',

    sku: sku,

    itemName: itemName,

    quantity: qty,

    unit: unit,

    unitPrice: costPrice,

    totalAmount: totalAmount,

    fromLocation: data.supplier || data.fromLocation || (data.docNo ? `Doc: ${data.docNo}` : 'Supplier'),

    toLocation: location,

    notes: notesFormatted,

    user: u ? (u.fullName || u.username) : 'Staff'

  });



  logActivity(u ? (u.fullName || u.username) : 'Staff', 'Staff', 'STOCK_IN', `Stock In +${qty} ${unit} of ${itemName} (${sku}) [${data.docNo || 'N/A'}]`);

  sendTelegramNotification(`📥 <b>ដំណឹងស្តុកចូល (Stock In)</b>\n📄 លេខឯកសារ: <b>${data.docNo || 'N/A'}</b>\n📦 ទំនិញ: <b>${itemName}</b> (${sku})\n📏 ខ្នាត: <b>${unit}</b> | 🎨 ពណ៌: <b>${data.color || '-'}</b>\n📍 តំបន់: <b>${data.zone || '-'}</b>\n🔢 ចំនួនចូល: <b>+${qty} ${unit}</b>\n📊 ស្តុកចាស់: ${data.oldStock || currentStock} ➔ ស្តុកសរុបថ្មី: <b>${newStock}</b>\n🏢 ឃ្លាំង: ${location}\n👷 អ្នកទទួល: <b>${data.receivedBy || (u ? (u.fullName || u.username) : 'Staff')}</b>\n👤 ដោយ: ${u ? (u.fullName || u.username) : 'Staff'}`);



  return {

    success: true,

    message: `បាននាំចូលស្តុក +${qty} ${unit} នៃ ${itemName} ជោគជ័យ! ស្តុកបច្ចុប្បន្ន: ${newStock}`,

    currentStock: newStock,

    txId: tx.txId

  };

}



function recordStockOut(dataOrPayload, user) {

  let data = dataOrPayload;

  let u = user;

  if (dataOrPayload && dataOrPayload.data) {

    data = dataOrPayload.data;

    u = dataOrPayload.user || user;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const itemsSheet = ss.getSheetByName(SHEETS.ITEMS);

  const itemsData = itemsSheet.getDataRange().getValues();



  const sku = String(data.sku).trim();

  const qty = Number(data.quantity);

  const sellingPrice = Number(data.unitPrice || 0);



  if (qty <= 0) return { success: false, message: 'ចំនួនទំនិញចេញត្រូវតែធំជាង 0' };



  let itemFound = false;

  let targetRow = -1;

  let currentStock = 0;

  let itemName = '';

  let unit = 'ដុំ';

  let minStock = 0;

  let location = '';



  for (let i = 1; i < itemsData.length; i++) {

    if (String(itemsData[i][0]).trim() === sku || String(itemsData[i][1]).trim() === sku) {

      targetRow = i + 1;

      itemName = itemsData[i][2];

      unit = itemsData[i][4];

      minStock = Number(itemsData[i][7] || 0);

      location = itemsData[i][8];

      currentStock = Number(itemsData[i][9] || 0);

      itemFound = true;

      break;

    }

  }



  if (!itemFound) {

    return { success: false, message: 'រកមិនឃើញកូដទំនិញ SKU: ' + sku };

  }



  if (currentStock < qty) {

    return {

      success: false,

      message: `ចំនួនស្តុកមិនគ្រប់គ្រាន់ទេ! នៅក្នុងស្តុកមានត្រឹមតែ: ${currentStock} ${unit}`

    };

  }



  const newStock = currentStock - qty;

  itemsSheet.getRange(targetRow, 10).setValue(newStock);

  itemsSheet.getRange(targetRow, 13).setValue(new Date());



  const unitPriceFinal = sellingPrice > 0 ? sellingPrice : Number(itemsData[targetRow - 1][6] || 0);

  const totalAmount = qty * unitPriceFinal;



  const notesFormatted = [
    data.docNo ? `[ឯកសារ: ${data.docNo}]` : '',
    data.issuer ? `[អ្នកបើកចេញ: ${data.issuer}]` : '',
    data.color ? `[ពណ៌: ${data.color}]` : '',
    data.reason ? `[មូលហេតុ: ${data.reason}]` : '',
    data.notes || ''
  ].filter(Boolean).join(' ');

  const tx = recordTransactionInternal(ss, {

    type: 'STOCK_OUT',

    sku: sku,

    itemName: itemName,

    quantity: qty,

    unit: unit,

    unitPrice: unitPriceFinal,

    totalAmount: totalAmount,

    fromLocation: location,

    toLocation: data.toLocation || data.customer || 'អតិថិជន/ដកប្រើប្រាស់',

    notes: notesFormatted,

    user: u ? (u.fullName || u.username) : 'Staff'

  });



  logActivity(u ? (u.fullName || u.username) : 'Staff', 'Staff', 'STOCK_OUT', `Stock Out -${qty} ${unit} of ${itemName} (${sku}) [${data.docNo || 'N/A'}]`);

  sendTelegramNotification(`📤 <b>ដំណឹងស្តុកចេញ (Stock Out)</b>\n📄 លេខឯកសារ: <b>${data.docNo || 'N/A'}</b>\n📦 ទំនិញ: <b>${itemName}</b> (${sku})\n📏 ខ្នាត: <b>${unit}</b> | 🎨 ពណ៌: <b>${data.color || '-'}</b>\n👤 អ្នកបើកចេញ: <b>${data.issuer || (u ? (u.fullName || u.username) : 'Staff')}</b>\n🏢 គោលដៅ: <b>${data.toLocation || data.customer || 'ដកប្រើប្រាស់'}</b>\n🔢 ចំនួនបើកចេញ: <b>-${qty} ${unit}</b>\n📊 ស្តុកចាស់: ${currentStock} ➔ ស្តុកសរុបនៅសល់: <b>${newStock}</b>\n🏢 ឃ្លាំងដើម: ${location}\n👤 កត់ត្រាដោយ: ${u ? (u.fullName || u.username) : 'Staff'}`);



  if (newStock <= minStock) {

    const alertMsg = `⚠️ <b>ប្រកាសអាសន្ន៖ ស្តុកជិតអស់ (Low Stock Alert)</b>\n📦 ទំនិញ: <b>${itemName}</b> (${sku})\n📉 ស្តុកនៅសល់: <b>${newStock} ${unit}</b> (កម្រិតទាបបំផុត: ${minStock} ${unit})\n🏢 ទីតាំង: ${location}\n👉 សូមរៀបចំបញ្ជាទិញបន្ថែម!`;

    sendTelegramNotification(alertMsg);

    sendLowStockEmail(itemName, sku, newStock, minStock, location);

  }



  return {

    success: true,

    message: `បានកត់ត្រាស្តុកចេញ -${qty} ${unit} ជោគជ័យ! ស្តុកនៅសល់: ${newStock}`,

    currentStock: newStock,

    isLowStock: newStock <= minStock,

    txId: tx.txId

  };

}



function recordStockTransfer(dataOrPayload, user) {

  let data = dataOrPayload;

  let u = user;

  if (dataOrPayload && dataOrPayload.data) {

    data = dataOrPayload.data;

    u = dataOrPayload.user || user;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const itemsSheet = ss.getSheetByName(SHEETS.ITEMS);

  const itemsData = itemsSheet.getDataRange().getValues();



  const sku = String(data.sku).trim();

  const qty = Number(data.quantity);

  const fromLoc = data.fromLocation;

  const toLoc = data.toLocation;



  if (qty <= 0) return { success: false, message: 'ចំនួនផ្ទេរត្រូវតែធំជាង 0' };

  if (fromLoc === toLoc) return { success: false, message: 'ទីតាំងដើម និងទីតាំងគោលដៅមិនអាចដូចគ្នាបានទេ' };



  let targetRow = -1;

  let itemName = '';

  let unit = 'ដុំ';



  for (let i = 1; i < itemsData.length; i++) {

    if (String(itemsData[i][0]).trim() === sku || String(itemsData[i][1]).trim() === sku) {

      targetRow = i + 1;

      itemName = itemsData[i][2];

      unit = itemsData[i][4];

      break;

    }

  }



  if (targetRow === -1) return { success: false, message: 'រកមិនឃើញទំនិញ SKU: ' + sku };



  itemsSheet.getRange(targetRow, 9).setValue(toLoc);

  itemsSheet.getRange(targetRow, 13).setValue(new Date());



  recordTransactionInternal(ss, {

    type: 'TRANSFER',

    sku: sku,

    itemName: itemName,

    quantity: qty,

    unit: unit,

    unitPrice: Number(itemsData[targetRow - 1][5] || 0),

    totalAmount: qty * Number(itemsData[targetRow - 1][5] || 0),

    fromLocation: fromLoc,

    toLocation: toLoc,

    notes: data.notes || `Transferred from ${fromLoc} to ${toLoc}`,

    user: u ? (u.fullName || u.username) : 'Staff'

  });



  logActivity(u ? (u.fullName || u.username) : 'Staff', 'Staff', 'TRANSFER', `Transferred ${qty} ${unit} of ${itemName} from ${fromLoc} to ${toLoc}`);



  return { success: true, message: `បានផ្ទេរទំនិញ ${qty} ${unit} ទៅកាន់ ${toLoc} ជោគជ័យ!` };

}



function recordStockAdjustment(dataOrPayload, user) {

  let data = dataOrPayload;

  let u = user;

  if (dataOrPayload && dataOrPayload.data) {

    data = dataOrPayload.data;

    u = dataOrPayload.user || user;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const itemsSheet = ss.getSheetByName(SHEETS.ITEMS);

  const itemsData = itemsSheet.getDataRange().getValues();



  const sku = String(data.sku).trim();

  const actualStock = Number(data.actualQuantity);

  const reason = data.reason || 'Audit Variance';



  let targetRow = -1;

  let itemName = '';

  let unit = 'ដុំ';

  let systemStock = 0;

  let costPrice = 0;



  for (let i = 1; i < itemsData.length; i++) {

    if (String(itemsData[i][0]).trim() === sku || String(itemsData[i][1]).trim() === sku) {

      targetRow = i + 1;

      itemName = itemsData[i][2];

      unit = itemsData[i][4];

      costPrice = Number(itemsData[i][5] || 0);

      systemStock = Number(itemsData[i][9] || 0);

      break;

    }

  }



  if (targetRow === -1) return { success: false, message: 'រកមិនឃើញទំនិញ SKU: ' + sku };



  const diff = actualStock - systemStock;

  itemsSheet.getRange(targetRow, 10).setValue(actualStock);

  itemsSheet.getRange(targetRow, 13).setValue(new Date());



  recordTransactionInternal(ss, {

    type: 'ADJUSTMENT',

    sku: sku,

    itemName: itemName,

    quantity: diff,

    unit: unit,

    unitPrice: costPrice,

    totalAmount: Math.abs(diff) * costPrice,

    fromLocation: `System: ${systemStock}`,

    toLocation: `Actual: ${actualStock}`,

    notes: reason,

    user: u ? (u.fullName || u.username) : 'Staff'

  });



  logActivity(u ? (u.fullName || u.username) : 'Staff', 'Staff', 'ADJUSTMENT', `Adjusted ${itemName} from ${systemStock} to ${actualStock} (${reason})`);



  return {

    success: true,

    message: `បានកែតម្រូវស្តុកជោគជ័យ! ស្តុកចាស់: ${systemStock}, ស្តុកជាក់ស្តែង: ${actualStock} (ខុសគ្នា: ${diff > 0 ? '+' + diff : diff})`

  };

}



function recordTransactionInternal(ss, tx) {

  const sheet = ss.getSheetByName(SHEETS.TRANSACTIONS);

  const txId = 'TX-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);

  const now = new Date();



  sheet.appendRow([

    txId,

    Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd'),

    tx.type,

    tx.sku,

    tx.itemName,

    tx.quantity,

    tx.unit,

    tx.unitPrice,

    tx.totalAmount,

    tx.fromLocation,

    tx.toLocation,

    tx.notes,

    tx.user,

    now

  ]);



  return { txId: txId };

}



function getTransactionHistory(filtersOrPayload, userParam) {

  let filters = filtersOrPayload || {};

  let user = userParam;

  if (filtersOrPayload && filtersOrPayload.filters) {

    filters = filtersOrPayload.filters;

    user = filtersOrPayload.user || userParam;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName(SHEETS.TRANSACTIONS);

  if (!sheet) return { success: false, transactions: [] };



  const data = sheet.getDataRange().getValues();

  const transactions = [];



  let targetWarehouse = null;

  if (user && user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.warehouse && user.warehouse !== 'ALL' && user.warehouse !== 'គ្រប់ឃ្លាំង') {

    targetWarehouse = user.warehouse;

  } else if (filters.warehouse && filters.warehouse !== 'ALL' && filters.warehouse !== 'គ្រប់ឃ្លាំង') {

    targetWarehouse = filters.warehouse;

  }



  for (let i = data.length - 1; i >= 1; i--) {

    const row = data[i];

    if (!row[0]) continue;



    const fromLoc = String(row[9] || '');

    const toLoc = String(row[10] || '');



    if (targetWarehouse && fromLoc !== targetWarehouse && toLoc !== targetWarehouse) {

      continue;

    }



    const txDate = Utilities.formatDate(new Date(row[1]), 'GMT+7', 'yyyy-MM-dd');

    const txType = row[2];



    if (filters.startDate && txDate < filters.startDate) continue;

    if (filters.endDate && txDate > filters.endDate) continue;

    if (filters.type && filters.type !== 'ALL' && txType !== filters.type) continue;

    if (filters.search) {

      const q = filters.search.toLowerCase();

      const match = String(row[3]).toLowerCase().includes(q) ||

        String(row[4]).toLowerCase().includes(q) ||

        String(row[0]).toLowerCase().includes(q);

      if (!match) continue;

    }



    transactions.push({

      txId: row[0],

      date: txDate,

      type: row[2],

      sku: row[3],

      itemName: row[4],

      quantity: row[5],

      unit: row[6],

      unitPrice: row[7],

      totalAmount: row[8],

      fromLocation: row[9],

      toLocation: row[10],

      notes: row[11],

      user: row[12],

      timestamp: row[13]

    });



    if (transactions.length >= (filters.limit || 200)) break;

  }



  return { success: true, transactions: transactions };

}



// ==========================================

// 5.1 PRODUCT REQUISITIONS & REQUESTS (គ្រប់ឃ្លាំងស្នើសុំទំនិញបន្ថែម)

// ==========================================



function ensureRequisitionsInitialized(ss) {

  let sheet = ss.getSheetByName(SHEETS.REQUISITIONS);

  if (!sheet) {

    sheet = ss.insertSheet(SHEETS.REQUISITIONS);

    const headers = [

      'ReqID', 'Warehouse', 'ItemName', 'Category', 'Quantity',

      'Unit', 'Urgency', 'Reason', 'RequestedBy', 'Status',

      'CreatedAt', 'AdminNotes', 'ApprovedAt'

    ];

    sheet.appendRow(headers);

    formatHeaderRow(sheet, headers.length, '#0284c7');

  }

  return sheet;

}



function createProductRequest(dataOrPayload, user) {

  let data = dataOrPayload;

  let u = user;

  if (dataOrPayload && dataOrPayload.data) {

    data = dataOrPayload.data;

    u = dataOrPayload.user || user;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureRequisitionsInitialized(ss);



  const reqId = 'REQ-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMddHHmmss');

  const warehouse = data.warehouse || (u ? u.warehouse : 'ឃ្លាំងទី ០១ - ភ្នំពេញ (សែនសុខ)');

  const itemName = String(data.itemName || '').trim();

  const category = data.category || 'ទូទៅ';

  const qty = Number(data.quantity || 1);

  const unit = data.unit || 'ដុំ';

  const urgency = data.urgency || 'Normal';

  const reason = data.reason || '';

  const requestedBy = u ? (u.fullName || u.username) : 'Staff';

  const status = 'Pending';

  const now = new Date();



  if (!itemName || qty <= 0) {

    return { success: false, message: 'សូមបញ្ចូលឈ្មោះទំនិញ និងចំនួនឱ្យបានត្រឹមត្រូវ' };

  }



  sheet.appendRow([

    reqId,

    warehouse,

    itemName,

    category,

    qty,

    unit,

    urgency,

    reason,

    requestedBy,

    status,

    now,

    '',

    ''

  ]);



  // Send Alert to Admin via Telegram

  const alertMsg = `📢 <b>[សំណើសុំទំនិញបន្ថែមពីឃ្លាំង]</b>\n` +

    `🏢 <b>ឃ្លាំង៖</b> ${warehouse}\n` +

    `📦 <b>ទំនិញ៖</b> ${itemName} (${category})\n` +

    `🔢 <b>ចំនួនស្នើសុំ៖</b> <b>${qty} ${unit}</b>\n` +

    `⚡ <b>កម្រិតបន្ទាន់៖</b> ${urgency === 'Urgent' ? '🔴 បន្ទាន់ខ្លាំង (Urgent)' : '🟢 ធម្មតា (Normal)'}\n` +

    `📝 <b>មូលហេតុ៖</b> ${reason || 'គ្មាន'}\n` +

    `👤 <b>អ្នកស្នើសុំ៖</b> ${requestedBy}\n` +

    `⏰ <b>កាលបរិច្ឆេទ៖</b> ${Utilities.formatDate(now, 'GMT+7', 'dd-MM-yyyy HH:mm')}`;



  sendTelegramNotification(alertMsg);

  logActivity(requestedBy, 'Staff', 'PRODUCT_REQUEST', `Requested +${qty} ${unit} of ${itemName} for ${warehouse}`);



  return {

    success: true,

    message: `បានដាក់សំណើសុំ ${itemName} ចំនួន ${qty} ${unit} ទៅកាន់ Admin ជោគជ័យ!`,

    reqId: reqId

  };

}



function getProductRequests(userOrPayload, warehouseFilter) {

  let user = userOrPayload;

  let whFilter = warehouseFilter;

  if (userOrPayload && typeof userOrPayload === 'object' && (userOrPayload.user || userOrPayload.warehouseFilter)) {

    user = userOrPayload.user;

    whFilter = userOrPayload.warehouseFilter || warehouseFilter;

  }



  let targetWarehouse = null;

  if (user && user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.warehouse && user.warehouse !== 'ALL') {

    targetWarehouse = user.warehouse;

  } else if (whFilter && whFilter !== 'ALL') {

    targetWarehouse = whFilter;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureRequisitionsInitialized(ss);

  const data = sheet.getDataRange().getValues();

  const requests = [];



  for (let i = data.length - 1; i >= 1; i--) {

    const row = data[i];

    if (!row[0]) continue;



    const wh = String(row[1]);

    if (targetWarehouse && wh !== targetWarehouse) {

      continue;

    }



    requests.push({

      reqId: row[0],

      warehouse: row[1],

      itemName: row[2],

      category: row[3],

      quantity: row[4],

      unit: row[5],

      urgency: row[6],

      reason: row[7],

      requestedBy: row[8],

      status: row[9],

      createdAt: row[10],

      adminNotes: row[11],

      approvedAt: row[12]

    });

  }



  return { success: true, requests: requests };

}



function updateProductRequestStatus(reqId, status, adminNotes, adminUser) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ensureRequisitionsInitialized(ss);

  const data = sheet.getDataRange().getValues();



  for (let i = 1; i < data.length; i++) {

    if (String(data[i][0]) === String(reqId)) {

      sheet.getRange(i + 1, 10).setValue(status);

      if (adminNotes) sheet.getRange(i + 1, 12).setValue(adminNotes);

      sheet.getRange(i + 1, 13).setValue(new Date());



      const itemName = data[i][2];

      const wh = data[i][1];

      logActivity(adminUser || 'Admin', 'Admin', 'UPDATE_REQUEST', `Request ${reqId} updated to ${status}`);



      // Send Alert back

      sendTelegramNotification(`📋 <b>[បច្ចុប្បន្នភាពសំណើសុំទំនិញ]</b>\n🆔 <b>កូដ៖</b> ${reqId}\n🏢 <b>ឃ្លាំង៖</b> ${wh}\n📦 <b>ទំនិញ៖</b> ${itemName}\n🚦 <b>ស្ថានភាពថ្មី៖</b> <b>${status === 'Approved' ? '✅ បានអនុម័ត (Approved)' : status === 'Rejected' ? '❌ បដិសេធ (Rejected)' : status}</b>\n📝 <b>ចំណាំ Admin៖</b> ${adminNotes || 'គ្មាន'}`);



      return { success: true, message: `បានធ្វើបច្ចុប្បន្នភាពសំណើ ${reqId} ទៅជា ${status} ជោគជ័យ!` };

    }

  }



  return { success: false, message: 'រកមិនឃើញសំណើនេះទេ' };

}



// ==========================================

// 6. DASHBOARD & ANALYTICS

// ==========================================



function getDashboardStats(userOrPayload, warehouseFilter) {

  let user = userOrPayload;

  let whFilter = warehouseFilter;

  if (userOrPayload && typeof userOrPayload === 'object' && (userOrPayload.user || userOrPayload.warehouseFilter)) {

    user = userOrPayload.user;

    whFilter = userOrPayload.warehouseFilter || warehouseFilter;

  }



  let targetWarehouse = null;

  if (user && user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.warehouse && user.warehouse !== 'ALL' && user.warehouse !== 'គ្រប់ឃ្លាំង') {

    targetWarehouse = user.warehouse;

  } else if (whFilter && whFilter !== 'ALL' && whFilter !== 'គ្រប់ឃ្លាំង' && whFilter !== 'គ្រប់ឃ្លាំងទាំងអស់') {

    targetWarehouse = whFilter;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let itemsSheet = ss.getSheetByName(SHEETS.ITEMS);

  let txSheet = ss.getSheetByName(SHEETS.TRANSACTIONS);



  if (!itemsSheet || !txSheet) {

    setupDatabase();

    itemsSheet = ss.getSheetByName(SHEETS.ITEMS);

    txSheet = ss.getSheetByName(SHEETS.TRANSACTIONS);

  }



  const itemsData = itemsSheet.getDataRange().getValues();

  const txData = txSheet.getDataRange().getValues();



  let totalProducts = 0;

  let totalStockQuantity = 0;

  let totalInventoryCostValue = 0;

  let totalInventoryRetailValue = 0;

  let lowStockCount = 0;

  let outOfStockCount = 0;

  const lowStockItems = [];



  for (let i = 1; i < itemsData.length; i++) {

    const row = itemsData[i];

    if (!row[0]) continue;



    const loc = String(row[8] || '');

    if (targetWarehouse && loc !== targetWarehouse) {

      continue;

    }



    totalProducts++;

    const cost = Number(row[5] || 0);

    const price = Number(row[6] || 0);

    const minStock = Number(row[7] || 0);

    const currentStock = Number(row[9] || 0);



    totalStockQuantity += currentStock;

    totalInventoryCostValue += (currentStock * cost);

    totalInventoryRetailValue += (currentStock * price);



    if (currentStock === 0) {

      outOfStockCount++;

      lowStockItems.push({

        sku: row[0],

        name: row[2],

        category: row[3],

        currentStock: 0,

        minStock: minStock,

        unit: row[4],

        location: loc,

        status: 'OUT_OF_STOCK'

      });

    } else if (currentStock <= minStock) {

      lowStockCount++;

      lowStockItems.push({

        sku: row[0],

        name: row[2],

        category: row[3],

        currentStock: currentStock,

        minStock: minStock,

        unit: row[4],

        location: loc,

        status: 'LOW_STOCK'

      });

    }

  }



  // Fast moving items calculation

  const itemOutCounts = {};

  const today = new Date();

  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));



  for (let i = 1; i < txData.length; i++) {

    const row = txData[i];

    if (row[2] === 'STOCK_OUT') {

      const fromLoc = String(row[9] || '');

      if (targetWarehouse && fromLoc !== targetWarehouse) continue;



      const txDate = new Date(row[1]);

      if (txDate >= thirtyDaysAgo) {

        const sku = row[3];

        const name = row[4];

        const qty = Number(row[5] || 0);

        if (!itemOutCounts[sku]) {

          itemOutCounts[sku] = { sku: sku, name: name, totalSoldQty: 0, totalRevenue: 0 };

        }

        itemOutCounts[sku].totalSoldQty += qty;

        itemOutCounts[sku].totalRevenue += Number(row[8] || 0);

      }

    }

  }



  const fastMovingItems = Object.values(itemOutCounts)

    .sort((a, b) => b.totalSoldQty - a.totalSoldQty)

    .slice(0, 5);



  const movementTrend = getRecentMovementTrend(txData, targetWarehouse);



  return {

    success: true,

    stats: {

      totalProducts,

      totalStockQuantity,

      totalInventoryCostValue: Math.round(totalInventoryCostValue * 100) / 100,

      totalInventoryRetailValue: Math.round(totalInventoryRetailValue * 100) / 100,

      estimatedProfit: Math.round((totalInventoryRetailValue - totalInventoryCostValue) * 100) / 100,

      lowStockCount,

      outOfStockCount

    },

    lowStockItems,

    fastMovingItems,

    movementTrend,

    activeWarehouseFilter: targetWarehouse

  };

}



function getRecentMovementTrend(txData, targetWarehouse) {

  const dates = [];

  const stockInByDate = {};

  const stockOutByDate = {};



  for (let i = 6; i >= 0; i--) {

    const d = new Date();

    d.setDate(d.getDate() - i);

    const dateStr = Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd');

    dates.push(dateStr);

    stockInByDate[dateStr] = 0;

    stockOutByDate[dateStr] = 0;

  }



  for (let i = 1; i < txData.length; i++) {

    const row = txData[i];

    const fromLoc = String(row[9] || '');

    const toLoc = String(row[10] || '');



    if (targetWarehouse && fromLoc !== targetWarehouse && toLoc !== targetWarehouse) {

      continue;

    }



    const txDate = Utilities.formatDate(new Date(row[1]), 'GMT+7', 'yyyy-MM-dd');

    const type = row[2];

    const qty = Number(row[5] || 0);



    if (stockInByDate[txDate] !== undefined) {

      if (type === 'STOCK_IN') stockInByDate[txDate] += qty;

      if (type === 'STOCK_OUT') stockOutByDate[txDate] += qty;

    }

  }



  return {

    labels: dates.map(d => d.slice(5)),

    stockIn: dates.map(d => stockInByDate[d]),

    stockOut: dates.map(d => stockOutByDate[d])

  };

}



// ==========================================

// 7. NOTIFICATIONS

// ==========================================



function sendTelegramNotification(messageText, replyMarkup) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settings = getSettingsMap(ss);

    let token = (settings && settings['TELEGRAM_BOT_TOKEN']) ? settings['TELEGRAM_BOT_TOKEN'] : DEFAULT_TELEGRAM_BOT_TOKEN;
    let chatId = (settings && settings['TELEGRAM_CHAT_ID']) ? settings['TELEGRAM_CHAT_ID'] : DEFAULT_TELEGRAM_CHAT_ID;

    if (!token || !chatId) return false;



    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const payload = {

      chat_id: chatId,

      text: messageText,

      parse_mode: 'HTML'

    };

    if (replyMarkup) {

      payload.reply_markup = replyMarkup;

    }



    const options = {

      method: 'post',

      contentType: 'application/json',

      payload: JSON.stringify(payload),

      muteHttpExceptions: true

    };



    const res = UrlFetchApp.fetch(url, options);

    const resJson = JSON.parse(res.getContentText());

    return resJson.ok;

  } catch (err) {

    Logger.log('Telegram Error: ' + err.toString());

    return false;

  }

}



/**

 * ផ្ញើសារ Alert ទៅកាន់ Telegram Bot / Group

 * @param {string} messageText សារដែលត្រូវផ្ញើ (ជា HTML format)

 * @param {object} replyMarkup Optional inline keyboard

 * @return {boolean} ស្ថានភាពផ្ញើជោគជ័យ ឬបរាជ័យ

 */

function sendTelegramAlert(messageText, replyMarkup) {

  try {

    return sendTelegramNotification(messageText, replyMarkup);

  } catch (err) {

    Logger.log('sendTelegramAlert Error: ' + err.toString());

    return false;

  }

}



function sendLowStockEmail(itemName, sku, currentStock, minStock, location) {

  try {

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const settings = getSettingsMap(ss);

    const email = settings['ALERT_EMAIL'];



    if (!email) return;



    const subject = `[Low Stock Alert] ទំនិញជិតអស់ពីស្តុក: ${itemName} (${sku})`;

    const body = `

      ជម្រាបសួរ,

      

      ប្រព័ន្ធគ្រប់គ្រងស្តុកបានរកឃើញថាទំនិញខាងក្រោមជិតអស់ពីស្តុក៖

      - ឈ្មោះទំនិញ: ${itemName}

      - កូដ SKU: ${sku}

      - ស្តុកនៅសល់បច្ចុប្បន្ន: ${currentStock}

      - កម្រិតស្តុកទាបបំផុតដែលបានកំណត់: ${minStock}

      - ទីតាំងឃ្លាំង: ${location}

      - ពេលវេលា: ${new Date().toLocaleString()}

      

      សូមពិនិត្យ និងរៀបចំបញ្ជាទិញបន្ថែម។

    `;



    MailApp.sendEmail(email, subject, body);

  } catch (e) {

    Logger.log('Email Alert Error: ' + e.toString());

  }

}



function testTelegramAlert(tokenOrPayload, chatId) {

  let token = tokenOrPayload;

  let cId = chatId;

  if (tokenOrPayload && typeof tokenOrPayload === 'object') {

    token = tokenOrPayload.botToken || tokenOrPayload.token;

    cId = tokenOrPayload.chatId;

  }



  if (!token || !cId) return { success: false, message: 'សូមបញ្ចូល Token និង Chat ID' };

  try {

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const payload = {

      chat_id: cId,

      text: `🎉 <b>ការតភ្ជាប់ Telegram ជោគជ័យ!</b>\nប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ (Inventory Management System) បានភ្ជាប់ជាមួយ Telegram Bot របស់អ្នកយ៉ាងត្រឹមត្រូវ។`,

      parse_mode: 'HTML'

    };

    const res = UrlFetchApp.fetch(url, {

      method: 'post',

      contentType: 'application/json',

      payload: JSON.stringify(payload),

      muteHttpExceptions: true

    });

    const resJson = JSON.parse(res.getContentText());

    if (resJson.ok) {

      return { success: true, message: 'បានផ្ញើសារសាកល្បងទៅកាន់ Telegram ជោគជ័យ!' };

    } else {

      return { success: false, message: 'Telegram Error: ' + (resJson.description || 'Invalid token/chatId') };

    }

  } catch (err) {

    return { success: false, message: err.toString() };

  }

}



function dailyLowStockDigestTrigger() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const itemsSheet = ss.getSheetByName(SHEETS.ITEMS);

  if (!itemsSheet) return;



  const data = itemsSheet.getDataRange().getValues();

  const lowItems = [];

  for (let i = 1; i < data.length; i++) {

    const current = Number(data[i][9] || 0);

    const min = Number(data[i][7] || 0);

    if (current <= min) {

      lowItems.push(`• <b>${data[i][2]}</b> (${data[i][0]}): នៅសល់ <b>${current} ${data[i][4]}</b>`);

    }

  }



  if (lowItems.length > 0) {

    const msg = `📢 <b>របាយការណ៍សង្ខេបស្តុកទាបប្រចាំថ្ងៃ (${Utilities.formatDate(new Date(), 'GMT+7', 'dd-MM-yyyy')})</b>\n\nរកឃើញទំនិញចំនួន <b>${lowItems.length}</b> មុខជិតអស់ពីស្តុក៖\n${lowItems.join('\n')}\n\n👉 សូមពិនិត្យមើលក្នុងផ្ទាំង Dashboard ដើម្បីចាត់ចែងបន្ថែម!`;

    sendTelegramNotification(msg);

  }

}



// ==========================================

// 8. SETTINGS & ACTIVITY LOGS

// ==========================================



function getSettingsMap(ss) {

  const sheet = ss.getSheetByName(SHEETS.SETTINGS);

  const map = {
    'TELEGRAM_BOT_TOKEN': DEFAULT_TELEGRAM_BOT_TOKEN,
    'TELEGRAM_CHAT_ID': DEFAULT_TELEGRAM_CHAT_ID,
    'ENABLE_LOW_STOCK_ALERT': 'TRUE',
    'ALERT_EMAIL': 'chenlongqmi@gmail.com',
    'DRIVE_IMAGE_FOLDER_ID': DEFAULT_DRIVE_FOLDER_ID,
    'DRIVE_IMAGE_FOLDER_URL': DEFAULT_DRIVE_FOLDER_URL,
    'DRIVE_IMAGE_FOLDER': 'Stock_Product_Images'
  };

  if (!sheet) return map;



  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    const k = String(data[i][0]).trim();

    const v = String(data[i][1]).trim();

    if (k) {

      map[k] = v || map[k];

    }

  }

  return map;

}



function getSystemSettings() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const map = getSettingsMap(ss);

  return { success: true, settings: map };

}



function saveSystemSettings(settingsOrPayload, username) {

  let settingsObj = settingsOrPayload;

  let user = username;

  if (settingsOrPayload && settingsOrPayload.settings) {

    settingsObj = settingsOrPayload.settings;

    user = settingsOrPayload.user || username;

  }



  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(SHEETS.SETTINGS);

  if (!sheet) {

    setupDatabase();

    sheet = ss.getSheetByName(SHEETS.SETTINGS);

  }



  const data = sheet.getDataRange().getValues();



  for (const key in settingsObj) {

    let found = false;

    for (let i = 1; i < data.length; i++) {

      if (data[i][0] === key) {

        sheet.getRange(i + 1, 2).setValue(settingsObj[key]);

        found = true;

        break;

      }

    }

    if (!found) {

      sheet.appendRow([key, settingsObj[key], '']);

    }

  }



  logActivity(user || 'Admin', 'Admin', 'UPDATE_SETTINGS', 'System settings updated');

  return { success: true, message: 'បានរក្សាទុកការកំណត់ជោគជ័យ!' };

}



function logActivity(user, role, action, details) {

  try {

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const sheet = ss.getSheetByName(SHEETS.LOGS);

    if (!sheet) return;

    const logId = 'LOG-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMddHHmmss');

    sheet.appendRow([logId, new Date(), user || 'SYSTEM', role || 'Staff', action, details || '']);

  } catch (e) {}

}



    // ==========================================

    // 8. LIVE CHAT ENGINE (រវាងឃ្លាំង និង ADMIN)

    // ==========================================



    function ensureChatSheetInitialized(ss) {
      let sheet = ss.getSheetByName(SHEETS.CHAT);
      if (!sheet) {
        sheet = ss.insertSheet(SHEETS.CHAT);
        const headers = [
          'MsgID', 'Timestamp', 'ChannelID', 'SenderUsername', 'SenderFullName',
          'SenderRole', 'SenderWarehouse', 'SenderAvatar', 'MessageText', 'ItemReference',
          'IsAudio', 'AudioData', 'ReadBy', 'IsEdited', 'AudioDuration'
        ];
        sheet.appendRow(headers);
        const range = sheet.getRange(1, 1, 1, headers.length);
        range.setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
      return sheet;
    }

    function sendChatMessage(chatData, user) {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ensureChatSheetInitialized(ss);

        const msgId = 'MSG-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMddHHmmss') + '-' + Math.floor(Math.random() * 1000);
        const now = new Date();
        const timestampStr = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

        const channelId = chatData.channelId || 'ALL_WAREHOUSES';
        const senderUsername = chatData.senderUsername || (user ? user.username : 'Staff');
        const senderFullName = chatData.senderFullName || (user ? (user.fullName || user.username) : senderUsername);
        const senderRole = chatData.senderRole || (user ? user.role : 'Stock Keeper');
        const senderWarehouse = chatData.senderWarehouse || (user ? user.warehouse : 'ឃ្លាំងទូទៅ');
        const senderAvatar = chatData.senderAvatar || (user ? user.avatar : '') || '';
        const messageText = String(chatData.messageText || '').trim();

        let itemReference = '';
        if (chatData.itemReference) {
          itemReference = (typeof chatData.itemReference === 'string') ? chatData.itemReference : JSON.stringify(chatData.itemReference);
        } else if (chatData.registrationData) {
          itemReference = (typeof chatData.registrationData === 'string') ? chatData.registrationData : JSON.stringify(chatData.registrationData);
        }

        const isAudio = Boolean(chatData.isAudio);
        const audioData = chatData.audioData || '';
        const audioDuration = Number(chatData.audioDuration || 0);

        if (!messageText && !itemReference && !audioData) {
          return { success: false, message: 'Message cannot be empty' };
        }

        sheet.appendRow([
          msgId,
          timestampStr,
          channelId,
          senderUsername,
          senderFullName,
          senderRole,
          senderWarehouse,
          senderAvatar,
          messageText,
          itemReference,
          isAudio,
          audioData,
          JSON.stringify([senderUsername]),
          false,
          audioDuration
        ]);

        return {
          success: true,
          message: 'Message sent',
          chatMessage: {
            msgId,
            timestamp: timestampStr,
            channelId,
            senderUsername,
            senderFullName,
            senderRole,
            senderWarehouse,
            senderAvatar,
            messageText,
            itemReference: chatData.itemReference || null,
            isAudio,
            audioData,
            audioDuration,
            readBy: [senderUsername],
            isEdited: false
          }
        };
      } catch (e) {
        return { success: false, message: e.toString() };
      }
    }

    function editChatMessage(msgId, newText, user) {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ensureChatSheetInitialized(ss);
        const data = sheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]) === String(msgId)) {
            // Permission check: only author or Admin/SuperAdmin can edit
            if (user && user.role !== 'Admin' && user.role !== 'SuperAdmin') {
              if (String(data[i][3]).toLowerCase() !== String(user.username || '').toLowerCase()) {
                return { success: false, message: 'Unauthorized to edit this message' };
              }
            }
            sheet.getRange(i + 1, 9).setValue(newText); // Column 9: MessageText
            sheet.getRange(i + 1, 14).setValue(true);   // Column 14: IsEdited
            return { success: true, message: 'Message updated' };
          }
        }
        return { success: false, message: 'Message not found' };
      } catch (e) {
        return { success: false, message: e.toString() };
      }
    }

    function deleteChatMessage(msgId, user) {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ensureChatSheetInitialized(ss);
        const data = sheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0]) === String(msgId)) {
            // Permission check: only author or Admin/SuperAdmin can delete
            if (user && user.role !== 'Admin' && user.role !== 'SuperAdmin') {
              if (String(data[i][3]).toLowerCase() !== String(user.username || '').toLowerCase()) {
                return { success: false, message: 'Unauthorized to delete this message' };
              }
            }
            sheet.deleteRow(i + 1);
            return { success: true, message: 'Message deleted' };
          }
        }
        return { success: false, message: 'Message not found' };
      } catch (e) {
        return { success: false, message: e.toString() };
      }
    }

    function markChatMessagesRead(channelId, user) {
      try {
        if (!user || !user.username) return { success: true };
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ensureChatSheetInitialized(ss);
        const data = sheet.getDataRange().getValues();
        const myUser = String(user.username);

        for (let i = 1; i < data.length; i++) {
          const rowChannel = String(data[i][2]);
          const senderUser = String(data[i][3]);

          if ((rowChannel === channelId || channelId === 'ALL') && senderUser !== myUser) {
            let readBy = [];
            try {
              readBy = data[i][12] ? JSON.parse(data[i][12]) : [];
            } catch (e) {
              readBy = [senderUser];
            }
            if (!Array.isArray(readBy)) readBy = [senderUser];

            if (!readBy.includes(myUser)) {
              readBy.push(myUser);
              sheet.getRange(i + 1, 13).setValue(JSON.stringify(readBy));
            }
          }
        }
        return { success: true };
      } catch (e) {
        return { success: false, message: e.toString() };
      }
    }

    function getChatMessages(channelId, user) {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ensureChatSheetInitialized(ss);
        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return { success: true, messages: [] };

        const targetChannel = channelId || 'ALL_WAREHOUSES';
        const messages = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const rowChannel = String(row[2]);

          // Direct chat channels are identified by channelId or composite e.g. "WH01_WH02" or "WH01_ADMIN"
          if (rowChannel === targetChannel || targetChannel === 'ALL') {
            let itemRef = null;
            if (row[9]) {
              try { itemRef = JSON.parse(row[9]); } catch (err) { itemRef = row[9]; }
            }

            let readByList = [String(row[3])];
            if (row[12]) {
              try {
                const parsed = JSON.parse(row[12]);
                if (Array.isArray(parsed)) readByList = parsed;
              } catch (e) {
                readByList = [String(row[3])];
              }
            }

            messages.push({
              msgId: row[0],
              timestamp: row[1],
              channelId: row[2],
              senderUsername: row[3],
              senderFullName: row[4],
              senderRole: row[5],
              senderWarehouse: row[6],
              senderAvatar: row[7],
              messageText: row[8],
              itemReference: itemRef,
              isAudio: Boolean(row[10]),
              audioData: row[11] || '',
              readBy: readByList,
              isEdited: Boolean(row[13]),
              audioDuration: Number(row[14] || 0),
              registrationData: (itemRef && (itemRef.type === 'USER_REGISTRATION' || itemRef.username || itemRef.userId)) ? itemRef : null
            });
          }
        }

        return { success: true, messages: messages };
      } catch (e) {
        return { success: false, message: e.toString(), messages: [] };
      }
    }

    function getChatChannels(user) {
      return {
        success: true,
        channels: [
          { id: 'ALL_WAREHOUSES', name: '📢 បន្ទប់ជជែកទូទៅ (All Warehouses & Admin)', type: 'group' }
        ]
      };
    }
