<?php

namespace App\Jobs;

use App\Models\Tenant;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncTenantDirectory implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $tenantId;

    /**
     * Create a new job instance.
     */
    public function __construct(string $tenantId)
    {
        $this->tenantId = $tenantId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $tenant = Tenant::find($this->tenantId);

        if (! $tenant) {
            Log::warning("SyncTenantDirectory: Tenant not found {$this->tenantId}");

            return;
        }

        if (! $tenant->fetch_from_graph || ! $tenant->azure_tenant_id || ! $tenant->client_id || ! $tenant->client_secret) {
            Log::info("SyncTenantDirectory: Graph API not configured for tenant {$tenant->name}");

            return;
        }

        Log::info("SyncTenantDirectory: Starting sync for tenant {$tenant->name}");

        try {
            $count = $tenant->syncWithGraph();
            Log::info("SyncTenantDirectory: Completed sync for tenant {$tenant->name}. Synced {$count} users.");
        } catch (\Exception $e) {
            Log::error("SyncTenantDirectory: Failed for tenant {$tenant->name}: ".$e->getMessage());
        }
    }
}
