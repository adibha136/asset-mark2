<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected $commands = [
        \App\Console\Commands\SyncDirectoryUsers::class,
        \App\Console\Commands\CheckWarrantyExpiry::class,
        \App\Console\Commands\CheckInactiveUsers::class,
        \App\Console\Commands\CheckSecretExpiry::class,
    ];

    protected function schedule(Schedule $schedule)
    {
        $schedule->command('sync:directory-users')
            ->everyMinute()
            ->withoutOverlapping();

        $schedule->command('notifications:check-warranty')
            ->daily()
            ->withoutOverlapping();

        $schedule->command('notifications:check-inactive')
            ->hourly()
            ->withoutOverlapping();

        $schedule->command('notifications:check-secret-expiry')
            ->quarterly()
            ->withoutOverlapping();
    }

    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
