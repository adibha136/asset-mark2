<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('outage_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('outage_id');
            $table->string('customer_id');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('outage_notifications');
    }
};