<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Services\MicrosoftGraphService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class FetchUserPhoto implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $tenantId;

    protected $userId; // This is the Azure User ID

    /**
     * Create a new job instance.
     *
     * @param  string  $tenantId  The Azure Tenant ID
     * @param  string  $userId  The Azure User ID
     */
    public function __construct(string $tenantId, string $userId)
    {
        $this->tenantId = $tenantId;
        $this->userId = $userId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // 1. Find Tenant
        $tenant = Tenant::where('azure_tenant_id', $this->tenantId)->first();

        if (! $tenant || ! $tenant->client_id || ! $tenant->client_secret) {
            Log::warning("FetchUserPhoto: Tenant or credentials missing for Azure Tenant ID: {$this->tenantId}");

            return;
        }

        // 2. Initialize Graph Service
        try {
            $graphService = new MicrosoftGraphService(
                $tenant->azure_tenant_id,
                $tenant->client_id,
                $tenant->client_secret
            );

            // 3. Fetch Photo
            $photoContent = $graphService->getUserPhoto($this->userId);

            if ($photoContent) {
                // 4. Save to Storage
                // Path format: public/photos/{azure_tenant_id}/{azure_user_id}.jpg
                $path = "public/photos/{$this->tenantId}/{$this->userId}.jpg";
                Storage::put($path, $photoContent);

                Log::info("FetchUserPhoto: Saved photo for user {$this->userId} in tenant {$this->tenantId}");
            } else {
                Log::info("FetchUserPhoto: No photo available for user {$this->userId}");
                // Optional: Store a marker that we checked?
                // For now, next time it will try again if file missing.
                // To avoid loops on missing photos, we could store a placeholder or cache a "miss" key.
                // But given the instructions, just trying is okay.
                // Improvement: touch an empty file or specific 'no-photo' marker to avoid spamming Graph.
                // Let's stick to simple implementation first.
            }

        } catch (\Exception $e) {
            Log::error('FetchUserPhoto: Error fetching photo: '.$e->getMessage());
        }
    }
}
