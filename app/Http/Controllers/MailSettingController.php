<?php

namespace App\Http\Controllers;

use App\Models\MailSetting;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailSettingController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        
        return response()->json(MailSetting::getForTenant($tenantId));
    }

    public function update(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        $settings = $request->all();

        MailSetting::updateForTenant($settings, $tenantId);

        return response()->json(['message' => 'Settings updated successfully']);
    }

    public function test(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        MailService::configureMailer($tenantId);

        try {
            Mail::raw('This is a test email from AssetFlow to verify SMTP settings.', function ($message) use ($request) {
                $message->to($request->email)
                    ->subject('AssetFlow SMTP Test');
            });

            return response()->json(['message' => 'Test email sent successfully']);
        } catch (\Exception $e) {
            Log::error('Failed to send test email: '.$e->getMessage());

            return response()->json(['message' => 'Failed to send test email: '.$e->getMessage()], 500);
        }
    }
}
