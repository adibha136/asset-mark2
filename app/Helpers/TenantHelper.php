<?php

namespace App\Helpers;

use App\Models\NextelecomSetting;
use App\Models\MailSetting;

class TenantHelper
{
    public static function setTenant($tenantId)
    {
        app('tenant.manager')->setTenant($tenantId);
        return new static();
    }

    public static function getTenantId()
    {
        return app('tenant.manager')->getTenantId();
    }

    public static function getCurrentTenant()
    {
        return app('tenant.manager')->getTenant();
    }

    public static function getNextelecomSetting($type, $default = null)
    {
        return NextelecomSetting::getSetting($type, $default);
    }

    public static function updateNextelecomSetting($type, $data)
    {
        return NextelecomSetting::updateSetting($type, $data);
    }

    public static function getMailSettings()
    {
        return MailSetting::getForTenant();
    }

    public static function updateMailSettings($settings)
    {
        return MailSetting::updateForTenant($settings);
    }

    public static function tenantMissing()
    {
        return app('tenant.manager')->getTenantId() === null;
    }
}
