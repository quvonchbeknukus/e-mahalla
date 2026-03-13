<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskImage extends Model
{
    protected $fillable = [
        'task_id',
        'path',
    ];

    protected $appends = [
        'image_url',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function getImageUrlAttribute(): string
    {
        return asset($this->path);
    }
}
