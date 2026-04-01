<?php

namespace App\Http\Controllers;

use App\Models\EmailSettings;
use App\Services\EmailModeService;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class EmailSettingsController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();
        $settings = EmailSettings::getForTenant($tenantId);

        return response()->json([
            'email_mode' => $settings->email_mode,
            'test_recipient_email' => $settings->test_recipient_email,
        ]);
    }

    public function update(Request $request)
    {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        $validated = $request->validate([
            'email_mode' => ['required', Rule::in(['test', 'live'])],
            'test_recipient_email' => [
                'nullable',
                'email',
                function ($attribute, $value, $fail) use ($request) {
                    if ($request->email_mode === 'test' && !$value) {
                        $fail('The test recipient email is required when email mode is test.');
                    }
                },
            ],
        ]);

        EmailSettings::updateForTenant($validated, $tenantId);

        Log::info('Email settings updated', [
            'tenant_id' => $tenantId,
            'email_mode' => $validated['email_mode'],
        ]);

        return response()->json([
            'message' => 'Email settings updated successfully',
            'email_mode' => $validated['email_mode'],
            'test_recipient_email' => $validated['test_recipient_email'] ?? null,
        ]);
    }

    public function test(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        MailService::configureMailer($tenantId);

        try {
            $settings = EmailSettings::getForTenant($tenantId);
            $testEmail = $settings->isTestMode() ? $settings->test_recipient_email : $request->email;

            Mail::raw(
                'This is a test email from AssetFlow to verify email settings. '
                . ($settings->isTestMode() ? '[TEST MODE - Email redirected to test recipient]' : '[LIVE MODE]'),
                function ($message) use ($testEmail, $settings) {
                    $message->to($testEmail)->subject('AssetFlow Email Settings Test');

                    if ($settings->isTestMode()) {
                        EmailModeService::processMail($message);
                    }
                }
            );

            Log::info('Test email sent', [
                'recipient' => $testEmail,
                'mode' => $settings->email_mode,
                'tenant_id' => $tenantId,
            ]);

            return response()->json([
                'message' => 'Test email sent successfully',
                'recipient' => $testEmail,
                'mode' => $settings->email_mode,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send test email: ' . $e->getMessage(), [
                'tenant_id' => $tenantId,
            ]);

            return response()->json([
                'message' => 'Failed to send test email: ' . $e->getMessage(),
            ], 500);
        }
    }
}
