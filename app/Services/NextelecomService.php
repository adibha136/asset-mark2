<?php

namespace App\Services;

use App\Models\NextelecomSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NextelecomService
{
    const API_URLS = [
        'standard' => 'https://api.virtualplatform.com.au/v2/auth',
        'onetime' => 'https://api.virtualplatform.com.au/v2/onetime/auth',
    ];

    const TOKEN_BUFFER_TIME = 300;

    public static function isTokenExpired(?array $tokenData): bool
    {
        if (!$tokenData || !isset($tokenData['token'])) {
            return true;
        }

        try {
            $token = $tokenData['token'];
            $parts = explode('.', $token);
            
            if (count($parts) !== 3) {
                Log::warning('NextelecomService: Invalid JWT format');
                return true;
            }

            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
            
            if (!$payload || !isset($payload['exp'])) {
                Log::warning('NextelecomService: Invalid JWT payload');
                return true;
            }

            $expiresAt = $payload['exp'];
            $now = now()->timestamp;
            $timeUntilExpiry = $expiresAt - $now;

            Log::info('NextelecomService: Token expiry check', [
                'expires_at' => $expiresAt,
                'now' => $now,
                'time_until_expiry' => $timeUntilExpiry,
                'buffer_time' => self::TOKEN_BUFFER_TIME,
                'is_expired' => $timeUntilExpiry <= self::TOKEN_BUFFER_TIME,
            ]);

            return $timeUntilExpiry <= self::TOKEN_BUFFER_TIME;
        } catch (\Exception $e) {
            Log::error('NextelecomService: Error checking token expiry', [
                'error' => $e->getMessage(),
            ]);
            return true;
        }
    }

    public static function refreshToken(?string $tenantId = null): ?array
    {
        if (!$tenantId) {
            $tenantId = app('tenant.id') ?? null;
        }

        if (!$tenantId) {
            $tenantId = \App\Models\Tenant::first()?->id;
        }

        Log::info('NextelecomService: Attempting token refresh', [
            'tenant_id' => $tenantId,
        ]);

        $apiSettings = NextelecomSetting::getSetting('api', null, $tenantId);
        
        if (!$apiSettings) {
            Log::warning('NextelecomService: No API settings found for refresh', [
                'tenant_id' => $tenantId,
            ]);
            return null;
        }

        try {
            $authUrl = self::API_URLS[$apiSettings['authType']] ?? self::API_URLS['standard'];

            $payload = [
                'username' => $apiSettings['username'],
                'password' => $apiSettings['password'],
                'mfapin' => $apiSettings['mfapin'] ?? '0000',
            ];

            Log::info('NextelecomService: Sending auth request', [
                'tenant_id' => $tenantId,
                'auth_type' => $apiSettings['authType'],
                'username' => $apiSettings['username'],
            ]);

            $response = Http::timeout(10)->post($authUrl, $payload);

            if (!$response->successful()) {
                Log::error('NextelecomService: Auth request failed', [
                    'tenant_id' => $tenantId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            $responseData = $response->json();
            $token = $responseData['token'] ?? $responseData['access_token'] ?? $responseData['AUTH_TOKEN'] ?? null;

            if (!$token) {
                Log::error('NextelecomService: No token in response', [
                    'tenant_id' => $tenantId,
                    'response_keys' => array_keys($responseData),
                ]);
                return null;
            }

            $tokenData = [
                'token' => $token,
                'username' => $apiSettings['username'],
                'authType' => $apiSettings['authType'],
                'savedAt' => now()->toDateTimeString(),
            ];

            NextelecomSetting::updateSetting('api_token', $tokenData, $tenantId);

            Log::info('NextelecomService: Token refreshed successfully', [
                'tenant_id' => $tenantId,
                'username' => $apiSettings['username'],
            ]);

            return $tokenData;
        } catch (\Exception $e) {
            Log::error('NextelecomService: Token refresh failed', [
                'tenant_id' => $tenantId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    public static function getValidToken(?string $tenantId = null): ?string
    {
        if (!$tenantId) {
            $tenantId = app('tenant.id') ?? null;
        }

        if (!$tenantId) {
            $tenantId = \App\Models\Tenant::first()?->id;
        }

        $tokenData = NextelecomSetting::getSetting('api_token', null, $tenantId);

        if (!$tokenData) {
            Log::warning('NextelecomService: No token data found', [
                'tenant_id' => $tenantId,
            ]);
            return null;
        }

        if (self::isTokenExpired($tokenData)) {
            Log::info('NextelecomService: Token expired, attempting refresh', [
                'tenant_id' => $tenantId,
            ]);
            
            $refreshed = self::refreshToken($tenantId);
            
            if (!$refreshed || !isset($refreshed['token'])) {
                Log::error('NextelecomService: Token refresh failed', [
                    'tenant_id' => $tenantId,
                ]);
                return null;
            }

            return $refreshed['token'];
        }

        return $tokenData['token'] ?? null;
    }
}
