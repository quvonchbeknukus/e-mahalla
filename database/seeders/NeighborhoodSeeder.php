<?php

namespace Database\Seeders;

use App\Models\Neighborhood;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class NeighborhoodSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/neighborhoods.json');

        if (! File::exists($path)) {
            throw new \RuntimeException("Neighborhood dataset not found: {$path}");
        }

        $rows = json_decode(File::get($path), true, flags: JSON_THROW_ON_ERROR);

        foreach ($rows as $row) {
            Neighborhood::query()->firstOrCreate($row);
        }
    }
}
