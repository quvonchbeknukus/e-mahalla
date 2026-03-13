<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Neighborhood;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NeighborhoodController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Neighborhood::query()->latest()->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $neighborhood = Neighborhood::create($this->validatedData($request));

        return response()->json([
            'data' => $neighborhood,
        ], 201);
    }

    public function show(Neighborhood $neighborhood): JsonResponse
    {
        return response()->json([
            'data' => $neighborhood,
        ]);
    }

    public function update(Request $request, Neighborhood $neighborhood): JsonResponse
    {
        $neighborhood->update($this->validatedData($request, true));

        return response()->json([
            'data' => $neighborhood->fresh(),
        ]);
    }

    public function destroy(Neighborhood $neighborhood): JsonResponse
    {
        $neighborhood->delete();

        return response()->json([
            'message' => 'Neighborhood deleted successfully.',
        ]);
    }

    private function validatedData(Request $request, bool $isUpdate = false): array
    {
        $required = $isUpdate ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:100'],
            'crime_level' => [$required, 'string', Rule::in(['yuqori', "o'rta", 'past', 'bosh'])],
            'lat' => [$required, 'numeric'],
            'long' => [$required, 'numeric'],
            'neighborhood_chairman' => [$required, 'string', 'max:100'],
            'neighborhood_phone' => [$required, 'string', 'max:100'],
            'prevention_inspector' => [$required, 'string', 'max:100'],
            'inspector_phone' => [$required, 'string', 'max:100'],
        ]);
    }
}
