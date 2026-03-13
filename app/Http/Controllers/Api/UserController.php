<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => User::query()->latest()->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = User::create($this->validatedData($request));

        return response()->json([
            'data' => $user,
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => $user,
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $user->update($this->validatedData($request, $user));

        return response()->json([
            'data' => $user->fresh(),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }

    private function validatedData(Request $request, ?User $user = null): array
    {
        $required = $user ? 'sometimes' : 'required';
        $passwordRules = $user
            ? ['sometimes', 'required', 'string', 'min:6']
            : ['required', 'string', 'min:6'];

        return $request->validate([
            'name' => [$required, 'string', 'max:255'],
            'last_name' => [$required, 'string', 'max:255'],
            'phone' => [
                $required,
                'string',
                'max:255',
                Rule::unique('users', 'phone')->ignore($user),
            ],
            'role' => [$required, 'string', 'max:255'],
            'password' => $passwordRules,
        ]);
    }
}
