<?php

namespace App\Http\Controllers;

use App\Models\NextelecomSetting;
use Illuminate\Http\Request;

class NextelecomSettingController extends Controller
{
    public function getApiSettings(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $setting = NextelecomSetting::getSetting('api', [
            'authType' => 'standard',
            'username' => '',
            'password' => '',
            'mfapin' => '0000',
        ], $tenantId);

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    public function saveApiSettings(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $validated = $request->validate([
            'authType' => 'required|in:standard,onetime',
            'username' => 'required|string',
            'password' => 'required|string',
            'mfapin' => 'required|string',
        ]);

        NextelecomSetting::updateSetting('api', $validated, $tenantId);

        return response()->json([
            'success' => true,
            'message' => 'API settings saved successfully',
            'data' => $validated,
        ]);
    }

    public function getTokenData(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $token = NextelecomSetting::getSetting('api_token', null, $tenantId);

        return response()->json([
            'success' => true,
            'data' => $token,
        ]);
    }

    public function saveTokenData(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $validated = $request->validate([
            'token' => 'required|string',
            'username' => 'required|string',
            'authType' => 'required|in:standard,onetime',
        ]);

        $validated['savedAt'] = now()->toDateTimeString();

        NextelecomSetting::updateSetting('api_token', $validated, $tenantId);

        return response()->json([
            'success' => true,
            'message' => 'Token saved successfully',
            'data' => $validated,
        ]);
    }

    public function deleteToken(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $setting = NextelecomSetting::where('type', 'api_token')
            ->where('tenant_id', $tenantId)
            ->first();
        if ($setting) {
            $setting->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Token deleted successfully',
        ]);
    }

    public function getEmailSettings(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $setting = NextelecomSetting::getSetting('email', [
            'enabled' => false,
            'address' => '',
            'host' => '',
            'port' => '',
            'username' => '',
            'password' => '',
        ], $tenantId);

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    public function saveEmailSettings(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'address' => 'nullable|email',
            'host' => 'nullable|string',
            'port' => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        NextelecomSetting::updateSetting('email', $validated, $tenantId);

        return response()->json([
            'success' => true,
            'message' => 'Email settings saved successfully',
            'data' => $validated,
        ]);
    }

    public function getSmsSettings(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $setting = NextelecomSetting::getSetting('sms', [
            'enabled' => false,
            'provider' => '',
            'apiKey' => '',
        ], $tenantId);

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    public function saveSmsSettings(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'provider' => 'nullable|string',
            'apiKey' => 'nullable|string',
        ]);

        NextelecomSetting::updateSetting('sms', $validated, $tenantId);

        return response()->json([
            'success' => true,
            'message' => 'SMS settings saved successfully',
            'data' => $validated,
        ]);
    }

    public function getAutoSmsSettings(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $setting = NextelecomSetting::getSetting('auto_sms', false, $tenantId);

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    public function saveAutoSmsSettings(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $validated = $request->validate([
            'enabled' => 'required|boolean',
        ]);

        NextelecomSetting::updateSetting('auto_sms', $validated['enabled'], $tenantId);

        return response()->json([
            'success' => true,
            'message' => 'Auto SMS settings saved successfully',
            'data' => $validated['enabled'],
        ]);
    }

    public function getAllSettings(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        $settings = [
            'api' => NextelecomSetting::getSetting('api', [], $tenantId),
            'token' => NextelecomSetting::getSetting('api_token', null, $tenantId),
            'email' => NextelecomSetting::getSetting('email', [], $tenantId),
            'sms' => NextelecomSetting::getSetting('sms', [], $tenantId),
            'auto_sms' => NextelecomSetting::getSetting('auto_sms', false, $tenantId),
        ];

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }
}
