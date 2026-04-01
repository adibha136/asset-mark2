<?php

namespace App\Services;

use App\Models\EmailSettings;
use Illuminate\Support\Facades\Log;

class EmailModeService
{
    public static function getRecipients($originalRecipients, $tenantId = null)
    {
        $settings = EmailSettings::getForTenant($tenantId);

        if (!$settings) {
            return $originalRecipients;
        }

        if ($settings->isTestMode()) {
            if (!$settings->test_recipient_email) {
                Log::warning('Email mode is set to test but no test recipient email configured', [
                    'tenant_id' => $tenantId,
                ]);
                return null;
            }

            Log::info('Email redirected to test recipient', [
                'original_recipients' => $originalRecipients,
                'test_recipient' => $settings->test_recipient_email,
                'tenant_id' => $tenantId,
                'mode' => 'test',
            ]);

            return $settings->test_recipient_email;
        }

        Log::debug('Email sent to live recipients', [
            'recipients' => $originalRecipients,
            'tenant_id' => $tenantId,
            'mode' => 'live',
        ]);

        return $originalRecipients;
    }

    public static function processMail(&$message, $tenantId = null)
    {
        $settings = EmailSettings::getForTenant($tenantId);

        if (!$settings || !$settings->isTestMode()) {
            return;
        }

        if (!$settings->test_recipient_email) {
            Log::warning('Email mode is set to test but no test recipient email configured', [
                'tenant_id' => $tenantId,
            ]);
            return;
        }

        $originalTo = $message->getTo();
        $originalCc = $message->getCc();
        $originalBcc = $message->getBcc();

        Log::info('Email recipients redirected to test mode', [
            'original_to' => $originalTo,
            'original_cc' => $originalCc,
            'original_bcc' => $originalBcc,
            'test_recipient' => $settings->test_recipient_email,
            'tenant_id' => $tenantId,
        ]);

        $message->to($settings->test_recipient_email);
        $message->cc([]);
        $message->bcc([]);
    }

    public static function validateTestRecipient($email)
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}
