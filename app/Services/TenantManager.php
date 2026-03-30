<?php

namespace App\Services;

use App\Models\Tenant;

class TenantManager
{
    protected $currentTenant = null;
    protected $currentTenantId = null;

    public function setTenant($tenant)
    {
        if (is_string($tenant)) {
            $this->currentTenantId = $tenant;
            $this->currentTenant = Tenant::find($tenant);
        } else {
            $this->currentTenant = $tenant;
            $this->currentTenantId = $tenant?->id;
        }

        return $this;
    }

    public function getTenant()
    {
        return $this->currentTenant;
    }

    public function getTenantId()
    {
        return $this->currentTenantId;
    }

    public function isSet()
    {
        return $this->currentTenantId !== null;
    }

    public function check()
    {
        if (!$this->isSet()) {
            throw new \Exception('No tenant has been set in the current context.');
        }

        return $this;
    }

    public function reset()
    {
        $this->currentTenant = null;
        $this->currentTenantId = null;

        return $this;
    }
}
