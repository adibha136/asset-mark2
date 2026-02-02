<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetActivity extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'asset_id',
        'user_id',
        'user_name',
        'action',
        'description',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
