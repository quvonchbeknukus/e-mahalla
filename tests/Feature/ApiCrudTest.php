<?php

namespace Tests\Feature;

use App\Models\Direction;
use App\Models\Neighborhood;
use App\Models\Task;
use App\Support\TaskImageUpload;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ApiCrudTest extends TestCase
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

    public function test_it_manages_users_directions_and_neighborhoods(): void
    {
        $userResponse = $this->postJson('/api/users', [
            'name' => 'Ali',
            'last_name' => 'Valiyev',
            'phone' => '998901112233',
            'role' => 'admin',
            'password' => 'secret123',
        ]);

        $userResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Ali');

        $userId = $userResponse->json('data.id');

        $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonPath('data.0.id', $userId);

        $this->getJson('/api/users/'.$userId)
            ->assertOk()
            ->assertJsonPath('data.phone', '998901112233');

        $this->putJson('/api/users/'.$userId, [
            'role' => 'operator',
        ])->assertOk()
            ->assertJsonPath('data.role', 'operator');

        $directionResponse = $this->postJson('/api/directions', [
            'name' => 'Obodonlashtirish',
        ]);

        $directionResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Obodonlashtirish');

        $directionId = $directionResponse->json('data.id');

        $this->getJson('/api/directions/'.$directionId)
            ->assertOk()
            ->assertJsonPath('data.id', $directionId);

        $this->patchJson('/api/directions/'.$directionId, [
            'name' => 'Ijtimoiy masalalar',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Ijtimoiy masalalar');

        $neighborhoodResponse = $this->postJson('/api/neighborhoods', [
            'name' => 'Navbahor',
            'crime_level' => "o'rta",
            'lat' => 41.3111,
            'long' => 69.2797,
            'neighborhood_chairman' => 'Akbar Sodiqov',
            'neighborhood_phone' => '998901234567',
            'prevention_inspector' => 'Aziz Karimov',
            'inspector_phone' => '998907654321',
        ]);

        $neighborhoodResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Navbahor');

        $neighborhoodId = $neighborhoodResponse->json('data.id');

        $this->getJson('/api/neighborhoods/'.$neighborhoodId)
            ->assertOk()
            ->assertJsonPath('data.id', $neighborhoodId);

        $this->putJson('/api/neighborhoods/'.$neighborhoodId, [
            'crime_level' => 'yuqori',
        ])->assertOk()
            ->assertJsonPath('data.crime_level', 'yuqori');

        $this->deleteJson('/api/directions/'.$directionId)->assertOk();
        $this->deleteJson('/api/neighborhoods/'.$neighborhoodId)->assertOk();
        $this->deleteJson('/api/users/'.$userId)->assertOk();
    }

    public function test_it_manages_tasks_with_images_inside_task_crud(): void
    {
        $direction = Direction::create([
            'name' => 'Bandlik',
        ]);

        $neighborhood = Neighborhood::create([
            'name' => 'Bogiston',
            'crime_level' => 'past',
            'lat' => 40.998,
            'long' => 71.6726,
            'neighborhood_chairman' => 'Jamshid Xolmatov',
            'neighborhood_phone' => '998900000001',
            'prevention_inspector' => 'Sardor Ahmedov',
            'inspector_phone' => '998900000002',
        ]);

        $createResponse = $this->post('/api/tasks', [
            'neighborhood_id' => $neighborhood->id,
            'direction_id' => $direction->id,
            'date' => '2026-03-12',
            'text' => "Hududdagi muammo ro'yxatga olindi.",
            'images' => [
                $this->fakeImage('task-1.jpg'),
                $this->fakeImage('task-2.jpg'),
            ],
        ]);

        $createResponse->assertCreated();

        $taskId = $createResponse->json('data.id');
        $firstImageId = $createResponse->json('data.images.0.id');
        $firstPath = $createResponse->json('data.images.0.path');
        $secondPath = $createResponse->json('data.images.1.path');

        $this->trackPath($firstPath);
        $this->trackPath($secondPath);

        $this->assertFileExists(public_path($firstPath));
        $this->assertFileExists(public_path($secondPath));

        $this->getJson('/api/tasks/'.$taskId)
            ->assertOk()
            ->assertJsonCount(2, 'data.images');

        $updateResponse = $this->post('/api/tasks/'.$taskId, [
            '_method' => 'PUT',
            'text' => 'Yangilangan vazifa matni.',
            'removed_image_ids' => [$firstImageId],
            'images' => [
                $this->fakeImage('task-3.jpg'),
            ],
        ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('data.text', 'Yangilangan vazifa matni.')
            ->assertJsonCount(2, 'data.images');

        $newPath = collect($updateResponse->json('data.images'))
            ->pluck('path')
            ->first(fn (string $path) => $path !== $secondPath);

        $this->trackPath($newPath);

        $this->assertFileDoesNotExist(public_path($firstPath));
        $this->assertFileExists(public_path($secondPath));
        $this->assertFileExists(public_path($newPath));

        $this->deleteJson('/api/tasks/'.$taskId)->assertOk();

        $this->assertDatabaseMissing('tasks', ['id' => $taskId]);
        $this->assertDatabaseCount('task_images', 0);
        $this->assertFileDoesNotExist(public_path($secondPath));
        $this->assertFileDoesNotExist(public_path($newPath));
    }

    public function test_it_manages_task_image_crud(): void
    {
        $direction = Direction::create([
            'name' => 'Nazorat',
        ]);

        $neighborhood = Neighborhood::create([
            'name' => 'Mustaqillik',
            'crime_level' => 'yuqori',
            'lat' => 41.12,
            'long' => 69.12,
            'neighborhood_chairman' => 'Bunyod Karimov',
            'neighborhood_phone' => '998900000010',
            'prevention_inspector' => 'Diyor Qodirov',
            'inspector_phone' => '998900000011',
        ]);

        $task = Task::create([
            'neighborhood_id' => $neighborhood->id,
            'direction_id' => $direction->id,
            'date' => '2026-03-12',
            'text' => 'Task image test.',
        ]);

        $otherTask = Task::create([
            'neighborhood_id' => $neighborhood->id,
            'direction_id' => $direction->id,
            'date' => '2026-03-13',
            'text' => 'Second task.',
        ]);

        $createResponse = $this->post('/api/task-images', [
            'task_id' => $task->id,
            'image' => $this->fakeImage('single-1.jpg'),
        ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.task_id', $task->id);

        $taskImageId = $createResponse->json('data.id');
        $oldPath = $createResponse->json('data.path');

        $this->trackPath($oldPath);

        $this->assertFileExists(public_path($oldPath));

        $this->getJson('/api/task-images/'.$taskImageId)
            ->assertOk()
            ->assertJsonPath('data.id', $taskImageId);

        $updateResponse = $this->post('/api/task-images/'.$taskImageId, [
            '_method' => 'PUT',
            'task_id' => $otherTask->id,
            'image' => $this->fakeImage('single-2.jpg'),
        ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('data.task_id', $otherTask->id);

        $newPath = $updateResponse->json('data.path');

        $this->trackPath($newPath);

        $this->assertFileDoesNotExist(public_path($oldPath));
        $this->assertFileExists(public_path($newPath));

        $this->deleteJson('/api/task-images/'.$taskImageId)->assertOk();

        $this->assertDatabaseMissing('task_images', ['id' => $taskImageId]);
        $this->assertFileDoesNotExist(public_path($newPath));
    }

    public function test_it_rejects_task_images_larger_than_ten_megabytes(): void
    {
        $direction = Direction::create([
            'name' => 'Bandlik',
        ]);

        $neighborhood = Neighborhood::create([
            'name' => 'Bogiston',
            'crime_level' => 'past',
            'lat' => 40.998,
            'long' => 71.6726,
            'neighborhood_chairman' => 'Jamshid Xolmatov',
            'neighborhood_phone' => '998900000001',
            'prevention_inspector' => 'Sardor Ahmedov',
            'inspector_phone' => '998900000002',
        ]);

        $response = $this->withHeaders([
            'Accept' => 'application/json',
        ])->post('/api/tasks', [
            'neighborhood_id' => $neighborhood->id,
            'direction_id' => $direction->id,
            'date' => '2026-03-12',
            'text' => "Hududdagi muammo ro'yxatga olindi.",
            'images' => [
                $this->fakeOversizedImage('too-large.gif'),
            ],
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors('images.0');

        $this->assertSame(
            TaskImageUpload::MAX_FILE_SIZE_MESSAGE,
            $response->json('errors')['images.0'][0]
        );

        $this->assertDatabaseCount('tasks', 0);
        $this->assertDatabaseCount('task_images', 0);
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

    private function fakeOversizedImage(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            str_pad(
                base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='),
                (TaskImageUpload::MAX_FILE_SIZE_KB * 1024) + 1,
                '0'
            )
        );
    }
}
