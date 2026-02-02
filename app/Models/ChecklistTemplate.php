<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChecklistTemplate extends Model
{
    protected $fillable = ['name', 'description'];

    public function questions()
    {
        return $this->hasMany(ChecklistQuestion::class, 'template_id')->orderBy('order');
    }
}
