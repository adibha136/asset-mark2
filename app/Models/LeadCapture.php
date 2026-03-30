<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadCapture extends Model
{
    protected $fillable = [
        'mobile',
        'customer_name',
        'address',
        'purpose_of_visit',
        'interested_product',
        'budget',
        'remarks',
        'status',
    ];
}
