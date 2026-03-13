<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Neighborhood extends Model
{
    protected $fillable = [
        'name',
        'crime_level',
        'lat',
        'long',
        'neighborhood_chairman',
        'neighborhood_phone',
        'prevention_inspector',
        'inspector_phone',
    ];

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
