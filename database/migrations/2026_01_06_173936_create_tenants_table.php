<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('domain')->nullable();
            $table->string('status')->default('active');
            $table->boolean('is_manual')->default(true);
            $table->boolean('fetch_from_graph')->default(false);
            $table->boolean('auto_directory_sync')->default(false);
            $table->string('redirect_url')->nullable();
            $table->string('azure_tenant_id')->nullable();
            $table->string('client_id')->nullable();
            $table->string('client_secret')->nullable();
            $table->text('description')->nullable();
            $table->integer('usersCount')->default(0);
            $table->integer('assetsCount')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
