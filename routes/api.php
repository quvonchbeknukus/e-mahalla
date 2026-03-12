<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;

Route::post("/login",[AuthController::class, "login"]);


Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return response()->json($request->user());
});