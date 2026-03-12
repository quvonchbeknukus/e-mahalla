<?php

namespace App\Models;
use App\Models\TaskImage;
use App\Models\Direction;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    














    public function images()
    {
        return $this->hasMany(TaskImage::class);
    }
    public function directions()
    {
        return $this->hasMany(Direction::class);
    }
}
