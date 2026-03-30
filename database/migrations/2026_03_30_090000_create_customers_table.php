<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->nullable();
            $table->string('external_id')->nullable();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->enum('type', ['person', 'business'])->default('person');
            $table->string('abn')->nullable();
            
            $table->string('street_number')->nullable();
            $table->string('street_name')->nullable();
            $table->string('street_type')->nullable();
            $table->string('suburb')->nullable();
            $table->string('state')->nullable();
            $table->string('postcode')->nullable();
            $table->string('sub_number')->nullable();
            
            $table->boolean('is_reseller')->default(false);
            $table->boolean('integration_create')->default(true);
            $table->string('status')->nullable();
            
            $table->timestamps();
            
            $table->index('tenant_id');
            $table->index('external_id');
            $table->index('name');
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
