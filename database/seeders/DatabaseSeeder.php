<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        \App\Models\User::create([
            'name' => 'Admin User',
            'email' => 'admin@assetflow.com',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        \App\Models\Tenant::create([
            'name' => 'Acme Corp',
            'domain' => 'acme.com',
            'status' => 'active',
            'description' => 'Global headquarters',
            'usersCount' => 120,
            'assetsCount' => 450,
        ]);

        \App\Models\Tenant::create([
            'name' => 'Stark Industries',
            'domain' => 'stark.com',
            'status' => 'active',
            'description' => 'Research & Development',
            'usersCount' => 85,
            'assetsCount' => 1200,
        ]);
    }
}
