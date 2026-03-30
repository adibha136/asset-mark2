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
        Schema::create('lead_captures', function (Blueprint $table) {
            $table->id();
            $table->string('mobile', 20);
            $table->string('customer_name');
            $table->text('address')->nullable();
            $table->string('purpose_of_visit')->nullable();
            $table->string('interested_product')->nullable();
            $table->string('budget')->nullable();
            $table->text('remarks')->nullable();
            $table->enum('status', ['draft', 'submitted', 'contacted'])->default('submitted');
            $table->timestamps();
            $table->index('mobile');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_captures');
    }
};
