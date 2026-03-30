<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $request->query('tenant_id') 
            ?? $request->route('tenant_id')
            ?? session('tenant_id');

        if ($tenantId) {
            app('tenant.manager')->setTenant($tenantId);
        }

        return $next($request);
    }
}
