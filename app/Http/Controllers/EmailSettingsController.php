<?php

namespace App\Http\Controllers;

use App\Models\EmailSettings;
use App\Models\Tenant;
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

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
            }
        }

        $settings = EmailSettings::getForTenant($tenantId);

        return response()->json([
            'email_mode' => $settings->email_mode,
            'test_recipient_email' => $settings->test_recipient_email,
        ]);
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

        $validated = $request->validate([
            'email_mode' => ['required', Rule::in(['test', 'live'])],
            'test_recipient_email' => [
                'nullable',
                'email',
                function ($attribute, $value, $fail) use ($request) {
                    if ($request->email_mode === 'test' && ! $value) {
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

        // Fallback to first tenant if no tenant_id provided
        if (! $tenantId) {
            $firstTenant = Tenant::first();
            if ($firstTenant) {
                $tenantId = $firstTenant->id;
                Log::info('Using fallback tenant', [
                    'tenant_id' => $tenantId,
                ]);
            }
        }

        Log::info('Test email request', [
            'tenant_id' => $tenantId,
            'request_email' => $request->email,
        ]);

        $smtpConfigured = MailService::configureMailer($tenantId);

        Log::info('MailService::configureMailer result', [
            'tenant_id' => $tenantId,
            'smtp_configured' => $smtpConfigured,
        ]);

        if (! $smtpConfigured) {
            Log::error('Cannot send test email - SMTP not configured', [
                'tenant_id' => $tenantId,
            ]);

            return response()->json([
                'message' => 'Failed to send test email: SMTP configuration not found. Please configure email settings in NextElecom or Mail Settings first.',
                'tenant_id' => $tenantId,
            ], 422);
        }

        try {
            $settings = EmailSettings::getForTenant($tenantId);
            $originalEmail = $request->email;
            $recipientEmail = EmailModeService::getRecipients($originalEmail, $tenantId);

            if (! $recipientEmail) {
                Log::error('Cannot send test email - no email configured for test mode', [
                    'tenant_id' => $tenantId,
                ]);

                return response()->json([
                    'message' => 'Failed to send test email: No email configured for test mode',
                ], 422);
            }

            Mail::raw(
                'This is a test email from AssetFlow to verify email settings. '
                .($settings->isTestMode() ? '[TEST MODE - Email redirected to test recipient]' : '[LIVE MODE]'),
                function ($message) use ($recipientEmail, $tenantId) {
                    $message->to($recipientEmail)->subject('AssetFlow Email Settings Test');

                    EmailModeService::processMail($message, $tenantId);
                }
            );

            Log::info('Test email sent', [
                'recipient' => $recipientEmail,
                'original_recipient' => $originalEmail,
                'mode' => $settings->email_mode,
                'tenant_id' => $tenantId,
            ]);

            return response()->json([
                'message' => 'Test email sent successfully',
                'recipient' => $recipientEmail,
                'mode' => $settings->email_mode,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send test email: '.$e->getMessage(), [
                'tenant_id' => $tenantId,
            ]);

            return response()->json([
                'message' => 'Failed to send test email: '.$e->getMessage(),
            ], 500);
        }
    }
}
