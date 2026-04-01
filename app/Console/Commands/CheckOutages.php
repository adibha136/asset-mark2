<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\OutageService;

class CheckOutages extends Command
{
    protected $signature = 'outages:check';
    protected $description = 'Check outages and notify customers';

    public function handle()
    {
        app(OutageService::class)->process();

        $this->info('Outage check completed successfully');
    }
}