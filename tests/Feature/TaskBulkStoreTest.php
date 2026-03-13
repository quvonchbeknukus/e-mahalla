<?php

namespace Tests\Feature;

use App\Models\Direction;
use App\Models\Neighborhood;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class TaskBulkStoreTest extends TestCase
{
    use RefreshDatabase;

    protected array $createdPaths = [];

    protected function tearDown(): void
    {
        foreach ($this->createdPaths as $path) {
            if ($path && File::exists(public_path($path))) {
                File::delete(public_path($path));
            }
        }

        parent::tearDown();
    }

    public function test_it_stores_multiple_tasks_in_a_single_request(): void
    {
        [$direction, $neighborhood] = $this->createDependencies();

        $response = $this->post('/api/tasks', [
            'tasks' => [
                [
                    'neighborhood_id' => $neighborhood->id,
                    'direction_id' => $direction->id,
                    'date' => '2026-03-13',
                    'text' => 'Birinchi task',
                    'images' => [
                        $this->fakeImage('task-a-1.jpg'),
                        $this->fakeImage('task-a-2.jpg'),
                    ],
                ],
                [
                    'neighborhood_id' => $neighborhood->id,
                    'direction_id' => $direction->id,
                    'date' => '2026-03-13',
                    'text' => 'Ikkinchi task',
                    'images' => [
                        $this->fakeImage('task-b-1.jpg'),
                    ],
                ],
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonCount(2, 'data')
            ->assertJsonCount(2, 'data.0.images')
            ->assertJsonCount(1, 'data.1.images');

        foreach ($response->json('data') as $task) {
            foreach ($task['images'] as $image) {
                $this->trackPath($image['path']);
                $this->assertFileExists(public_path($image['path']));
            }
        }

        $this->assertDatabaseCount('tasks', 2);
        $this->assertDatabaseCount('task_images', 3);
    }

    public function test_it_rejects_more_than_four_images_for_one_task(): void
    {
        [$direction, $neighborhood] = $this->createDependencies();

        $response = $this->withHeaders([
            'Accept' => 'application/json',
        ])->post('/api/tasks', [
            'tasks' => [
                [
                    'neighborhood_id' => $neighborhood->id,
                    'direction_id' => $direction->id,
                    'date' => '2026-03-13',
                    'text' => 'Rasm limiti testi',
                    'images' => [
                        $this->fakeImage('limit-1.jpg'),
                        $this->fakeImage('limit-2.jpg'),
                        $this->fakeImage('limit-3.jpg'),
                        $this->fakeImage('limit-4.jpg'),
                        $this->fakeImage('limit-5.jpg'),
                    ],
                ],
            ],
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors('tasks.0.images');

        $this->assertDatabaseCount('tasks', 0);
        $this->assertDatabaseCount('task_images', 0);
    }

    private function createDependencies(): array
    {
        $direction = Direction::create([
            'name' => 'Nazorat',
        ]);

        $neighborhood = Neighborhood::create([
            'name' => 'Bogiston',
            'crime_level' => 'past',
            'lat' => 41.001,
            'long' => 69.001,
            'neighborhood_chairman' => 'Akmal Karimov',
            'neighborhood_phone' => '998900000111',
            'prevention_inspector' => 'Sardor Ergashev',
            'inspector_phone' => '998900000222',
        ]);

        return [$direction, $neighborhood];
    }

    private function trackPath(?string $path): void
    {
        if ($path) {
            $this->createdPaths[] = $path;
        }
    }

    private function fakeImage(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==')
        );
    }
}
