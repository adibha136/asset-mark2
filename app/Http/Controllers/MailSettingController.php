<?php

namespace App\Http\Controllers;

use App\Models\MailSetting;
use App\Models\Tenant;
use App\Services\EmailModeService;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailSettingController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

        return response()->json(MailSetting::getForTenant($tenantId));
    }

    public function update(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

        $settings = $request->all();

        MailSetting::updateForTenant($settings, $tenantId);

        return response()->json(['message' => 'Settings updated successfully']);
    }

    public function test(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

        $smtpConfigured = MailService::configureMailer($tenantId);

        if (! $smtpConfigured) {
            Log::error('Cannot send test email - SMTP not configured', [
                'tenant_id' => $tenantId,
            ]);

            return response()->json([
                'message' => 'Failed to send test email: SMTP configuration not found. Please configure email settings in NextElecom or Mail Settings first.',
            ], 422);
        }

        try {
            $recipientEmail = EmailModeService::getRecipients($request->email, $tenantId);

            if (! $recipientEmail) {
                Log::error('Cannot send test email - no email configured for test mode', [
                    'tenant_id' => $tenantId,
                ]);

                return response()->json([
                    'message' => 'Failed to send test email: No email configured for test mode',
                ], 422);
            }

            Mail::raw('This is a test email from AssetFlow to verify SMTP settings.', function ($message) use ($recipientEmail, $tenantId) {
                $message->to($recipientEmail)
                    ->subject('AssetFlow SMTP Test');

                EmailModeService::processMail($message, $tenantId);
            });

            Log::info('Test email sent successfully', [
                'recipient' => $recipientEmail,
                'original_recipient' => $request->email,
                'tenant_id' => $tenantId,
            ]);

            return response()->json(['message' => 'Test email sent successfully']);
        } catch (\Exception $e) {
            Log::error('Failed to send test email: '.$e->getMessage());

            return response()->json(['message' => 'Failed to send test email: '.$e->getMessage()], 500);
        }
    }
}
