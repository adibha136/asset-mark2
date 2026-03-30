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
        \App\Models\User::updateOrCreate(
            ['email' => 'admin@assetflow.com'],
            [
                'name' => 'Admin User',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        \App\Models\Tenant::updateOrCreate(
            ['domain' => 'acme.com'],
            [
                'name' => 'Acme Corp',
                'status' => 'active',
                'description' => 'Global headquarters',
                'usersCount' => 120,
                'assetsCount' => 450,
            ]
        );

        \App\Models\Tenant::updateOrCreate(
            ['domain' => 'stark.com'],
            [
                'name' => 'Stark Industries',
                'status' => 'active',
                'description' => 'Research & Development',
                'usersCount' => 85,
                'assetsCount' => 1200,
            ]
        );
    }
}
