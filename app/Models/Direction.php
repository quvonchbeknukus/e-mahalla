<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Task;

class Direction extends Model
{
    
protected $table = "Direction"












public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
}
