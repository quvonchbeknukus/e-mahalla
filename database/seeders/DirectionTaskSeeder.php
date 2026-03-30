<?php

namespace Database\Seeders;

use App\Models\Direction;
use App\Models\Neighborhood;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class DirectionTaskSeeder extends Seeder
{
    private const TARGET_COUNTS = [
        1 => 10,
        2 => 12,
        3 => 15,
        4 => 11,
        5 => 14,
        6 => 13,
    ];

    private const TOPICS = [
        1 => [
            "Maktab va mahalla vakillari bilan profilaktik uchrashuv otkazildi",
            "Oilalarning ijtimoiy holatini organish boyicha uyma-uy suhbat qilindi",
            "Bandlik va kasbga yonaltirish mavzusida davra suhbati tashkil etildi",
            "Talim muassasasi atrofida nazorat tadbiri otkazildi",
        ],
        2 => [
            "Ichki kochalarda harakat xavfsizligi boyicha tushuntirish ishlari olib borildi",
            "Piyodalar otish joylari holati yuzasidan organish amalga oshirildi",
            "Transport oqimini tartibga solish boyicha amaliy tadbir tashkil qilindi",
            "Yol belgilari va yoritish nuqtalari boyicha monitoring otkazildi",
        ],
        3 => [
            "Kuzatuv vositalari va qoriqlash choralarini kuchaytirish boyicha yig ilish otkazildi",
            "Mol-mulk daxlsizligini taminlash yuzasidan tushuntirish ishlari olib borildi",
            "Raqamli nazorat vositalaridan foydalanish boyicha amaliy seminar otkazildi",
            "Savdo nuqtalari xavfsizligini organish tadbiri tashkil etildi",
        ],
        4 => [
            "Yoshlar bilan uchrashuv va muammolarni organish boyicha muloqot otkazildi",
            "Xotin-qizlar faollari ishtirokida profilaktik suhbat tashkil etildi",
            "Sport va manaviy-marifiy tadbirlar rejasini shakllantirish boyicha yig ilish boldi",
            "Ijtimoiy himoyaga muhtoj oilalar bilan manzilli ishlash tadbiri otkazildi",
        ],
        5 => [
            "Jamoat tartibini saqlash boyicha kechki reyd tashkil qilindi",
            "Huquqbuzarliklarning oldini olish yuzasidan profilaktik suhbat otkazildi",
            "Risk guruhidagi fuqarolar bilan yakka tartibdagi ishlash tashkil etildi",
            "Mahallada xavfsizlik va osoyishtalik boyicha yig ilish boldi",
        ],
        6 => [
            "Aholi bilan ochiq muloqot va murojaatlar tahlili boyicha uchrashuv boldi",
            "OAV vakillari bilan axborot almashinuvi yuzasidan tadbir tashkil etildi",
            "Jamoatchilik faollari bilan tushuntirish ishlari olib borildi",
            "Mahalladagi ijobiy tajribalarni yoritish boyicha uchrashuv otkazildi",
        ],
    ];

    public function run(): void
    {
        $neighborhoodBuckets = [
            "qizil" => Neighborhood::query()
                ->where("crime_level", "qizil")
                ->orderBy("id")
                ->pluck("id")
                ->all(),
            "sariq" => Neighborhood::query()
                ->where("crime_level", "sariq")
                ->orderBy("id")
                ->pluck("id")
                ->all(),
            "yashil" => Neighborhood::query()
                ->where("crime_level", "yashil")
                ->orderBy("id")
                ->pluck("id")
                ->all(),
        ];

        foreach ($neighborhoodBuckets as $crimeLevel => $neighborhoodIds) {
            if ($neighborhoodIds === []) {
                throw new RuntimeException("No neighborhoods found for crime level: {$crimeLevel}");
            }
        }

        $directions = Direction::query()
            ->withCount("tasks")
            ->orderBy("id")
            ->get();

        DB::transaction(function () use ($directions, $neighborhoodBuckets): void {
            foreach ($directions as $index => $direction) {
                $targetCount = self::TARGET_COUNTS[$direction->id] ?? (10 + ($index % 6));
                $existingCount = (int) $direction->tasks_count;
                $missingCount = max(0, $targetCount - $existingCount);

                if ($missingCount === 0) {
                    $this->command?->info(
                        "Direction {$direction->id} already has {$existingCount} tasks."
                    );
                    continue;
                }

                $directionName = Str::of($direction->name)
                    ->replace(["\r", "\n"], " ")
                    ->squish()
                    ->value();
                $topics = self::TOPICS[$direction->id] ?? [
                    "Mahallada yonalish boyicha amaliy tadbir otkazildi",
                ];

                for ($offset = 0; $offset < $missingCount; $offset++) {
                    $sequence = $existingCount + $offset;
                    $crimeLevel = ["qizil", "sariq", "yashil"][($sequence + $direction->id) % 3];
                    $bucket = $neighborhoodBuckets[$crimeLevel];
                    $neighborhoodId = $bucket[($direction->id + ($sequence * 2)) % count($bucket)];
                    $topic = $topics[$sequence % count($topics)];
                    $date = Carbon::create(2026, 1, 5)->addDays(($direction->id * 7) + ($sequence * 4));

                    Task::query()->create([
                        "neighborhood_id" => $neighborhoodId,
                        "direction_id" => $direction->id,
                        "date" => $date->toDateString(),
                        "text" => "{$topic}. {$directionName} yonalishi boyicha mahallada manzilli ish olib borildi.",
                    ]);
                }

                $this->command?->info(
                    "Direction {$direction->id} topped up from {$existingCount} to {$targetCount} tasks."
                );
            }
        });
    }
}
