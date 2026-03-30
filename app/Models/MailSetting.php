<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailSetting extends Model
{
    protected $fillable = [
        'tenant_id',
        'key',
        'value',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public static function getForTenant($tenantId = null)
    {
        if (!$tenantId) {
            $tenantId = app('tenant.id');
        }

        return self::where('tenant_id', $tenantId)->pluck('value', 'key');
    }

    public static function updateForTenant($settings, $tenantId = null)
    {
        if (!$tenantId) {
            $tenantId = app('tenant.id');
        }

        foreach ($settings as $key => $value) {
            self::updateOrCreate(
                ['tenant_id' => $tenantId, 'key' => $key],
                ['value' => (string) $value]
            );
        }
    }

    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }
}
