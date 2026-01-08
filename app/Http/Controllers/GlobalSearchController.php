<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\DirectoryUser;
use App\Models\Tenant;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    public function search(Request $request)
    {
        $query = $request->get('query');

        if (empty($query)) {
            return response()->json([
                'assets' => [],
                'tenants' => [],
                'users' => [],
            ]);
        }

        $assets = Asset::where('name', 'like', "%{$query}%")
            ->orWhere('serial_number', 'like', "%{$query}%")
            ->orWhere('type', 'like', "%{$query}%")
            ->limit(5)
            ->get();

        $tenants = Tenant::where('name', 'like', "%{$query}%")
            ->orWhere('domain', 'like', "%{$query}%")
            ->limit(5)
            ->get();

        $users = DirectoryUser::where('name', 'like', "%{$query}%")
            ->orWhere('email', 'like', "%{$query}%")
            ->orWhere('department', 'like', "%{$query}%")
            ->orWhere('job_title', 'like', "%{$query}%")
            ->limit(5)
            ->get();

        return response()->json([
            'assets' => $assets,
            'tenants' => $tenants,
            'users' => $users,
        ]);
    }
}
