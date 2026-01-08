<?php

namespace App\Http\Controllers;

use App\Models\MailSetting;
use Illuminate\Http\Request;

class MailSettingController extends Controller
{
    public function index()
    {
        return response()->json(MailSetting::all()->pluck('value', 'key'));
    }

    public function update(Request $request)
    {
        $settings = $request->all();

        foreach ($settings as $key => $value) {
            MailSetting::updateOrCreate(
                ['key' => $key],
                ['value' => (string) $value]
            );
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }

    public function test(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $this->configureMailer();

        try {
            \Illuminate\Support\Facades\Mail::raw('This is a test email from AssetFlow to verify SMTP settings.', function ($message) use ($request) {
                $message->to($request->email)
                    ->subject('AssetFlow SMTP Test');
            });

            return response()->json(['message' => 'Test email sent successfully']);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send test email: '.$e->getMessage());

            return response()->json(['message' => 'Failed to send test email: '.$e->getMessage()], 500);
        }
    }

    private function configureMailer()
    {
        $settings = MailSetting::all()->pluck('value', 'key');

        $encryption = $settings->get('mail_encryption');

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $settings->get('mail_host'),
            'mail.mailers.smtp.port' => $settings->get('mail_port'),
            'mail.mailers.smtp.username' => $settings->get('mail_username'),
            'mail.mailers.smtp.password' => $settings->get('mail_password'),
            'mail.mailers.smtp.encryption' => $encryption === 'none' ? null : $encryption,
            'mail.from.address' => $settings->get('mail_from_address'),
            'mail.from.name' => $settings->get('mail_from_name'),
        ]);

        if ($encryption === 'tls') {
            config([
                'mail.mailers.smtp.scheme' => 'smtp',
                'mail.mailers.smtp.encryption' => 'tls',
            ]);
        } elseif ($encryption === 'ssl') {
            config([
                'mail.mailers.smtp.scheme' => 'smtps',
                'mail.mailers.smtp.encryption' => 'ssl',
            ]);
        } else {
            config([
                'mail.mailers.smtp.scheme' => 'smtp',
                'mail.mailers.smtp.encryption' => null,
            ]);
        }

        // Reset the mailer to apply changes
        \Illuminate\Support\Facades\Mail::purge();
    }
}
