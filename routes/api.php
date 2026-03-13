<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DirectionController;
use App\Http\Controllers\Api\NeighborhoodController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskImageController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::apiResources([
    'users' => UserController::class,
    'directions' => DirectionController::class,
    'neighborhoods' => NeighborhoodController::class,
    'tasks' => TaskController::class,
    'task-images' => TaskImageController::class,
]);
