<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Support\PublicImageService;
use App\Support\TaskImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Task::query()
                ->with($this->relations())
                ->latest()
                ->get(),
        ]);
    }

    public function store(Request $request, PublicImageService $imageService): JsonResponse
    {
        if ($request->has('tasks')) {
            $validated = $this->validatedBulkData($request);

            $tasks = DB::transaction(function () use ($validated, $request, $imageService) {
                return collect($validated['tasks'])
                    ->values()
                    ->map(function (array $taskData, int $index) use ($request, $imageService) {
                        $task = Task::create(Arr::except($taskData, ['images']));

                        foreach ($request->file("tasks.$index.images", []) as $image) {
                            $task->images()->create([
                                'path' => $imageService->store($image),
                            ]);
                        }

                        return $task->load($this->relations());
                    })
                    ->all();
            });

            return response()->json([
                'data' => $tasks,
            ], 201);
        }

        $validated = $this->validatedData($request);

        $task = DB::transaction(function () use ($validated, $request, $imageService) {
            $task = Task::create(Arr::except($validated, ['images', 'removed_image_ids']));

            foreach ($request->file('images', []) as $image) {
                $task->images()->create([
                    'path' => $imageService->store($image),
                ]);
            }

            return $task->load($this->relations());
        });

        return response()->json([
            'data' => $task,
        ], 201);
    }

    public function show(Task $task): JsonResponse
    {
        return response()->json([
            'data' => $task->load($this->relations()),
        ]);
    }

    public function update(Request $request, Task $task, PublicImageService $imageService): JsonResponse
    {
        $validated = $this->validatedData($request, true);

        $task = DB::transaction(function () use ($validated, $request, $task, $imageService) {
            $task->update(Arr::except($validated, ['images', 'removed_image_ids']));

            $removedImageIds = $validated['removed_image_ids'] ?? [];

            if ($removedImageIds !== []) {
                $images = $task->images()->whereIn('id', $removedImageIds)->get();

                foreach ($images as $image) {
                    $imageService->delete($image->path);
                    $image->delete();
                }
            }

            foreach ($request->file('images', []) as $image) {
                $task->images()->create([
                    'path' => $imageService->store($image),
                ]);
            }

            return $task->load($this->relations());
        });

        return response()->json([
            'data' => $task,
        ]);
    }

    public function destroy(Task $task, PublicImageService $imageService): JsonResponse
    {
        DB::transaction(function () use ($task, $imageService) {
            $task->load('images');

            foreach ($task->images as $image) {
                $imageService->delete($image->path);
            }

            $task->delete();
        });

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
    }

    private function validatedData(Request $request, bool $isUpdate = false): array
    {
        $required = $isUpdate ? 'sometimes' : 'required';

        return $request->validate([
            'neighborhood_id' => [$required, 'integer', Rule::exists('neighborhoods', 'id')],
            'direction_id' => [$required, 'integer', Rule::exists('directions', 'id')],
            'date' => [$required, 'date'],
            'text' => [$required, 'string'],
            'images' => ['sometimes', 'array', 'max:4'],
            'images.*' => ['image', 'max:'.TaskImageUpload::MAX_FILE_SIZE_KB],
            'removed_image_ids' => ['sometimes', 'array'],
            'removed_image_ids.*' => ['integer', Rule::exists('task_images', 'id')],
        ], $this->validationMessages());
    }

    private function validatedBulkData(Request $request): array
    {
        return $request->validate([
            'tasks' => ['required', 'array', 'min:1'],
            'tasks.*.neighborhood_id' => ['required', 'integer', Rule::exists('neighborhoods', 'id')],
            'tasks.*.direction_id' => ['required', 'integer', Rule::exists('directions', 'id')],
            'tasks.*.date' => ['required', 'date'],
            'tasks.*.text' => ['required', 'string'],
            'tasks.*.images' => ['sometimes', 'array', 'max:4'],
            'tasks.*.images.*' => ['image', 'max:'.TaskImageUpload::MAX_FILE_SIZE_KB],
        ], $this->validationMessages());
    }

    private function validationMessages(): array
    {
        return [
            'images.*.max' => TaskImageUpload::MAX_FILE_SIZE_MESSAGE,
            'tasks.*.images.*.max' => TaskImageUpload::MAX_FILE_SIZE_MESSAGE,
        ];
    }

    private function relations(): array
    {
        return ['neighborhood', 'direction', 'images'];
    }
}
