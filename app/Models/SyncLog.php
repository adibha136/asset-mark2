<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncLog extends Model
{
    protected $fillable = [
        'tenant_id',
        'status',
        'records_synced',
        'duration',
        'source',
    ];
}
