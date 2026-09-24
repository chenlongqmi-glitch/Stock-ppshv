# សៀវភៅណែនាំតម្លើង និងប្រើប្រាស់៖ ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ (Smart Inventory Management System)

ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញនេះត្រូវបានរចនាឡើងយ៉ាងពេញលេញ និងមានប្រសិទ្ធភាពខ្ពស់ ដោយប្រើប្រាស់ **Google Sheets** ជា Database, **Google Apps Script** ជា Backend API, **HTML5/Tailwind/JS** ជាផ្ទាំង Web App UI (ដំណើរការលើកុំព្យូទ័រ និងទូរស័ព្ទដៃ) រួមទាំង **Python Client** សម្រាប់ស្វ័យប្រវត្តិកម្ម។

---

## 📁 ឯកសារក្នុងគម្រោង (Project Files)

1. **`Code.js` (ឬ `Code.gs`)**: កូដ Backend សម្រាប់ដំណើរការលើ Google Apps Script (Auth, CRUD ទំនិញ, Stock In/Out, Telegram Bot, Daily Cron Trigger)
2. **`Index.html`**: ផ្ទាំងកម្មវិធី Web App (Dashboard, Barcode Scanner លើ Camera, Stock In/Out, Print Barcode, User Roles, Reports)
3. **`run.bat`**: កម្មវិធីបើកដំណើរការ Local Web Server និង Browser ដោយស្វ័យប្រវត្តិ (ចុចពីរដងដើម្បីដំណើរការ)
4. **`inventory_sync.py`**: Python CLI Script សម្រាប់ Sync ទិន្នន័យ, Batch Import CSV, Backup ទិន្នន័យ
5. **`README_KH.md`**: សៀវភៅណែនាំនេះ

---

## 🚀 របៀបតម្លើងប្រព័ន្ធនៅលើ Google Sheets (ជំហានម្តងមួយៗ)

### ជំហានទី ១៖ បង្កើត Google Sheet ថ្មី
1. ចូលទៅកាន់ [Google Sheets](https://sheets.new) ដើម្បីបង្កើត Sheet ថ្មីមួយ។
2. ដាក់ឈ្មោះ Sheet (ឧទាហរណ៍៖ `Smart_Inventory_DB`)។

### ជំហានទី ២៖ បើក Apps Script Editor
1. នៅលើ Menu ខាងលើ ចុចលើ **Extensions (ផ្នែកបន្ថែម)** ➔ **Apps Script**។
2. ប្តូរឈ្មោះគម្រោង Apps Script (ឧ. `Inventory_Backend`)។

### ជំហានទី ៣៖ បញ្ចូលកូដ Backend (`Code.gs`)
1. លុបកូដចាស់ក្នុង `Code.gs` ចោល។
2. ចម្លង (Copy) កូដទាំងអស់ពី file **`Code.js`** មកបិទភ្ជាប់ (Paste) ក្នុង `Code.gs`។
3. ចុច Save (រូបតំណាងថាស ឬ `Ctrl + S`)។

### ជំហានទី ៤៖ បង្កើត File Frontend (`Index.html`)
1. នៅផ្នែកខាងឆ្វេងជិតពាក្យ **Files** ចុចលើសញ្ញាបូក `+` ➔ ជ្រើសរើស **HTML**។
2. ដាក់ឈ្មោះ file ថា **`Index`** (ប្រព័ន្ធនឹងបង្កើតជា `Index.html`)។
3. ចម្លងកូដទាំងអស់ពី file **`Index.html`** មកបិទភ្ជាប់ (Paste) ជំនួសកូដទាំងអស់ក្នុង `Index.html` លើ Apps Script។
4. ចុច Save (`Ctrl + S`)។

### ជំហានទី ៥៖ បង្កើតទិន្នន័យដំបូង (Run Setup Database)
1. នៅផ្នែកខាងលើនៃ Apps Script Editor ត្រង់ប្រអប់ Function សូមជ្រើសរើស Function ឈ្មោះ **`setupDatabase`**។
2. ចុចប៊ូតុង **Run** (រត់)។
3. Google នឹងសុំសិទ្ធិ (Authorization Required)៖
   - ចុច **Review Permissions** ➔ ជ្រើសរើស Google Account របស់អ្នក
   - ចុច **Advanced** ➔ ចុច **Go to ... (unsafe)** ➔ ចុច **Allow**។
4. ត្រឡប់មកមើលក្នុង Google Sheet របស់អ្នក នោះអ្នកនឹងឃើញ Tabs ទាំង ៧ ត្រូវបានបង្កើតដោយស្វ័យប្រវត្តិ៖
   - `Items`
   - `Transactions`
   - `Users`
   - `Warehouses`
   - `Categories`
   - `ActivityLogs`
   - `Settings`

### ជំហានទី ៦៖ Deploy ទៅជា Web App សម្រាប់ប្រើប្រាស់
1. នៅជ្រុងខាងស្តាំខាងលើ ចុចលើ **Deploy** ➔ **New deployment**។
2. ចុចលើរូប Gear (Select type) ➔ ជ្រើសរើស **Web app**។
3. បំពេញព័ត៌មានដូចខាងក្រោម៖
   - **Description:** `Inventory Web App v1`
   - **Execute as:** `Me (អ៊ីមែលរបស់អ្នក)`
   - **Who has access:** `Anyone` (ដើម្បីឱ្យបុគ្គលិកអាចបើកលើ Browser ឬទូរស័ព្ទដៃបាន)
4. ចុចប៊ូតុង **Deploy**។
5. ចម្លងយក **Web app URL** (ឧ. `https://script.google.com/macros/s/AKfycb.../exec`)។ នេះជា Link សម្រាប់បើកកម្មវិធីប្រើប្រាស់!

---

## 🔑 គណនីចូលប្រើប្រាស់ដំបូង (Default Credentials)

| តួនាទី (Role) | ឈ្មោះគណនី (Username) | ពាក្យសម្ងាត់ (Password) | សិទ្ធិប្រើប្រាស់ |
|---|---|---|---|
| **SuperAdmin** | `superadmin` | `841453Bsm` | **អភិបាលកំពូល:** មានសិទ្ធិពេញលេញលើប្រព័ន្ធទាំងមូល, គ្រប់គ្រង Admin, ប្រើមុខងារ **Switch User** (ចូលប្រើប្រាស់ជា User ណាម្នាក់ដោយគ្មានលេខសម្ងាត់) |
| **Admin** | `admin` | `admin123` | **អ្នកគ្រប់គ្រងប្រព័ន្ធ:** គ្រប់គ្រងឃ្លាំងទាំងអស់, បុគ្គលិក, ទំនិញ, សំណើ, របាយការណ៍ និងការកំណត់ |
| **Stock Keeper** | `wh01` ដល់ `wh11` | `wh01pass` ... | បញ្ចូលស្តុកចូល (Stock In), ដកស្តុកចេញ (Stock Out), ផ្ទេរ & កែតម្រូវ តាមឃ្លាំងនិមួយៗ |

> 💡 **ចំណាំ:** 
> - គណនី **SuperAdmin** ត្រូវបានការពារយ៉ាងតឹងរ៉ឹង៖ Admin ធម្មតាមិនអាចកែប្រែ, បិទដំណើរការ ឬលុបគណនី SuperAdmin បានឡើយ។
> - SuperAdmin អាចចុចប៊ូតុង **Switch User** នៅលើរបារខាងលើ ឬក្នុងតារាង User ដើម្បីប្តូរចូលប្រើប្រាស់ភ្លាមៗក្នុងនាមជាបុគ្គលិក ឬ Admin ណាម្នាក់ រួចចុច "ត្រឡប់ទៅ SuperAdmin វិញ" បានគ្រប់ពេលវេលា។

---

## 🤖 របៀបភ្ជាប់ការជូនដំណឹងស្វ័យប្រវត្តិតាម Telegram Bot

1. បង្កើត Bot តាមរយៈ **[@BotFather](https://t.me/BotFather)** ក្នុង Telegram ➔ ផ្ញើ `/newbot` រួចកំណត់ឈ្មោះ ដើម្បីទទួលបាន **Bot Token** (ឧ. `123456789:ABCdefGh...`)។
2. យក **Chat ID** របស់អ្នក ឬ Group Telegram ដោយប្រើ **[@userinfobot](https://t.me/userinfobot)** (ឬ Add Bot ចូលក្នុង Group ហើយយក Group Chat ID ឧ. `-100123456789`)។
3. បើក Web App ➔ ចូលទៅកាន់ **ការកំណត់ & Telegram** (Settings)៖
   - បិទភ្ជាប់ **Telegram Bot Token**
   - បិទភ្ជាប់ **Telegram Chat ID**
   - ចុច **សាកល្បងផ្ញើសារ (Test Alert)** ដើម្បីតេស្ត
   - ចុច **រក្សាទុកការកំណត់**។
4. រាល់ពេលមានប្រតិបត្តិការស្តុកចូល ឬស្តុកធ្លាក់ចុះដល់កម្រិតទាប (Low Stock Alert) ប្រព័ន្ធនឹងផ្ញើសារប្រកាសអាសន្នទៅកាន់ Telegram ភ្លាមៗ!

---

## ⏰ ការកំណត់ឱ្យប្រព័ន្ធឆែកស្តុកទាបរៀងរាល់ព្រឹក (Daily Trigger)

1. ក្នុង Apps Script Editor ចុចលើរូប **នាឡិកា (Triggers)** នៅជួរខាងឆ្វេងដៃ។
2. ចុចប៊ូតុង **Add Trigger** នៅជ្រុងខាងក្រោមស្តាំ។
3. កំណត់ដូចខាងក្រោម៖
   - **Choose which function to run:** `dailyLowStockDigestTrigger`
   - **Select event source:** `Time-driven`
   - **Select type of time based trigger:** `Day timer`
   - **Select time of day:** `8am to 9am`
4. ចុច **Save**។

---

## 🐍 របៀបប្រើប្រាស់ Python Client Script (`inventory_sync.py`)

ប្រសិនបើអ្នកចង់ប្រើ Python សម្រាប់ Sync ទិន្នន័យពី Excel ឬស្វ័យប្រវត្តិកម្ម៖

1. ដំឡើងបណ្ណាល័យ Python (បើមិនទាន់មាន):
   ```bash
   pip install requests
   ```
2. បើក file `inventory_sync.py` រួចដាក់ Web App URL របស់អ្នកត្រង់អថេរ `WEB_APP_URL` (ឬកំណត់តាម Menu ក៏បាន)។
3. ដំណើរការ Script:
   ```bash
   python inventory_sync.py
   ```
4. ជ្រើសរើស Menu ដើម្បីមើលស្តុក, Stock In, Stock Out, Import CSV ឬទាញយក Backup JSON ដោយស្វ័យប្រវត្តិ។

---

## ✨ សង្ខេបមុខងារសំខាន់ៗ

- ✅ **Dashboard ផ្សាយផ្ទាល់:** បង្ហាញតម្លៃស្តុកសរុប (ថ្លៃដើម/ថ្លៃលក់), ចំនួនទំនិញ, ស្តុកទាប, និងក្រាហ្វចរន្ត ៧ ថ្ងៃ។
- ✅ **ស្កេន Barcode / QR Code តាម Camera:** ប្រើ Camera ទូរស័ព្ទ ឬកុំព្យូទ័រស្កេនទំនិញដាក់ចូល/ដកចេញភ្លាមៗ។
- ✅ **បង្កើត & បោះពុម្ព Barcode Label:** បង្កើត Barcode Code128 សម្រាប់បិទលើផលិតផល។
- ✅ **សុវត្ថិភាពខ្ពស់ & OTP Reset:** Password ត្រូវបានការពារដោយបច្ចេកវិទ្យា SHA-256 + Unique Salt, មានមុខងារ **ភ្លេចពាក្យសម្ងាត់ (Forgot Password)** ផ្ទៀងផ្ទាត់តាម OTP Telegram Admin, និងមុខងារ **ចងចាំខ្ញុំ (Remember Me)** ដែលចងចាំព័ត៌មាន Login លុះត្រាតែអ្នកប្រើប្រាស់បានចុចជ្រើសរើស (លែងបង្ហាញ Default Admin ពេល Deploy)។
- ✅ **គ្រប់គ្រងសិទ្ធិ (RBAC):** បែងចែករវាង SuperAdmin, Admin, Stock Keeper, និង Cashier។
- ✅ **Activity Audit Log:** កត់ត្រារាល់សកម្មភាពថាអ្នកណាធ្វើអ្វី នៅពេលណា។

