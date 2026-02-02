<?php

namespace App\Console\Commands;

use App\Models\Asset;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckWarrantyExpiry extends Command
{
    protected $signature = 'notifications:check-warranty';

    protected $description = 'Check for assets with expiring warranties and send notifications';

    public function handle()
    {
        $expiryThreshold = Carbon::now()->addDays(30);

        $expiringAssets = Asset::whereNotNull('warranty_expiry')
            ->where('warranty_expiry', '<=', $expiryThreshold)
            ->where('warranty_expiry', '>', Carbon::now()->subDays(1)) // Don't keep notifying forever for very old ones
            ->get();

        if ($expiringAssets->count() > 0) {
            NotificationService::sendWarrantyExpiryNotification($expiringAssets);
            $this->info("Found {$expiringAssets->count()} expiring assets. Notifications sent.");
        } else {
            $this->info('No expiring assets found.');
        }
    }
}
