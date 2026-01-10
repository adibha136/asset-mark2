<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetDocument extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'asset_id',
        'name',
        'file_path',
        'file_type',
        'file_size',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }
}
