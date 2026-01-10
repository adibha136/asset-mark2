<?php

namespace App\Services;

use App\Mail\UserCredentialsMail;
use App\Models\MailSetting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    public static function sendUserCredentialsNotification($user, $password)
    {
        Log::info('Attempting to send credentials email to: '.$user->email);

        MailService::configureMailer();

        try {
            Mail::to($user->email)->send(new UserCredentialsMail($user, $password));
            Log::info('Credentials email sent successfully to: '.$user->email);
        } catch (\Exception $e) {
            Log::error('Failed to send user credentials email: '.$e->getMessage());
        }
    }

    public static function sendAssetAssignedNotification($user, $asset)
    {
        $settings = MailSetting::all()->pluck('value', 'key');

        if (($settings->get('trigger_asset_assigned') ?? '0') !== '1') {
            return;
        }

        MailService::configureMailer();

        $toEmail = $settings->get('notification_email');
        if (! $toEmail) {
            Log::warning('No notification email set in settings');

            return;
        }

        try {
            Mail::raw("Asset '{$asset->name}' (Serial: {$asset->serial_number}) has been assigned to user '{$user->name}' ({$user->email}).", function ($message) use ($toEmail) {
                $message->to($toEmail)
                    ->subject('Asset Assigned Notification');
            });
        } catch (\Exception $e) {
            Log::error('Failed to send asset assigned notification: '.$e->getMessage());
        }
    }

    public static function sendWarrantyExpiryNotification($assets)
    {
        $settings = MailSetting::all()->pluck('value', 'key');

        if (($settings->get('trigger_warranty_expiry') ?? '0') !== '1') {
            return;
        }

        MailService::configureMailer();

        $toEmail = $settings->get('notification_email');
        if (! $toEmail) {
            return;
        }

        $content = "The following assets have warranties expiring soon or already expired:\n\n";
        foreach ($assets as $asset) {
            $content .= "- {$asset->name} (Serial: {$asset->serial_number}) - Expiry: {$asset->warranty_expiry}\n";
        }

        try {
            Mail::raw($content, function ($message) use ($toEmail) {
                $message->to($toEmail)
                    ->subject('Asset Warranty Expiry Alert');
            });
        } catch (\Exception $e) {
            Log::error('Failed to send warranty expiry notification: '.$e->getMessage());
        }
    }

    public static function sendUserInactiveNotification($users)
    {
        $settings = MailSetting::all()->pluck('value', 'key');

        if (($settings->get('trigger_user_inactive') ?? '0') !== '1') {
            return;
        }

        MailService::configureMailer();

        $toEmail = $settings->get('notification_email');
        if (! $toEmail) {
            return;
        }

        $content = "The following users have been marked as inactive in the directory:\n\n";
        foreach ($users as $user) {
            $content .= "- {$user->name} ({$user->email})\n";
        }

        try {
            Mail::raw($content, function ($message) use ($toEmail) {
                $message->to($toEmail)
                    ->subject('User Inactive Alert');
            });
        } catch (\Exception $e) {
            Log::error('Failed to send user inactive notification: '.$e->getMessage());
        }
    }
}
