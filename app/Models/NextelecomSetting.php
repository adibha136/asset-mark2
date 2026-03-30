<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NextelecomSetting extends Model
{
    protected $table = 'nextelecom_settings';

    protected $fillable = [
        'tenant_id',
        'type',
        'data',
        'last_synced_at',
    ];

    protected $casts = [
        'data' => 'array',
        'last_synced_at' => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public static function getSetting($type, $default = null, $tenantId = null)
    {
        if (!$tenantId) {
            $tenantId = app('tenant.id');
        }

        $setting = self::where('type', $type)
            ->where('tenant_id', $tenantId)
            ->first();

        return $setting ? $setting->data : $default;
    }

    public static function updateSetting($type, $data, $tenantId = null)
    {
        if (!$tenantId) {
            $tenantId = app('tenant.id');
        }

        return self::updateOrCreate(
            ['type' => $type, 'tenant_id' => $tenantId],
            [
                'data' => $data,
                'last_synced_at' => now(),
            ]
        );
    }

    public static function getSettingForTenant($tenantId, $type, $default = null)
    {
        return self::getSetting($type, $default, $tenantId);
    }

    public static function updateSettingForTenant($tenantId, $type, $data)
    {
        return self::updateSetting($type, $data, $tenantId);
    }

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }
}
