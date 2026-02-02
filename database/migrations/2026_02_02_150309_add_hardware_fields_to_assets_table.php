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
        Schema::table('assets', function (Blueprint $table) {
            $table->string('ram')->nullable();
            $table->string('graphics_card')->nullable();
            $table->string('processor')->nullable();
            $table->string('keyboard_details')->nullable();
            $table->string('mouse_details')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn(['ram', 'graphics_card', 'processor', 'keyboard_details', 'mouse_details']);
        });
    }
};
