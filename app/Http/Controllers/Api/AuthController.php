<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
{
    $request->validate([
        'phone' => 'required',
        'password' => 'required',
    ]);

    $user = User::where('phone', $request->phone)->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'message' => 'Telefon yoki parol noto‘g‘ri'
        ], 401);
    }

    $token = $user->createToken('token')->plainTextToken;

    return response()->json([
        'user' => $user,
        'token' => $token
    ]);
}
    

}
