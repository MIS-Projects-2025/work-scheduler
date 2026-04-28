<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('holidays', function (Blueprint $table) {
            $table->increments('ID');
            $table->string('holiday_name', 100);
            $table->date('holiday_date');
            $table->enum('holiday_type', ['Regular', 'Special']);
            $table->string('color', 20)->default('#FF5733');
            $table->string('created_by', 45)->nullable();
            $table->string('created_at', 45)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holidays');
    }
};
