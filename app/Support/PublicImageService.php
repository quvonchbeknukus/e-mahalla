<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class PublicImageService
{
    public function store(UploadedFile $file): string
    {
        $directory = public_path('images');

        File::ensureDirectoryExists($directory);

        $extension = $file->getClientOriginalExtension() ?: $file->extension() ?: 'bin';
        $filename = Str::uuid()->toString().'.'.$extension;

        $file->move($directory, $filename);

        return 'images/'.$filename;
    }

    public function delete(?string $path): void
    {
        if (! $path) {
            return;
        }

        $fullPath = public_path(ltrim($path, '/\\'));

        if (File::exists($fullPath)) {
            File::delete($fullPath);
        }
    }
}
