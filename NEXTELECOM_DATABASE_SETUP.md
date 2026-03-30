# NexTelecom Database Setup - Complete Implementation

## Overview
All NexTelecom settings have been moved from **localStorage** to **database** storage with real-time synchronization. Every change is automatically saved to the database and persists across browser sessions.

---

## Database Structure

### Table: `nextelecom_settings`
Stores all NexTelecom configuration data in JSON format for flexibility.

```sql
- id (int, primary key)
- type (string, unique) - Setting type: 'api', 'api_token', 'email', 'sms', 'auto_sms'
- data (json) - Configuration data stored as JSON
- last_synced_at (timestamp) - Last update time
- created_at (timestamp)
- updated_at (timestamp)
```

---

## What Gets Stored in Database

### 1. **API Settings** (type: 'api')
```json
{
  "username": "your_username",
  "authType": "standard", // or "onetime"
  "mfapin": "0000"
}
```

### 2. **API Token** (type: 'api_token')
```json
{
  "token": "auth_token_here",
  "username": "your_username",
  "authType": "standard",
  "savedAt": "2026-03-29 12:30:45"
}
```

### 3. **Email Settings** (type: 'email')
```json
{
  "enabled": true,
  "address": "notifications@example.com",
  "host": "smtp.example.com",
  "port": "587",
  "username": "smtp_user",
  "password": "smtp_password"
}
```

### 4. **SMS Settings** (type: 'sms')
```json
{
  "enabled": true,
  "provider": "twilio", // twilio, aws_sns, nexmo, custom
  "apiKey": "your_api_key"
}
```

### 5. **Auto SMS** (type: 'auto_sms')
```json
true // or false
```

---

## API Endpoints

All endpoints are prefixed with `/api/nextelecom/settings/`

### Get All Settings
```
GET /api/nextelecom/settings/
Response: { success: true, data: { api, token, email, sms, auto_sms } }
```

### API Settings
```
GET    /api/nextelecom/settings/api
POST   /api/nextelecom/settings/api
Body: { username, authType, mfapin }
```

### Token Management
```
GET    /api/nextelecom/settings/token
POST   /api/nextelecom/settings/token
Body: { token, username, authType, savedAt }
DELETE /api/nextelecom/settings/token
```

### Email Settings
```
GET    /api/nextelecom/settings/email
POST   /api/nextelecom/settings/email
Body: { enabled, address, host, port, username, password }
```

### SMS Settings
```
GET    /api/nextelecom/settings/sms
POST   /api/nextelecom/settings/sms
Body: { enabled, provider, apiKey }
```

### Auto SMS
```
GET    /api/nextelecom/settings/auto-sms
POST   /api/nextelecom/settings/auto-sms
Body: { enabled }
```

---

## Frontend Implementation

### Settings.tsx Changes

**Before (localStorage):**
- All settings stored in browser's localStorage
- Lost on browser clear/incognito mode
- No server-side persistence
- Manual JSON parsing/stringifying

**After (Database):**
- Auto-loads all settings from database on component mount
- Real-time saving to database when settings change
- "Saving to database..." indicators for each section
- Loading state on initial load
- Async/await for all API calls

### Key Features

1. **Auto-sync**: Email, SMS, and Auto SMS settings save automatically when toggled
2. **Persistent**: API tokens and configurations survive browser restarts
3. **User Feedback**: Loading spinners show when data is syncing
4. **Error Handling**: Graceful fallback if API unavailable
5. **Database Icon**: Visual indicator showing "All settings synced to database"

---

## File Changes Summary

### New Files Created
1. **Migration**: `database/migrations/2026_03_29_190000_create_nextelecom_settings_table.php`
2. **Model**: `app/Models/NextelecomSetting.php`
3. **Controller**: `app/Http/Controllers/NextelecomSettingController.php`

### Modified Files
1. **Routes**: `routes/web.php` - Added NextelecomSettingController import and settings routes
2. **Frontend**: `resources/js/modules/nextelecom/pages/Settings.tsx` - Complete refactor to use API

---

## Database Interactions

### Model Helper Methods

```php
// Get a setting (returns data or default)
NextelecomSetting::getSetting('api', $default)

// Update or create a setting
NextelecomSetting::updateSetting('api', $data)
```

### Example Usage
```php
$apiConfig = NextelecomSetting::getSetting('api');
$email = NextelecomSetting::getSetting('email', []);

NextelecomSetting::updateSetting('sms', [
    'enabled' => true,
    'provider' => 'twilio',
    'apiKey' => 'xxx'
]);
```

---

## How It Works

### 1. Page Load Flow
```
Settings.tsx mounts
  ↓
useEffect triggers fetchAllSettings()
  ↓
GET /api/nextelecom/settings
  ↓
Controller fetches all settings from database
  ↓
Frontend populates state with database values
  ↓
User sees their saved configuration
```

### 2. User Updates Flow
```
User changes Email Host field
  ↓
updateEmailSettings() called
  ↓
State updated immediately (optimistic)
  ↓
POST /api/nextelecom/settings/email
  ↓
Controller saves to database
  ↓
"Saving to database..." spinner shows
  ↓
Save completes, spinner disappears
```

### 3. Token Save Flow
```
User clicks "Test Connection"
  ↓
Proxy authenticates with VirtualPlatform API
  ↓
Token received and stored in state
  ↓
POST /api/nextelecom/settings/token
  ↓
Token persisted in database
  ↓
"Connected" state displayed
```

---

## Data Persistence Flow

```
Frontend (React)
    ↓ (API Call)
Laravel Routes
    ↓
NextelecomSettingController
    ↓
NextelecomSetting Model
    ↓
MySQL Database (nextelecom_settings table)
```

---

## Migration Details

The migration creates a new table with:
- Unique `type` constraint (only one record per type)
- JSON `data` column for flexible storage
- Timestamps for tracking changes
- `last_synced_at` for audit purposes

```php
Schema::create('nextelecom_settings', function (Blueprint $table) {
    $table->id();
    $table->string('type')->index();
    $table->text('data');
    $table->timestamp('last_synced_at')->nullable();
    $table->timestamps();
    $table->unique('type');
});
```

---

## Running the Migration

```bash
# Run all pending migrations
php artisan migrate

# Rollback if needed
php artisan migrate:rollback

# Refresh everything
php artisan migrate:refresh
```

---

## Testing the Setup

1. **Open Settings page** - Should load all previously saved settings
2. **Toggle Email** - Should show "Saving to database..." then save
3. **Change SMS Provider** - Should auto-save to database
4. **Test Connection** - Token should save to database and persist
5. **Refresh page** - All settings should load from database

---

## Benefits

✅ **Persistence** - Settings survive across sessions and devices  
✅ **Security** - Server-side storage instead of browser storage  
✅ **Scalability** - Can add multi-user/multi-tenant support  
✅ **Audit Trail** - Can track when settings were changed  
✅ **Reliability** - Single source of truth in database  
✅ **Real-time Sync** - Changes visible across multiple browser windows  

---

## Future Enhancements

- Add audit logging (track who changed what and when)
- Add settings encryption for sensitive data
- Add settings versioning/rollback capability
- Add settings per-tenant support
- Add settings export/import feature
- Add settings change notifications

---

## Support

For issues or questions about the database setup, check:
- `app/Models/NextelecomSetting.php` - Data model
- `app/Http/Controllers/NextelecomSettingController.php` - API logic
- `routes/web.php` - Route definitions
- `resources/js/modules/nextelecom/pages/Settings.tsx` - Frontend
