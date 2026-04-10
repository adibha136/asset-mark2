<?php

namespace App\Http\Controllers;

use App\Models\NextelecomSetting;
use App\Models\Tenant;
use App\Services\NextelecomService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NextelecomSettingController extends Controller
{
    public function getApiSettings(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

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

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

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
        $queryTenantId = $request->query('tenant_id');
        $managerTenantId = app('tenant.manager')->getTenantId();
        $tenantId = $queryTenantId ?? $managerTenantId;

        Log::info('[NextelecomSetting] getTokenData - tenant resolution', [
            'query_tenant_id' => $queryTenantId,
            'manager_tenant_id' => $managerTenantId,
            'final_tenant_id' => $tenantId,
        ]);

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
                Log::info('[NextelecomSetting] getTokenData - using first tenant fallback', [
                    'tenant_id' => $tenantId,
                ]);
            }
        }

        $token = NextelecomSetting::getSetting('api_token', null, $tenantId);

        Log::info('[NextelecomSetting] getTokenData - token retrieved', [
            'tenant_id' => $tenantId,
            'token_found' => $token ? true : false,
            'token_username' => $token ? ($token['username'] ?? null) : null,
        ]);

        return response()->json([
            'success' => true,
            'data' => $token,
        ]);
    }

    public function saveTokenData(Request $request)
    {
        $queryTenantId = $request->query('tenant_id');
        $managerTenantId = app('tenant.manager')->getTenantId();
        $tenantId = $queryTenantId ?? $managerTenantId;

        Log::info('[NextelecomSetting] saveTokenData - tenant resolution', [
            'query_tenant_id' => $queryTenantId,
            'manager_tenant_id' => $managerTenantId,
            'final_tenant_id' => $tenantId,
        ]);

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
                Log::info('[NextelecomSetting] saveTokenData - using first tenant fallback', [
                    'tenant_id' => $tenantId,
                ]);
            }
        }

        $validated = $request->validate([
            'token' => 'required|string',
            'username' => 'required|string',
            'authType' => 'required|in:standard,onetime',
        ]);

        $validated['savedAt'] = now()->toDateTimeString();

        NextelecomSetting::updateSetting('api_token', $validated, $tenantId);

        Log::info('[NextelecomSetting] saveTokenData - token saved', [
            'tenant_id' => $tenantId,
            'username' => $validated['username'],
            'authType' => $validated['authType'],
        ]);

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
            'encryption' => 'tls',
        ], $tenantId);

        return response()->json([
            'success' => true,
            'data' => $setting,
        ]);
    }

    public function saveEmailSettings(Request $request)
    {
        Log::info('saveEmailSettings called', [
            'query_tenant_id' => $request->query('tenant_id'),
            'manager_tenant_id' => app('tenant.manager')->getTenantId(),
        ]);

        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        Log::info('Tenant ID before fallback', [
            'tenant_id' => $tenantId,
        ]);

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            Log::info('Using fallback tenant', [
                'first_tenant' => $firstTenant ? $firstTenant->id : 'none',
            ]);

            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

        Log::info('Final tenant ID for save', [
            'tenant_id' => $tenantId,
        ]);

        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'address' => 'nullable|email',
            'host' => 'nullable|string',
            'port' => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
            'encryption' => 'nullable|in:none,tls,ssl',
        ]);

        if (! isset($validated['encryption'])) {
            $validated['encryption'] = 'tls';
        }

        NextelecomSetting::updateSetting('email', $validated, $tenantId);

        Log::info('Email settings saved', [
            'tenant_id' => $tenantId,
            'enabled' => $validated['enabled'],
            'address' => $validated['address'],
        ]);

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

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

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

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

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

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

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

    public function refreshToken(Request $request)
    {
        $queryTenantId = $request->query('tenant_id');
        $managerTenantId = app('tenant.manager')->getTenantId();
        $tenantId = $queryTenantId ?? $managerTenantId;

        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

        Log::info('[NextelecomSetting] refreshToken called', [
            'tenant_id' => $tenantId,
        ]);

        $tokenData = NextelecomService::refreshToken($tenantId);

        if (! $tokenData) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to refresh token. Please check your credentials and try again.',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'message' => 'Token refreshed successfully',
            'data' => $tokenData,
        ]);
    }

    public function checkTokenStatus(Request $request)
    {
        $queryTenantId = $request->query('tenant_id');
        $managerTenantId = app('tenant.manager')->getTenantId();
        $tenantId = $queryTenantId ?? $managerTenantId;

        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

        $tokenData = NextelecomSetting::getSetting('api_token', null, $tenantId);
        $isExpired = NextelecomService::isTokenExpired($tokenData);

        return response()->json([
            'success' => true,
            'data' => [
                'has_token' => $tokenData ? true : false,
                'is_expired' => $isExpired,
                'needs_refresh' => $isExpired,
                'token_data' => $tokenData ? [
                    'username' => $tokenData['username'] ?? null,
                    'authType' => $tokenData['authType'] ?? null,
                    'savedAt' => $tokenData['savedAt'] ?? null,
                ] : null,
            ],
        ]);
    }
}
