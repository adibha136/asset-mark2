<?php

namespace App\Console\Commands;

use App\Models\DirectoryUser;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckInactiveUsers extends Command
{
    protected $signature = 'notifications:check-inactive';

    protected $description = 'Check for users who became inactive and send notifications';

    public function handle()
    {
        // For this example, we'll check users who were updated to inactive in the last 24 hours
        $inactiveUsers = DirectoryUser::with('tenant')
            ->where('account_enabled', false)
            ->where('updated_at', '>=', Carbon::now()->subDay())
            ->get();

        if ($inactiveUsers->count() > 0) {
            NotificationService::sendUserInactiveNotification($inactiveUsers);
            $this->info("Found {$inactiveUsers->count()} newly inactive users. Notifications sent.");
        } else {
            $this->info('No newly inactive users found.');
        }
    }
}
