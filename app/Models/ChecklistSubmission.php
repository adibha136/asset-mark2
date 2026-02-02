<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChecklistSubmission extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'completed_at' => 'datetime',
    ];

    public function assignment()
    {
        return $this->belongsTo(ChecklistAssignment::class, 'assignment_id');
    }

    public function directoryUser()
    {
        return $this->belongsTo(DirectoryUser::class, 'directory_user_id');
    }

    public function answers()
    {
        return $this->hasMany(ChecklistAnswer::class, 'submission_id');
    }

    public function logs()
    {
        return $this->hasMany(ChecklistLog::class, 'submission_id');
    }
}
