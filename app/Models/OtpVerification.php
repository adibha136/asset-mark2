<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OtpVerification extends Model
{
    protected $fillable = [
        'mobile',
        'otp',
        'expiry_time',
        'status',
    ];

    protected $casts = [
        'expiry_time' => 'datetime',
    ];
}
