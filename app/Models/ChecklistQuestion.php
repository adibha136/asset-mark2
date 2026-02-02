<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChecklistQuestion extends Model
{
    protected $fillable = [
        'template_id',
        'question_text',
        'question_type',
        'options',
        'order',
    ];

    protected $casts = [
        'options' => 'array',
    ];

    public function template()
    {
        return $this->belongsTo(ChecklistTemplate::class, 'template_id');
    }
}
