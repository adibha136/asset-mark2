<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $menus = ['dashboard', 'assets', 'tenants', 'users', 'checklists', 'settings'];

        $roles = [
            [
                'name' => 'Admin',
                'slug' => 'admin',
                'description' => 'Full access to all modules',
                'permissions' => [
                    'dashboard' => [true, true, true, true],
                    'assets' => [true, true, true, true],
                    'tenants' => [true, true, true, true],
                    'users' => [true, true, true, true],
                    'checklists' => [true, true, true, true],
                    'settings' => [true, true, true, true],
                ],
            ],
            [
                'name' => 'Manager',
                'slug' => 'manager',
                'description' => 'Can manage assets and users but not settings',
                'permissions' => [
                    'dashboard' => [true, false, false, false],
                    'assets' => [true, true, true, false],
                    'tenants' => [true, false, false, false],
                    'users' => [true, true, true, false],
                    'checklists' => [true, true, true, true],
                    'settings' => [false, false, false, false],
                ],
            ],
            [
                'name' => 'User',
                'slug' => 'user',
                'description' => 'Regular user with limited access',
                'permissions' => [
                    'dashboard' => [true, false, false, false],
                    'assets' => [true, false, false, false],
                    'tenants' => [false, false, false, false],
                    'users' => [false, false, false, false],
                    'checklists' => [true, false, false, false],
                    'settings' => [false, false, false, false],
                ],
            ],
            [
                'name' => 'Viewer',
                'slug' => 'viewer',
                'description' => 'Read-only access',
                'permissions' => [
                    'dashboard' => [true, false, false, false],
                    'assets' => [true, false, false, false],
                    'tenants' => [true, false, false, false],
                    'users' => [true, false, false, false],
                    'checklists' => [true, false, false, false],
                    'settings' => [false, false, false, false],
                ],
            ],
        ];

        foreach ($roles as $roleData) {
            $role = Role::create([
                'name' => $roleData['name'],
                'slug' => $roleData['slug'],
                'description' => $roleData['description'],
            ]);

            foreach ($roleData['permissions'] as $menu => $actions) {
                RolePermission::create([
                    'role_id' => $role->id,
                    'menu' => $menu,
                    'can_view' => $actions[0],
                    'can_add' => $actions[1],
                    'can_edit' => $actions[2],
                    'can_delete' => $actions[3],
                ]);
            }
        }
    }
}
