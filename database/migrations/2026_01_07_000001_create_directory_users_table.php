<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('directory_users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('azure_id');
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('department')->nullable();
            $table->string('office_location')->nullable();
            $table->string('job_title')->nullable();
            $table->string('mobile_phone')->nullable();
            $table->string('license_name')->nullable();
            $table->boolean('account_enabled')->default(true);
            $table->text('profile_pic_url')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['azure_id', 'tenant_id']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('directory_users');
    }
};
