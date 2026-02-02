<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncDirectoryUsers extends Command
{
    protected $signature = 'sync:directory-users {--tenant-id=}';

    protected $description = 'Sync directory users from Microsoft Graph to database';

    public function handle()
    {
        $tenantId = $this->option('tenant-id');

        $query = Tenant::query();
        if ($tenantId) {
            $query->where('id', $tenantId);
        }
        $query->where('fetch_from_graph', true)
            ->where('auto_directory_sync', true);

        $tenants = $query->get();

        if ($tenants->isEmpty()) {
            $this->info('No tenants with auto-sync enabled found.');

            return 0;
        }

        foreach ($tenants as $tenant) {
            try {
                $count = $tenant->syncWithGraph();
                $this->info("✓ Synced: {$tenant->name} ({$count} users)");
            } catch (\Exception $e) {
                $this->error("✗ Failed to sync {$tenant->name}: ".$e->getMessage());
                Log::error('Directory sync error for tenant '.$tenant->id.': '.$e->getMessage());
            }
        }

        return 0;
    }
}
