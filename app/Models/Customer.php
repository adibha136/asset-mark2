<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $table = 'customers';

    protected $fillable = [
        'tenant_id',
        'external_id',
        'name',
        'email',
        'phone',
        'type',
        'abn',
        'street_number',
        'street_name',
        'street_type',
        'suburb',
        'state',
        'postcode',
        'sub_number',
        'is_reseller',
        'integration_create',
        'status',
    ];

    protected $casts = [
        'is_reseller' => 'boolean',
        'integration_create' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function getAddressAttribute()
    {
        return [
            'streetNumber' => $this->street_number,
            'streetName' => $this->street_name,
            'streetType' => $this->street_type,
            'suburb' => $this->suburb,
            'state' => $this->state,
            'postcode' => $this->postcode,
            'subNumber' => $this->sub_number,
        ];
    }

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public static function syncFromApi($customers, $tenantId)
    {
        if (!$tenantId) {
            \Log::error('Customer sync failed: No tenant ID provided');
            return;
        }

        if (!is_array($customers) || empty($customers)) {
            \Log::warning('Customer sync: No customers to sync');
            return;
        }

        try {
            foreach ($customers as $customerData) {
                if (!is_array($customerData) || !isset($customerData['name'])) {
                    \Log::warning('Customer sync: Skipping invalid customer data', ['data' => $customerData]);
                    continue;
                }

                $data = [
                    'tenant_id' => $tenantId,
                    'external_id' => $customerData['id'] ?? null,
                    'name' => $customerData['name'] ?? '',
                    'email' => $customerData['email'] ?? null,
                    'phone' => $customerData['phone'] ?? null,
                    'type' => $customerData['type'] ?? 'person',
                    'abn' => $customerData['abn'] ?? null,
                    'is_reseller' => (bool)($customerData['isReseller'] ?? false),
                    'integration_create' => (bool)($customerData['integrationCreate'] ?? true),
                    'status' => $customerData['status'] ?? null,
                ];

                if (isset($customerData['address']) && is_array($customerData['address'])) {
                    $data['street_number'] = $customerData['address']['streetNumber'] ?? null;
                    $data['street_name'] = $customerData['address']['streetName'] ?? null;
                    $data['street_type'] = $customerData['address']['streetType'] ?? null;
                    $data['suburb'] = $customerData['address']['suburb'] ?? null;
                    $data['state'] = $customerData['address']['state'] ?? null;
                    $data['postcode'] = $customerData['address']['postcode'] ?? null;
                    $data['sub_number'] = $customerData['address']['subNumber'] ?? null;
                }

                self::updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'external_id' => $customerData['id'] ?? null,
                    ],
                    $data
                );

                \Log::info('Customer synced', ['name' => $data['name'], 'tenant' => $tenantId]);
            }
        } catch (\Exception $e) {
            \Log::error('Customer sync failed', ['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
        }
    }
}
