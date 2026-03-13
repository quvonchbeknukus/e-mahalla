<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Neighborhood;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NeighborhoodController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Neighborhood::query()
                ->withCount([
                    'tasks as total_tasks_count',
                    'tasks as today_tasks_count' => fn ($query) => $query->whereDate('date', Carbon::today()),
                ])
                ->latest()
                ->get(),
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
            'data' => $this->detailedNeighborhood($neighborhood),
        ]);
    }

    public function update(Request $request, Neighborhood $neighborhood): JsonResponse
    {
        $neighborhood->update($this->validatedData($request, true));

        return response()->json([
            'data' => $this->detailedNeighborhood($neighborhood->fresh()),
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
            'crime_level' => [$required, 'string', Rule::in(['qizil', 'sariq', 'yashil', 'yuqori', "o'rta", 'past', 'bosh'])],
            'lat' => [$required, 'numeric'],
            'long' => [$required, 'numeric'],
            'neighborhood_chairman' => [$required, 'string', 'max:100'],
            'neighborhood_phone' => [$required, 'string', 'max:100'],
            'prevention_inspector' => [$required, 'string', 'max:100'],
            'inspector_phone' => [$required, 'string', 'max:100'],
        ]);
    }

    private function detailedNeighborhood(Neighborhood $neighborhood): Neighborhood
    {
        return $neighborhood
            ->loadCount([
                'tasks as total_tasks_count',
                'tasks as today_tasks_count' => fn ($query) => $query->whereDate('date', Carbon::today()),
            ])
            ->load([
                'tasks' => fn ($query) => $query
                    ->with(['direction', 'images'])
                    ->latest('date')
                    ->latest('id'),
            ]);
    }
}
