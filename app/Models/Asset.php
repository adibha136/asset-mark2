<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
        'type',
        'serial_number',
        'warranty_expiry',
        'license_expiry',
        'description',
        'status',
        'cost',
        'purchased_type',
        'file_path',
    ];

    protected $appends = ['assignedto', 'location'];

    protected $casts = [
        'warranty_expiry' => 'date',
        'license_expiry' => 'date',
    ];

    public function getAssignedtoAttribute()
    {
        return $this->assignedUsers->first()?->name;
    }

    public function getLocationAttribute()
    {
        return $this->assignedUsers->first()?->tenant->name ?? 'Main Office';
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function assignedUsers()
    {
        return $this->belongsToMany(DirectoryUser::class, 'asset_assignments', 'asset_id', 'user_id')
            ->withPivot('assigned_at', 'unassigned_at')
            ->wherePivotNull('unassigned_at');
    }

    public function assignments()
    {
        return $this->hasMany(AssetAssignment::class);
    }

    public function activities()
    {
        return $this->hasMany(AssetActivity::class)->orderBy('created_at', 'desc');
    }

    public function documents()
    {
        return $this->hasMany(AssetDocument::class);
    }
}
