<?php

namespace App\Http\Controllers;

use App\Models\MailSetting;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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

        MailService::configureMailer();

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
