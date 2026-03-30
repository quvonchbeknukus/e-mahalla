<?php

declare(strict_types=1);

use App\Models\Neighborhood;
use App\Models\Task;
use App\Models\TaskImage;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if ($argc < 2) {
    fwrite(STDERR, "Usage: php scripts/import_neighborhoods_from_docx.php <path-to-docx>\n");
    exit(1);
}

$docxPath = $argv[1];

if (! is_file($docxPath)) {
    fwrite(STDERR, "DOCX file not found: {$docxPath}\n");
    exit(1);
}

if (! class_exists(ZipArchive::class)) {
    fwrite(STDERR, "ZipArchive extension is required.\n");
    exit(1);
}

function collapse_spaces(string $value): string
{
    $value = str_replace("\xc2\xa0", ' ', $value);
    $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

    return trim($value);
}

function extract_cell_text(DOMElement $cell, DOMXPath $xpath): string
{
    $paragraphs = $xpath->query('.//w:p', $cell);
    $parts = [];

    if ($paragraphs !== false && $paragraphs->length > 0) {
        foreach ($paragraphs as $paragraph) {
            $texts = $xpath->query('.//w:t', $paragraph);

            if ($texts === false || $texts->length === 0) {
                continue;
            }

            $buffer = '';

            foreach ($texts as $textNode) {
                $buffer .= $textNode->textContent;
            }

            $buffer = collapse_spaces($buffer);

            if ($buffer !== '') {
                $parts[] = $buffer;
            }
        }
    }

    if ($parts === []) {
        $texts = $xpath->query('.//w:t', $cell);
        $buffer = '';

        if ($texts !== false) {
            foreach ($texts as $textNode) {
                $buffer .= $textNode->textContent;
            }
        }

        return collapse_spaces($buffer);
    }

    return collapse_spaces(implode(' ', $parts));
}

function normalize_name_key(string $value): string
{
    $value = mb_strtolower(collapse_spaces($value), 'UTF-8');

    $value = str_replace(
        ['’', '‘', 'ʼ', 'ʻ', '`', 'ʹ', 'ʽ', '“', '”', '"', '.', ',', '-', '–', '—', '(', ')'],
        ["'", "'", "'", "'", "'", "'", "'", ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
        $value
    );

    $value = str_replace(
        ["o'", "g'", "ya'", "yo'"],
        ['o', 'g', 'ya', 'yo'],
        $value
    );

    $value = preg_replace('/\btoshkent\s+tumani\b/u', ' ', $value) ?? $value;
    $value = preg_replace('/\bmfy\b/u', ' ', $value) ?? $value;
    $value = preg_replace('/\braisi\b/u', ' ', $value) ?? $value;
    $value = preg_replace('/\bda\b/u', ' ', $value) ?? $value;
    $value = preg_replace('/\bhokim\s+yordamchisi\b/u', ' ', $value) ?? $value;
    $value = preg_replace('/\bhokim\s+yordamchi\b/u', ' ', $value) ?? $value;
    $value = preg_replace('/\bmahallasi\b/u', ' ', $value) ?? $value;
    $value = preg_replace('/[^[:alnum:]]+/u', '', $value) ?? $value;

    return $value;
}

function parse_lat_long(string $value): array
{
    $normalized = collapse_spaces(str_replace(',', '.', $value));

    preg_match_all('/-?\d+(?:\.\d+)?/', $normalized, $matches);

    if (count($matches[0]) >= 2) {
        $lat = (float) $matches[0][0];
        $long = (float) $matches[0][1];

        if ($lat >= 40 && $lat <= 43 && $long >= 68 && $long <= 71) {
            return [$lat, $long];
        }
    }

    $compact = preg_replace('/\s+/u', '', $normalized) ?? $normalized;

    if (
        preg_match('/((?:40|41|42|43)\.\d+?)((?:68|69|70|71)\.\d+)/', $compact, $parts) === 1
    ) {
        return [
            (float) $parts[1],
            (float) $parts[2],
        ];
    }

    throw new RuntimeException("Unable to parse coordinates from: {$value}");
}

function parse_docx_rows(string $docxPath): array
{
    $zip = new ZipArchive();

    if ($zip->open($docxPath) !== true) {
        throw new RuntimeException("Unable to open DOCX: {$docxPath}");
    }

    $documentXml = $zip->getFromName('word/document.xml');
    $zip->close();

    if ($documentXml === false) {
        throw new RuntimeException('word/document.xml not found in DOCX.');
    }

    $dom = new DOMDocument();
    $dom->loadXML($documentXml);

    $xpath = new DOMXPath($dom);
    $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

    $rows = $xpath->query('//w:tbl[1]/w:tr');

    if ($rows === false || $rows->length < 2) {
        throw new RuntimeException('Mahalla table was not found in the DOCX file.');
    }

    $items = [];

    foreach ($rows as $index => $row) {
        if ($index === 0) {
            continue;
        }

        $cells = $xpath->query('./w:tc', $row);

        if ($cells === false || $cells->length < 6) {
            continue;
        }

        $values = [];

        foreach ($cells as $cell) {
            $values[] = extract_cell_text($cell, $xpath);
        }

        if (implode('', $values) === '') {
            continue;
        }

        [$lat, $long] = parse_lat_long($values[5]);

        $items[] = [
            'name' => $values[0],
            'neighborhood_chairman' => $values[1],
            'neighborhood_phone' => $values[2],
            'prevention_inspector' => $values[3],
            'inspector_phone' => $values[4],
            'lat' => $lat,
            'long' => $long,
        ];
    }

    return $items;
}

$timestamp = date('Ymd-His');
$backupDir = storage_path("app/import-backups/neighborhoods-{$timestamp}");
File::ensureDirectoryExists($backupDir);

$currentNeighborhoods = Neighborhood::query()
    ->orderBy('id')
    ->get([
        'id',
        'name',
        'crime_level',
        'neighborhood_chairman',
        'neighborhood_phone',
        'prevention_inspector',
        'inspector_phone',
        'lat',
        'long',
        'created_at',
        'updated_at',
    ])
    ->toArray();

$currentTasks = Task::query()
    ->with([
        'neighborhood:id,name',
        'images:id,task_id,path,created_at,updated_at',
    ])
    ->orderBy('id')
    ->get()
    ->map(function (Task $task): array {
        return [
            'id' => $task->id,
            'neighborhood_id' => $task->neighborhood_id,
            'neighborhood_name' => $task->neighborhood?->name,
            'direction_id' => $task->direction_id,
            'date' => $task->date,
            'text' => $task->text,
            'created_at' => (string) $task->created_at,
            'updated_at' => (string) $task->updated_at,
            'images' => $task->images->map(fn (TaskImage $image): array => [
                'id' => $image->id,
                'path' => $image->path,
                'created_at' => (string) $image->created_at,
                'updated_at' => (string) $image->updated_at,
            ])->all(),
        ];
    })
    ->all();

File::put(
    "{$backupDir}/neighborhoods.json",
    json_encode($currentNeighborhoods, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
);
File::put(
    "{$backupDir}/tasks.json",
    json_encode($currentTasks, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
);

$parsedRows = parse_docx_rows($docxPath);

if ($parsedRows === []) {
    throw new RuntimeException('No neighborhood rows were extracted from DOCX.');
}

$referenceByKey = [];

foreach ($currentNeighborhoods as $row) {
    $key = normalize_name_key((string) $row['name']);

    if ($key !== '' && ! array_key_exists($key, $referenceByKey)) {
        $referenceByKey[$key] = $row;
    }
}

$preparedRows = [];
$seenKeys = [];
$unmatchedRows = [];

foreach ($parsedRows as $row) {
    $key = normalize_name_key($row['name']);

    if ($key === '') {
        throw new RuntimeException("Unable to normalize neighborhood name: {$row['name']}");
    }

    if (isset($seenKeys[$key])) {
        throw new RuntimeException("Duplicate neighborhood key detected in DOCX: {$row['name']}");
    }

    $seenKeys[$key] = true;
    $reference = $referenceByKey[$key] ?? null;

    if ($reference === null) {
        $unmatchedRows[] = $row['name'];
    }

    $preparedRows[] = [
        ...$row,
        'crime_level' => $reference['crime_level'] ?? 'yashil',
        'created_at' => now(),
        'updated_at' => now(),
        '_key' => $key,
    ];
}

$seedRows = array_map(function (array $row): array {
    unset($row['_key']);

    return $row;
}, $preparedRows);

File::put(
    database_path('seeders/data/neighborhoods.json'),
    json_encode($seedRows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
);

$newNeighborhoodIdByKey = [];
$restoredTasksCount = 0;
$skippedTasksCount = 0;
$restoredImagesCount = 0;
$skippedTaskNames = [];

DB::transaction(function () use (
    $preparedRows,
    $currentTasks,
    &$newNeighborhoodIdByKey,
    &$restoredTasksCount,
    &$skippedTasksCount,
    &$restoredImagesCount,
    &$skippedTaskNames
): void {
    TaskImage::query()->delete();
    Task::query()->delete();
    Neighborhood::query()->delete();

    foreach ($preparedRows as $row) {
        $key = $row['_key'];
        unset($row['_key']);

        $newNeighborhoodIdByKey[$key] = (int) DB::table('neighborhoods')->insertGetId($row);
    }

    foreach ($currentTasks as $taskRow) {
        $taskKey = normalize_name_key((string) ($taskRow['neighborhood_name'] ?? ''));

        if ($taskKey === '' || ! isset($newNeighborhoodIdByKey[$taskKey])) {
            $skippedTasksCount++;

            if (($taskRow['neighborhood_name'] ?? '') !== '') {
                $skippedTaskNames[] = $taskRow['neighborhood_name'];
            }

            continue;
        }

        $newTaskId = (int) DB::table('tasks')->insertGetId([
            'neighborhood_id' => $newNeighborhoodIdByKey[$taskKey],
            'direction_id' => $taskRow['direction_id'],
            'date' => $taskRow['date'],
            'text' => $taskRow['text'],
            'created_at' => $taskRow['created_at'],
            'updated_at' => $taskRow['updated_at'],
        ]);

        $restoredTasksCount++;

        foreach ($taskRow['images'] as $imageRow) {
            DB::table('task_images')->insert([
                'task_id' => $newTaskId,
                'path' => $imageRow['path'],
                'created_at' => $imageRow['created_at'],
                'updated_at' => $imageRow['updated_at'],
            ]);

            $restoredImagesCount++;
        }
    }
});

$skippedTaskNames = array_values(array_unique($skippedTaskNames));

echo "Neighborhood import completed.\n";
echo "Backup directory: {$backupDir}\n";
echo 'Imported neighborhoods: ' . count($preparedRows) . "\n";
echo 'Restored tasks: ' . $restoredTasksCount . "\n";
echo 'Skipped tasks: ' . $skippedTasksCount . "\n";
echo 'Restored task images: ' . $restoredImagesCount . "\n";

if ($unmatchedRows !== []) {
    echo "Crime level defaulted to 'yashil' for: " . implode(', ', $unmatchedRows) . "\n";
}

if ($skippedTaskNames !== []) {
    echo "Tasks skipped because the neighborhood is missing from DOCX: " . implode(', ', $skippedTaskNames) . "\n";
}
