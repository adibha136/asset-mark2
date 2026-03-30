<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NextelecomSetting extends Model
{
    protected $table = 'nextelecom_settings';

    protected $fillable = [
        'type',
        'data',
        'last_synced_at',
    ];

    protected $casts = [
        'data' => 'array',
        'last_synced_at' => 'datetime',
    ];

    public static function getSetting($type, $default = null)
    {
        $setting = self::where('type', $type)->first();
        return $setting ? $setting->data : $default;
    }

    public static function updateSetting($type, $data)
    {
        return self::updateOrCreate(
            ['type' => $type],
            [
                'data' => $data,
                'last_synced_at' => now(),
            ]
        );
    }
}
