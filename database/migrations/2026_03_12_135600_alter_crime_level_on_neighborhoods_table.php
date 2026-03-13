<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('neighborhoods')) {
            return;
        }

        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement('ALTER TABLE neighborhoods MODIFY crime_level VARCHAR(20) NOT NULL');
    }

    public function down(): void
    {
        if (! Schema::hasTable('neighborhoods')) {
            return;
        }

        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE neighborhoods MODIFY crime_level ENUM('yuqori', 'o\\'rta', 'past') NOT NULL");
    }
};
