<?php

namespace App\Http\Controllers;

use App\Models\NextelecomSetting;
use Illuminate\Http\Request;

class NextelecomSettingController extends Controller
{
    public function getApiSettings(Request $request)
    {
        $setting = NextelecomSetting::getSetting('api', [
            'authType' => 'standard',
            'username' => '',
        ]);

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    public function saveApiSettings(Request $request)
    {
        $validated = $request->validate([
            'authType' => 'required|in:standard,onetime',
            'username' => 'required|string',
            'mfapin' => 'required|string',
        ]);

        NextelecomSetting::updateSetting('api', $validated);

        return response()->json([
            'success' => true,
            'message' => 'API settings saved successfully',
            'data' => $validated,
        ]);
    }

    public function getTokenData(Request $request)
    {
        $token = NextelecomSetting::getSetting('api_token', null);

        return response()->json([
            'success' => true,
            'data' => $token,
        ]);
    }

    public function saveTokenData(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'username' => 'required|string',
            'authType' => 'required|in:standard,onetime',
        ]);

        $validated['savedAt'] = now()->toDateTimeString();

        NextelecomSetting::updateSetting('api_token', $validated);

        return response()->json([
            'success' => true,
            'message' => 'Token saved successfully',
            'data' => $validated,
        ]);
    }

    public function deleteToken(Request $request)
    {
        $setting = NextelecomSetting::where('type', 'api_token')->first();
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
        $setting = NextelecomSetting::getSetting('email', [
            'enabled' => false,
            'address' => '',
            'host' => '',
            'port' => '',
            'username' => '',
            'password' => '',
        ]);

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    public function saveEmailSettings(Request $request)
    {
        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'address' => 'nullable|email',
            'host' => 'nullable|string',
            'port' => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        NextelecomSetting::updateSetting('email', $validated);

        return response()->json([
            'success' => true,
            'message' => 'Email settings saved successfully',
            'data' => $validated,
        ]);
    }

    public function getSmsSettings(Request $request)
    {
        $setting = NextelecomSetting::getSetting('sms', [
            'enabled' => false,
            'provider' => '',
            'apiKey' => '',
        ]);

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    public function saveSmsSettings(Request $request)
    {
        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'provider' => 'nullable|string',
            'apiKey' => 'nullable|string',
        ]);

        NextelecomSetting::updateSetting('sms', $validated);

        return response()->json([
            'success' => true,
            'message' => 'SMS settings saved successfully',
            'data' => $validated,
        ]);
    }

    public function getAutoSmsSettings(Request $request)
    {
        $setting = NextelecomSetting::getSetting('auto_sms', false);

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    public function saveAutoSmsSettings(Request $request)
    {
        $validated = $request->validate([
            'enabled' => 'required|boolean',
        ]);

        NextelecomSetting::updateSetting('auto_sms', $validated['enabled']);

        return response()->json([
            'success' => true,
            'message' => 'Auto SMS settings saved successfully',
            'data' => $validated['enabled'],
        ]);
    }

    public function getAllSettings(Request $request)
    {
        $settings = [
            'api' => NextelecomSetting::getSetting('api', []),
            'token' => NextelecomSetting::getSetting('api_token', null),
            'email' => NextelecomSetting::getSetting('email', []),
            'sms' => NextelecomSetting::getSetting('sms', []),
            'auto_sms' => NextelecomSetting::getSetting('auto_sms', false),
        ];

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }
}
