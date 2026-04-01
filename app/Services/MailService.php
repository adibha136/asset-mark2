<?php

namespace App\Services;

use App\Models\MailSetting;
use App\Models\NextelecomSetting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailService
{
    /**
     * Configure the Laravel mailer with settings from the database.
     * First checks NextElecom settings, then falls back to MailSetting.
     *
     * @return bool True if SMTP was configured, false otherwise.
     */
    public static function configureMailer($tenantId = null)
    {
        if (!$tenantId) {
            $tenantId = app('tenant.id') ?? null;
        }

        $host = null;
        $port = 587;
        $username = null;
        $password = null;
        $encryption = 'tls';
        $fromAddress = null;
        $fromName = null;

        // First, try to get settings from NextElecom configuration
        if ($tenantId) {
            $nextelecomEmail = NextelecomSetting::getSetting('email', null, $tenantId);
            
            Log::info('MailService: NextElecom email setting check', [
                'tenantId' => $tenantId,
                'settings' => $nextelecomEmail,
            ]);
            
            if ($nextelecomEmail && isset($nextelecomEmail['enabled']) && $nextelecomEmail['enabled']) {
                $host = $nextelecomEmail['host'] ?? null;
                $port = $nextelecomEmail['port'] ?? 587;
                $username = $nextelecomEmail['username'] ?? null;
                $password = $nextelecomEmail['password'] ?? null;
                $fromAddress = $nextelecomEmail['address'] ?? null;
                $fromName = 'Smart Tech';

                Log::info('MailService: Using NextElecom email settings', [
                    'host' => $host,
                    'port' => $port,
                    'username' => $username,
                    'from' => $fromAddress,
                    'tenantId' => $tenantId,
                ]);
            }
        }

        // Fall back to MailSetting (System Settings) if NextElecom not configured
        if (!$host) {
            $settings = MailSetting::all()->pluck('value', 'key');
            $host = $settings->get('mail_host');
            
            if (!$host) {
                Log::info('MailService: No SMTP configuration found in NextElecom or MailSetting, using default mailer.');
                return false;
            }

            $port = $settings->get('mail_port', 587);
            $username = $settings->get('mail_username');
            $password = $settings->get('mail_password');
            $encryption = $settings->get('mail_encryption', 'tls');
            $fromAddress = $settings->get('mail_from_address', config('mail.from.address'));
            $fromName = $settings->get('mail_from_name', config('mail.from.name'));

            Log::debug('MailService: Using MailSetting configuration', [
                'host' => $host,
                'from' => $fromAddress,
            ]);
        }

        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.host', $host);
        Config::set('mail.mailers.smtp.port', $port);
        Config::set('mail.mailers.smtp.username', $username);
        Config::set('mail.mailers.smtp.password', $password);
        Config::set('mail.from.address', $fromAddress);
        Config::set('mail.from.name', $fromName);

        if ($encryption === 'tls') {
            Config::set('mail.mailers.smtp.scheme', 'smtp');
            Config::set('mail.mailers.smtp.encryption', 'tls');
        } elseif ($encryption === 'ssl') {
            Config::set('mail.mailers.smtp.scheme', 'smtps');
            Config::set('mail.mailers.smtp.encryption', 'ssl');
        } else {
            Config::set('mail.mailers.smtp.scheme', 'smtp');
            Config::set('mail.mailers.smtp.encryption', null);
        }

        Mail::purge();

        Log::debug('MailService: SMTP mailer configured', [
            'host' => $host,
            'port' => $port,
            'username' => $username,
            'encryption' => $encryption,
            'from' => $fromAddress,
        ]);

        return true;
    }
}
