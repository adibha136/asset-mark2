<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailSettings extends Model
{
    protected $fillable = [
        'tenant_id',
        'email_mode',
        'test_recipient_email',
    ];

    protected $casts = [
        'email_mode' => 'string',
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

        return self::where('tenant_id', $tenantId)->first() 
            ?? self::create([
                'tenant_id' => $tenantId,
                'email_mode' => 'live',
                'test_recipient_email' => null,
            ]);
    }

    public static function updateForTenant($data, $tenantId = null)
    {
        if (!$tenantId) {
            $tenantId = app('tenant.id');
        }

        return self::updateOrCreate(
            ['tenant_id' => $tenantId],
            $data
        );
    }

    public function isTestMode(): bool
    {
        return $this->email_mode === 'test';
    }

    public function isLiveMode(): bool
    {
        return $this->email_mode === 'live';
    }
}
