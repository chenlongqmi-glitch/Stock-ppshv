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

// ==========================================
// 1. WEB APP ROUTING (doGet & doPost)
// ==========================================

/**
 * ដំណើរការពេលបើក Web App លើ Browser
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ | Smart Inventory')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Universal API Handler សម្រាប់ទទួល Call ពី google.script.run
 */
function handleApiRequest(req) {
  try {
    if (!req) return { success: false, message: 'No request payload' };
    const action = req.action;
    const payload = req.payload || {};

    switch (action) {
      case 'loginUser':
      case 'login':
        return loginUser(payload.username, payload.password);
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
      case 'getUsersList':
      case 'getUsers':
        return getUsersList(payload.user || payload);
      case 'updateUserStatus':
        return updateUserStatus(payload.userId, payload.status, payload.role, payload.warehouse, payload.adminUser, payload.avatar);
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
    const response = handleApiRequest({ action: action, payload: req });

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
 * មុខងារបង្កើត និងកំណត់រចនាសម្ព័ន្ធ Google Sheets ដោយស្វ័យប្រវត្តិ
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet Items
  let itemsSheet = getOrCreateSheet(ss, SHEETS.ITEMS);
  if (itemsSheet.getLastRow() === 0) {
    const headers = [
      'SKU', 'Barcode', 'ItemName', 'Category', 'Unit',
      'CostPrice', 'SellingPrice', 'MinStockLevel', 'Location',
      'CurrentStock', 'ImageUrl', 'Status', 'UpdatedAt'
    ];
    itemsSheet.appendRow(headers);
    formatHeaderRow(itemsSheet, headers.length, '#1e293b');

    // Sample Data across 11 warehouses
    itemsSheet.appendRow(['SKU-001', '8850123456789', 'Coca Cola 330ml', 'ភេសជ្ជៈ', 'កំប៉ុង', 0.45, 0.65, 20, 'ឃ្លាំងទី ០១ - ភ្នំពេញ (សែនសុខ)', 150, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300', 'Active', new Date()]);
    itemsSheet.appendRow(['SKU-002', '8850123456790', 'Anchor Beer Can', 'ភេសជ្ជៈ', 'កំប៉ុង', 0.60, 0.85, 24, 'ឃ្លាំងទី ០១ - ភ្នំពេញ (សែនសុខ)', 8, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300', 'Active', new Date()]);
    itemsSheet.appendRow(['SKU-003', '8850987654321', 'Nescafe 3in1 Coffee', 'គ្រឿងទេស', 'កញ្ចប់', 2.50, 3.20, 10, 'ឃ្លាំងទី ០២ - ភ្នំពេញ (ទួលគោក)', 45, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300', 'Active', new Date()]);
    itemsSheet.appendRow(['SKU-004', '8850987654322', 'Indomie Goreng Noodle', 'អាហារស្ងួត', 'កញ្ចប់', 0.30, 0.45, 30, 'ឃ្លាំងទី ០២ - ភ្នំពេញ (ទួលគោក)', 5, 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300', 'Active', new Date()]);
    itemsSheet.appendRow(['SKU-005', '8850987654323', 'Vital Premium Water 500ml', 'ភេសជ្ជៈ', 'ដប', 0.20, 0.35, 50, 'ឃ្លាំងទី ០៣ - សៀមរាប (ក្រុងសៀមរាប)', 200, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300', 'Active', new Date()]);
    itemsSheet.appendRow(['SKU-006', '8850987654324', 'Red Bull Can 250ml', 'ភេសជ្ជៈ', 'កំប៉ុង', 0.55, 0.75, 20, 'ឃ្លាំងទី ០៤ - បាត់ដំបង (ក្រុងបាត់ដំបង)', 80, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300', 'Active', new Date()]);
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
      'PasswordHash', 'Salt', 'Role', 'Status', 'CreatedAt', 'Warehouse'
    ];
    usersSheet.appendRow(headers);
    formatHeaderRow(usersSheet, headers.length, '#4338ca');

    // Default SuperAdmin: superadmin / superadmin123 (Full system control)
    const saSalt = generateSalt();
    const saHash = hashPassword('superadmin123', saSalt);
    usersSheet.appendRow(['USR-SA', 'superadmin', 'Super Administrator (អភិបាលកំពូល)', 'superadmin@inventory.local', saHash, saSalt, 'SuperAdmin', 'Active', new Date(), 'ALL']);

    // Default Admin: admin / admin123 (Can access ALL 11 Warehouses)
    const salt = generateSalt();
    const hash = hashPassword('admin123', salt);
    usersSheet.appendRow(['USR-001', 'admin', 'System Administrator (Admin)', 'admin@inventory.local', hash, salt, 'Admin', 'Active', new Date(), 'ALL']);

    // Seed 11 Warehouse / Station Users (wh01 to wh11)
    const defaultWarehouses = [
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

    defaultWarehouses.forEach((whName, index) => {
      const numStr = String(index + 1).padStart(2, '0');
      const uName = 'wh' + numStr;
      const uPass = 'wh' + numStr + 'pass';
      const uSalt = generateSalt();
      const uHash = hashPassword(uPass, uSalt);
      usersSheet.appendRow([
        `USR-${numStr}`,
        uName,
        `បុគ្គលិក ${whName}`,
        `${uName}@inventory.local`,
        uHash,
        uSalt,
        'Stock Keeper',
        'Active',
        new Date(),
        whName
      ]);
    });
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
    setSheet.appendRow(['TELEGRAM_BOT_TOKEN', '', 'Telegram Bot API Token']);
    setSheet.appendRow(['TELEGRAM_CHAT_ID', '', 'Telegram Group/Channel Chat ID']);
    setSheet.appendRow(['ENABLE_LOW_STOCK_ALERT', 'TRUE', 'បើក/បិទ ការជូនដំណឹងស្តុកទាប']);
    setSheet.appendRow(['ALERT_EMAIL', '', 'អ៊ីមែលទទួលដំណឹងពេលស្តុកជិតអស់']);
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
  }
  return sheet;
}

function loginUser(usernameOrData, password) {
  let uInput = '';
  let pInput = '';

  if (usernameOrData && typeof usernameOrData === 'object') {
    uInput = String(usernameOrData.username || usernameOrData.loginUsername || '').trim().toLowerCase();
    pInput = String(usernameOrData.password || usernameOrData.loginPassword || '');
  } else {
    uInput = String(usernameOrData || '').trim().toLowerCase();
    pInput = String(password || '');
  }

  if (!uInput || !pInput) {
    return { success: false, message: 'សូមបញ្ចូលឈ្មោះគណនី និងពាក្យសម្ងាត់' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureUsersInitialized(ss);
  const data = sheet.getDataRange().getValues();

  // Headers: UserID, Username, FullName, Email, PasswordHash, Salt, Role, Status, CreatedAt
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uName = String(row[1]).trim().toLowerCase();
    const uEmail = String(row[3]).trim().toLowerCase();

    if (uName === uInput || uEmail === uInput) {
      const storedHash = String(row[4]).trim();
      const storedSalt = String(row[5] || '');
      const status = String(row[7] || 'Active');

      if (status !== 'Active') {
        return { success: false, message: 'គណនីនេះត្រូវបានផ្អាក ឬមិនទាន់ត្រូវបានអនុម័ត' };
      }

      const computedHash = hashPassword(pInput, storedSalt);
      const isHashMatch = (computedHash === storedHash);
      const isPlainMatch = (storedHash === pInput); // Fallback if plain text was typed

      if (isHashMatch || isPlainMatch) {
        const userObj = {
          userId: String(row[0]),
          username: String(row[1]),
          fullName: String(row[2]),
          email: String(row[3]),
          role: String(row[6]),
          status: String(row[7] || 'Active'),
          warehouse: String(row[9] || (String(row[6]) === 'Admin' || String(row[6]) === 'SuperAdmin' ? 'ALL' : 'ឃ្លាំងទី ០១ - ភ្នំពេញ (សែនសុខ)')),
          token: Utilities.base64EncodeWebSafe(row[0] + ':' + new Date().getTime())
        };
        logActivity(userObj.username, userObj.role, 'LOGIN', `User logged in successfully (Warehouse: ${userObj.warehouse})`);
        return { success: true, user: userObj };
      } else {
        return { success: false, message: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ' };
      }
    }
  }

  // Fallback auto-create for SuperAdmin
  if (uInput === 'superadmin' && (pInput === 'superadmin123' || pInput === 'admin')) {
    const salt = generateSalt();
    const hash = hashPassword('superadmin123', salt);
    sheet.appendRow(['USR-SA', 'superadmin', 'Super Administrator (អភិបាលកំពូល)', 'superadmin@inventory.local', hash, salt, 'SuperAdmin', 'Active', new Date(), 'ALL']);
    return {
      success: true,
      user: { userId: 'USR-SA', username: 'superadmin', fullName: 'Super Administrator (អភិបាលកំពូល)', email: 'superadmin@inventory.local', role: 'SuperAdmin', warehouse: 'ALL' }
    };
  }

  // If no user found and typing admin / admin123, auto-create admin
  if (uInput === 'admin' && pInput === 'admin123') {
    const salt = generateSalt();
    const hash = hashPassword('admin123', salt);
    sheet.appendRow(['USR-001', 'admin', 'System Administrator', 'admin@inventory.local', hash, salt, 'Admin', 'Active', new Date(), 'ALL']);
    return {
      success: true,
      user: { userId: 'USR-001', username: 'admin', fullName: 'System Administrator', email: 'admin@inventory.local', role: 'Admin', warehouse: 'ALL' }
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
    `💼 <b>តួនាទី:</b> ${userData.role || 'Stock Keeper'}\n` +
    `📍 <b>ឃ្លាំង:</b> ${userData.warehouse || 'ឃ្លាំងទី ០១'}\n` +
    `🔑 <b>លេខកូដ OTP បញ្ជាក់ (Admin OTP):</b> <code>${otpCode}</code>\n` +
    `⏰ មានសុពលភាពរយៈពេល 10 នាទី។`;

  sendTelegramAlert(alertMsg);

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

  // Fallback check for built-in admin or superadmin if not in sheet yet
  if (!targetUser) {
    if (account === 'admin') {
      targetUser = { username: 'admin', fullName: 'System Administrator', email: 'admin@inventory.local', role: 'Admin' };
    } else if (account === 'superadmin') {
      targetUser = { username: 'superadmin', fullName: 'Super Administrator', email: 'superadmin@inventory.local', role: 'SuperAdmin' };
    }
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
    }
  } catch (e) {
    // Fallback if cache not available
  }

  // Send Email to User
  if (targetUser.email && targetUser.email.includes('@') && !targetUser.email.endsWith('.local')) {
    try {
      MailApp.sendEmail({
        to: targetUser.email,
        subject: '🔐 [PPSHV Inventory] លេខកូដ OTP ប្តូរពាក្យសម្ងាត់ថ្មី',
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

  sendTelegramAlert(alertMsg);
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
    sheet.getRange(targetRowIndex, 5).setValue(newHash);
    sheet.getRange(targetRowIndex, 6).setValue(newSalt);
  } else {
    // If user was built-in admin or superadmin not yet in sheet, append row
    if (account === 'admin') {
      sheet.appendRow(['USR-001', 'admin', 'System Administrator', 'admin@inventory.local', newHash, newSalt, 'Admin', 'Active', new Date(), 'ALL']);
    } else if (account === 'superadmin') {
      sheet.appendRow(['USR-SA', 'superadmin', 'Super Administrator (អភិបាលកំពូល)', 'superadmin@inventory.local', newHash, newSalt, 'SuperAdmin', 'Active', new Date(), 'ALL']);
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
  sendTelegramAlert(alertMsg);

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
  const role = userData.role || 'Stock Keeper';
  const status = 'Active';
  const warehouse = userData.warehouse || 'ឃ្លាំងទី ០១ - ភ្នំពេញ (សែនសុខ)';
  const avatar = userData.avatar || '';

  sheet.appendRow([
    userId,
    userData.username,
    userData.fullName || userData.username,
    userData.email || '',
    hash,
    salt,
    role,
    status,
    new Date(),
    warehouse,
    avatar
  ]);

  logActivity(userData.username, role, 'REGISTER', `New user registered with warehouse: ${warehouse}`);

  return {
    success: true,
    message: 'ចុះឈ្មោះ និងបញ្ជាក់ OTP ជោគជ័យ!',
    user: { userId, username: userData.username, fullName: userData.fullName, role, warehouse, avatar }
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

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      users.push({
        userId: data[i][0],
        username: data[i][1],
        fullName: data[i][2],
        email: data[i][3],
        role: data[i][6],
        status: data[i][7],
        createdAt: data[i][8],
        warehouse: data[i][9] || (data[i][6] === 'Admin' || data[i][6] === 'SuperAdmin' ? 'ALL' : '1-K3 ស្ថានីយ (ភ្នំពេញ)'),
        avatar: data[i][10] || ''
      });
    }
  }

  const isSuperAdmin = actor && (actor.role === 'SuperAdmin' || String(actor.username).toLowerCase() === 'superadmin');
  const isAdmin = !isSuperAdmin && actor && (actor.role === 'Admin' || actor.role === 'អ្នកគ្រប់គ្រង' || String(actor.username).toLowerCase() === 'admin');

  if (isSuperAdmin) {
    return { success: true, users: users };
  } else if (isAdmin) {
    return { success: true, users: users.filter(u =>
      u.role !== 'SuperAdmin' &&
      String(u.username).toLowerCase() !== 'superadmin' &&
      String(u.userId).toUpperCase() !== 'USR-SA'
    ) };
  } else if (actor && (actor.userId || actor.username)) {
    const selfList = users.filter(u =>
      (actor.userId && u.userId === actor.userId) ||
      (actor.username && String(u.username).toLowerCase() === String(actor.username).toLowerCase())
    );
    return { success: true, users: selfList };
  }
  return { success: true, users: users };
}

function updateUserStatus(userIdOrPayload, status, role, warehouse, adminUser, avatar) {
  let uId = userIdOrPayload;
  let st = status;
  let r = role;
  let wh = warehouse;
  let admin = adminUser;
  let av = avatar;

  if (userIdOrPayload && typeof userIdOrPayload === 'object') {
    uId = userIdOrPayload.userId;
    st = userIdOrPayload.status;
    r = userIdOrPayload.role;
    wh = userIdOrPayload.warehouse;
    admin = userIdOrPayload.adminUser;
    av = userIdOrPayload.avatar;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureUsersInitialized(ss);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === uId) {
      const existingRole = String(data[i][6] || '');
      // Protect SuperAdmin: only SuperAdmin can modify SuperAdmin or grant SuperAdmin
      if (existingRole === 'SuperAdmin' && admin !== 'superadmin') {
        return { success: false, message: 'អ្នកគ្មានសិទ្ធិកែប្រែ ឬបិទគណនី SuperAdmin ឡើយ' };
      }
      if (r === 'SuperAdmin' && admin !== 'superadmin') {
        return { success: false, message: 'មានតែ SuperAdmin ប៉ុណ្ណោះដែលអាចកំណត់សិទ្ធិជា SuperAdmin បាន' };
      }
      if (st) sheet.getRange(i + 1, 8).setValue(st);
      if (r) sheet.getRange(i + 1, 7).setValue(r);
      if (wh) sheet.getRange(i + 1, 10).setValue(wh);
      if (av) sheet.getRange(i + 1, 11).setValue(av);
      logActivity(admin || 'Admin', admin === 'superadmin' ? 'SuperAdmin' : 'Admin', 'UPDATE_USER', `Updated User ${uId}: status=${st}, role=${r}, warehouse=${wh}`);
      return { success: true, message: 'បានកែប្រែព័ត៌មានអ្នកប្រើប្រាស់ជោគជ័យ' };
    }
  }
  return { success: false, message: 'User not found' };
}

function updateUserProfile(payload) {
  if (!payload) return { success: false, message: 'ទិន្នន័យមិនត្រឹមត្រូវ' };
  const username = String(payload.username || '').toLowerCase();
  const userId = String(payload.userId || '');
  const fullName = String(payload.fullName || '').trim();
  const email = String(payload.email || '').trim();
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
      if (avatar) sheet.getRange(i + 1, 11).setValue(avatar);

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
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(SHEETS.ITEMS);
  }

  const data = sheet.getDataRange().getValues();
  const items = [];

  // Determine target warehouse filter
  let targetWarehouse = null;
  if (user && user.role !== 'Admin' && user.role !== 'SuperAdmin' && user.warehouse && user.warehouse !== 'ALL' && user.warehouse !== 'គ្រប់ឃ្លាំង') {
    targetWarehouse = user.warehouse;
  } else if (whFilter && whFilter !== 'ALL' && whFilter !== 'គ្រប់ឃ្លាំង' && whFilter !== 'គ្រប់ឃ្លាំងទាំងអស់') {
    targetWarehouse = whFilter;
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      const loc = String(row[8] || 'ឃ្លាំងទី ០១ - ភ្នំពេញ (សែនសុខ)');
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
        updatedAt: row[12]
      });
    }
  }

  const categories = getCategoriesListInternal(ss);
  const warehouses = getWarehousesListInternal(ss);

  return { success: true, items: items, categories: categories, warehouses: warehouses, activeWarehouseFilter: targetWarehouse };
}

function saveOrUpdateItem(itemDataOrPayload, username) {
  let itemData = itemDataOrPayload;
  let user = username;

  if (itemDataOrPayload && itemDataOrPayload.item) {
    itemData = itemDataOrPayload.item;
    user = itemDataOrPayload.user || username;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.ITEMS);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(SHEETS.ITEMS);
  }

  const data = sheet.getDataRange().getValues();
  let targetRow = -1;
  const targetSku = String(itemData.sku || '').trim();
  const sku = targetSku || 'SKU-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMddHHmmss');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === sku) {
      targetRow = i + 1;
      break;
    }
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
    itemData.location || 'ឃ្លាំងកណ្តាល A',
    Number(itemData.currentStock !== undefined ? itemData.currentStock : 0),
    itemData.imageUrl || '',
    itemData.status || 'Active',
    new Date()
  ];

  if (targetRow > 0) {
    if (itemData.currentStock === undefined) {
      rowValues[9] = data[targetRow - 1][9];
    }
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
    logActivity(user || 'System', 'Staff', 'UPDATE_ITEM', `Updated item: ${itemData.name} (${sku})`);
    return { success: true, message: 'បានកែប្រែទំនិញជោគជ័យ!', sku: sku };
  } else {
    sheet.appendRow(rowValues);
    logActivity(user || 'System', 'Staff', 'ADD_ITEM', `Created new item: ${itemData.name} (${sku})`);

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
        toLocation: itemData.location || 'ឃ្លាំងកណ្តាល A',
        notes: 'Initial Stock on Creation',
        user: user || 'System'
      });
    }

    return { success: true, message: 'បានបន្ថែមទំនិញថ្មីជោគជ័យ!', sku: sku };
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
      sheet.deleteRow(i + 1);
      logActivity(user || 'Admin', 'Admin', 'DELETE_ITEM', `Deleted item ${itemName} (${sku})`);
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
  const tx = recordTransactionInternal(ss, {
    type: 'STOCK_IN',
    sku: sku,
    itemName: itemName,
    quantity: qty,
    unit: unit,
    unitPrice: costPrice,
    totalAmount: totalAmount,
    fromLocation: data.supplier || data.fromLocation || 'Supplier',
    toLocation: location,
    notes: data.notes || '',
    user: u ? (u.fullName || u.username) : 'Staff'
  });

  logActivity(u ? (u.fullName || u.username) : 'Staff', 'Staff', 'STOCK_IN', `Stock In +${qty} ${unit} of ${itemName} (${sku})`);
  sendTelegramNotification(`📥 <b>ដំណឹងស្តុកចូល (Stock In)</b>\n📦 ទំនិញ: <b>${itemName}</b>\n🔢 ចំនួន: <b>+${qty} ${unit}</b>\n📊 ស្តុកថ្មីក្នុងដៃ: <b>${newStock}</b>\n🏢 ឃ្លាំង: ${location}\n👤 ដោយ: ${u ? (u.fullName || u.username) : 'Staff'}`);

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

  const tx = recordTransactionInternal(ss, {
    type: 'STOCK_OUT',
    sku: sku,
    itemName: itemName,
    quantity: qty,
    unit: unit,
    unitPrice: unitPriceFinal,
    totalAmount: totalAmount,
    fromLocation: location,
    toLocation: data.customer || data.toLocation || 'អតិថិជន/ដកប្រើប្រាស់',
    notes: data.notes || '',
    user: u ? (u.fullName || u.username) : 'Staff'
  });

  logActivity(u ? (u.fullName || u.username) : 'Staff', 'Staff', 'STOCK_OUT', `Stock Out -${qty} ${unit} of ${itemName} (${sku})`);

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

function sendTelegramNotification(messageText) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settings = getSettingsMap(ss);

    const token = settings['TELEGRAM_BOT_TOKEN'];
    const chatId = settings['TELEGRAM_CHAT_ID'];

    if (!token || !chatId) return false;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: messageText,
      parse_mode: 'HTML'
    };

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
  const map = {};
  if (!sheet) return map;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    map[data[i][0]] = data[i][1];
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
          'SenderRole', 'SenderWarehouse', 'SenderAvatar', 'MessageText', 'ItemReference'
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
        const itemReference = chatData.itemReference ? JSON.stringify(chatData.itemReference) : '';

        if (!messageText && !itemReference) {
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
          itemReference
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
            itemReference: chatData.itemReference || null
          }
        };
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
              itemReference: itemRef
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
