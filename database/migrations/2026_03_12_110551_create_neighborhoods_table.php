<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('neighborhoods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('neighborhood_chairman', 100);
            $table->string('neighborhood_phone', 100);
            $table->string('prevention_inspector', 100);
            $table->string('inspector_phone', 100);
            $table->float('lat');
            $table->float('long');
            $table->string('crime_level', 20);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('neighborhoods');
    }
};
