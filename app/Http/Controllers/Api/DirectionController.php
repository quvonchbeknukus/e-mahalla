<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Direction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DirectionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Direction::query()->latest()->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $direction = Direction::create($validated);

        return response()->json([
            'data' => $direction,
        ], 201);
    }

    public function show(Direction $direction): JsonResponse
    {
        return response()->json([
            'data' => $direction,
        ]);
    }

    public function update(Request $request, Direction $direction): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
        ]);

        $direction->update($validated);

        return response()->json([
            'data' => $direction->fresh(),
        ]);
    }

    public function destroy(Direction $direction): JsonResponse
    {
        $direction->delete();

        return response()->json([
            'message' => 'Direction deleted successfully.',
        ]);
    }
}
