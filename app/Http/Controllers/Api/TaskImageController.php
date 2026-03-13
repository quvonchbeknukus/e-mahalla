<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskImage;
use App\Support\PublicImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TaskImageController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => TaskImage::query()->with('task')->latest()->get(),
        ]);
    }

    public function store(Request $request, PublicImageService $imageService): JsonResponse
    {
        $validated = $this->validatedData($request);

        $taskImage = TaskImage::create([
            'task_id' => $validated['task_id'],
            'path' => $imageService->store($request->file('image')),
        ])->load('task');

        return response()->json([
            'data' => $taskImage,
        ], 201);
    }

    public function show(TaskImage $taskImage): JsonResponse
    {
        return response()->json([
            'data' => $taskImage->load('task'),
        ]);
    }

    public function update(Request $request, TaskImage $taskImage, PublicImageService $imageService): JsonResponse
    {
        $validated = $this->validatedData($request, true);

        if (array_key_exists('task_id', $validated)) {
            $taskImage->task_id = $validated['task_id'];
        }

        if ($request->hasFile('image')) {
            $oldPath = $taskImage->path;
            $taskImage->path = $imageService->store($request->file('image'));
            $taskImage->save();
            $imageService->delete($oldPath);
        } else {
            $taskImage->save();
        }

        return response()->json([
            'data' => $taskImage->fresh()->load('task'),
        ]);
    }

    public function destroy(TaskImage $taskImage, PublicImageService $imageService): JsonResponse
    {
        $imageService->delete($taskImage->path);
        $taskImage->delete();

        return response()->json([
            'message' => 'Task image deleted successfully.',
        ]);
    }

    private function validatedData(Request $request, bool $isUpdate = false): array
    {
        $required = $isUpdate ? 'sometimes' : 'required';

        return $request->validate([
            'task_id' => [$required, 'integer', Rule::exists('tasks', 'id')],
            'image' => [$required, 'image', 'max:5120'],
        ]);
    }
}
