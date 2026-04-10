<?php

namespace App\Console\Commands;

use App\Models\NextelecomSetting;
use App\Models\Tenant;
use App\Services\NextelecomService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RefreshNextelecomTokens extends Command
{
    protected $signature = 'nextelecom:refresh-tokens';
    protected $description = 'Refresh expired or expiring Nextelecom tokens for all tenants';

    public function handle()
    {
        Log::info('RefreshNextelecomTokens: Starting token refresh cycle');
        $this->info('Starting Nextelecom token refresh cycle...');

        try {
            $tenants = Tenant::all();
            $refreshed = 0;
            $failed = 0;

            foreach ($tenants as $tenant) {
                $tokenData = NextelecomSetting::getSetting('api_token', null, $tenant->id);

                if (!$tokenData) {
                    Log::debug('RefreshNextelecomTokens: No token found for tenant', [
                        'tenant_id' => $tenant->id,
                    ]);
                    continue;
                }

                if (NextelecomService::isTokenExpired($tokenData)) {
                    $this->info("Refreshing token for tenant: {$tenant->id}");
                    Log::info('RefreshNextelecomTokens: Token expired, attempting refresh', [
                        'tenant_id' => $tenant->id,
                        'username' => $tokenData['username'] ?? 'unknown',
                    ]);

                    $result = NextelecomService::refreshToken($tenant->id);

                    if ($result) {
                        $refreshed++;
                        $this->info("✓ Token refreshed for tenant: {$tenant->id}");
                        Log::info('RefreshNextelecomTokens: Token refreshed successfully', [
                            'tenant_id' => $tenant->id,
                        ]);
                    } else {
                        $failed++;
                        $this->warn("✗ Failed to refresh token for tenant: {$tenant->id}");
                        Log::error('RefreshNextelecomTokens: Token refresh failed', [
                            'tenant_id' => $tenant->id,
                        ]);
                    }
                }
            }

            Log::info('RefreshNextelecomTokens: Token refresh cycle completed', [
                'total_tenants' => count($tenants),
                'refreshed' => $refreshed,
                'failed' => $failed,
            ]);

            $this->info("Token refresh cycle completed. Refreshed: $refreshed, Failed: $failed");

            return 0;
        } catch (\Exception $e) {
            Log::error('RefreshNextelecomTokens: Error during token refresh', [
                'error' => $e->getMessage(),
            ]);
            $this->error("Error during token refresh: {$e->getMessage()}");

            return 1;
        }
    }
}
