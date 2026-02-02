<?php

namespace App\Models;

use App\Services\MicrosoftGraphService;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'name',
        'domain',
        'status',
        'is_manual',
        'fetch_from_graph',
        'auto_directory_sync',
        'redirect_url',
        'azure_tenant_id',
        'client_id',
        'client_secret',
        'description',
        'usersCount',
        'assetsCount',
        'license_name',
        'license_count',
        'last_sync_at',
        'client_secret_expires_at',
        'certificate_expires_at',
        'last_scheduled_sync_at',
    ];

    protected $casts = [
        'is_manual' => 'boolean',
        'fetch_from_graph' => 'boolean',
        'auto_directory_sync' => 'boolean',
        'usersCount' => 'integer',
        'assetsCount' => 'integer',
        'license_count' => 'integer',
        'last_sync_at' => 'datetime',
        'client_secret_expires_at' => 'datetime',
        'certificate_expires_at' => 'datetime',
        'last_scheduled_sync_at' => 'datetime',
    ];

    public function syncWithGraph()
    {
        if (! $this->azure_tenant_id || ! $this->client_id || ! $this->client_secret) {
            return 0;
        }

        try {
            $graphService = new MicrosoftGraphService(
                $this->azure_tenant_id,
                $this->client_id,
                $this->client_secret
            );

            // Update tenant organization details
            $details = $graphService->getAllDetails();
            if ($details['name']) {
                $updatePayload = [
                    'license_name' => $details['license_name'] ?? $this->license_name,
                    'license_count' => $details['license_count'] ?? $this->license_count,
                    'assetsCount' => $details['assets_count'] ?? $this->assetsCount,
                    'client_secret_expires_at' => $details['client_secret_expires_at'] ?? $this->client_secret_expires_at,
                    'certificate_expires_at' => $details['certificate_expires_at'] ?? $this->certificate_expires_at,
                    'last_sync_at' => now(),
                ];

                // Only override name/domain if they are empty or if we are in auto-sync mode (not is_manual)
                if (! $this->name || ! $this->is_manual) {
                    $updatePayload['name'] = $details['name'];
                }

                if (! $this->domain || ! $this->is_manual) {
                    $updatePayload['domain'] = $details['domain'] ?? $this->domain;
                }

                $this->update($updatePayload);
            }

            $users = $graphService->getAllUsers();
            $usersToUpsert = [];
            $now = now();

            foreach ($users as $userData) {
                $usersToUpsert[] = [
                    'id' => (string) Str::uuid(),
                    'azure_id' => $userData['id'],
                    'tenant_id' => $this->id,
                    'name' => $userData['name'],
                    'email' => $userData['email'],
                    'phone' => $userData['phone'],
                    'mobile_phone' => $userData['mobile_phone'],
                    'department' => $userData['department'],
                    'office_location' => $userData['office_location'],
                    'job_title' => $userData['job_title'],
                    'license_name' => $userData['license_name'],
                    'account_enabled' => $userData['status'] === 'active',
                    'profile_pic_url' => $userData['avatar'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (! empty($usersToUpsert)) {
                // Use upsert for much better performance with large user sets
                // We chunk it to avoid potential database limits on large inserts
                foreach (array_chunk($usersToUpsert, 100) as $chunk) {
                    DirectoryUser::upsert($chunk,
                        ['azure_id', 'tenant_id'],
                        ['name', 'email', 'phone', 'mobile_phone', 'department', 'office_location', 'job_title', 'license_name', 'account_enabled', 'profile_pic_url', 'updated_at']
                    );
                }
            }

            $syncedCount = count($usersToUpsert);
            $duration = now()->diffInSeconds($now);

            // Update tenant counts
            $this->update([
                'usersCount' => $details['users_count'] ?? DirectoryUser::where('tenant_id', $this->id)->count(),
                'assetsCount' => $details['assets_count'] ?? $this->assetsCount,
                'last_sync_at' => now(),
            ]);

            // Create sync log
            SyncLog::create([
                'tenant_id' => $this->id,
                'status' => 'success',
                'records_synced' => $syncedCount,
                'duration' => $duration.'s',
                'source' => 'Azure AD',
            ]);

            Log::info('Synced '.$syncedCount.' users for tenant: '.$this->name.' (Graph reported: '.($details['users_count'] ?? 'unknown').')');

            return $syncedCount;
        } catch (\Exception $e) {
            Log::error("Failed to sync users for tenant {$this->name}: ".$e->getMessage());

            SyncLog::create([
                'tenant_id' => $this->id,
                'status' => 'failed',
                'records_synced' => 0,
                'duration' => '0s',
                'source' => 'Azure AD',
            ]);

            return 0;
        }
    }

    public function directoryUsers()
    {
        return $this->hasMany(DirectoryUser::class);
    }

    public function assets()
    {
        return $this->hasMany(Asset::class);
    }
}
