<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DirectoryUser extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'tenant_id',
        'azure_id',
        'name',
        'email',
        'phone',
        'mobile_phone',
        'department',
        'office_location',
        'job_title',
        'license_name',
        'account_enabled',
        'profile_pic_url',
    ];

    protected $casts = [
        'account_enabled' => 'boolean',
    ];

    protected $withCount = ['assets'];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function assetAssignments()
    {
        return $this->hasMany(AssetAssignment::class, 'user_id');
    }

    public function assets()
    {
        return $this->belongsToMany(Asset::class, 'asset_assignments', 'user_id', 'asset_id')
            ->withPivot('assigned_at', 'unassigned_at')
            ->wherePivotNull('unassigned_at');
    }

    public function checklistSubmissions()
    {
        return $this->hasMany(ChecklistSubmission::class, 'directory_user_id');
    }
}
