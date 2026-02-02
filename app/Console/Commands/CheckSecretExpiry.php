<?php

use App\Models\Tenant;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class CheckSecretExpiry extends Command
{
    protected $signature = 'notifications:check-secret-expiry';

    protected $description = 'Check for expiring tenant client secrets and certificates';

    public function handle()
    {
        // Get tenants with secrets/certificates expiring in the next 30 days
        $expiringTenants = Tenant::where(function ($query) {
            $query->where('client_secret_expires_at', '<=', now()->addDays(30))
                ->orWhere('certificate_expires_at', '<=', now()->addDays(30));
        })->get();

        if ($expiringTenants->count() > 0) {
            NotificationService::sendSecretExpiryNotification($expiringTenants);
            $this->info("Found {$expiringTenants->count()} tenants with expiring credentials. Notifications sent.");
        } else {
            $this->info('No expiring credentials found.');
        }
    }
}
