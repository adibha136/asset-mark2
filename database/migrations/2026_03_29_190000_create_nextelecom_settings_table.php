<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nextelecom_settings', function (Blueprint $table) {
            $table->id();
            $table->string('type')->index(); // 'api', 'email', 'sms', 'auto_sms'
            $table->text('data'); // JSON data
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
            
            $table->unique('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nextelecom_settings');
    }
};
