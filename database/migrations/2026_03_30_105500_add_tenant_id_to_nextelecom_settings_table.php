<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nextelecom_settings', function (Blueprint $table) {
            $table->string('tenant_id')->nullable()->after('type');
            $table->dropUnique(['type']);
            $table->unique(['tenant_id', 'type']);
            $table->index('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('nextelecom_settings', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropIndex(['tenant_id']);
            $table->dropUnique(['tenant_id', 'type']);
            $table->unique('type');
            $table->dropColumn('tenant_id');
        });
    }
};
