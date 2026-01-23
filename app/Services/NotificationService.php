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

        $html = "
            <p>The following users have been marked as inactive in the directory:</p>
            <table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse; width: 100%;'>
                <thead>
                    <tr style='background-color: #f2f2f2;'>
                        <th>Tenant Name</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>License Name</th>
                    </tr>
                </thead>
                <tbody>";

        foreach ($users as $user) {
            $tenantName = $user->tenant->name ?? 'N/A';
            $licenseName = $user->license_name ?? 'N/A';
            $html .= "
                <tr>
                    <td>{$tenantName}</td>
                    <td>{$user->name}</td>
                    <td>{$user->email}</td>
                    <td>{$licenseName}</td>
                </tr>";
        }

        $html .= "
                </tbody>
            </table>";

        try {
            Mail::html($html, function ($message) use ($toEmail) {
                $message->to($toEmail)
                    ->subject('User Inactive Alert');
            });
        } catch (\Exception $e) {
            Log::error('Failed to send user inactive notification: '.$e->getMessage());
        }
    }

    public static function sendSecretExpiryNotification($tenants)
    {
        $settings = MailSetting::all()->pluck('value', 'key');

        if (($settings->get('trigger_secret_expiry') ?? '0') !== '1') {
            return;
        }

        MailService::configureMailer();

        $toEmail = $settings->get('notification_email');
        if (! $toEmail) {
            return;
        }

        $html = "
            <p>The following tenants have Client Secrets or Certificates expiring within the next 30 days:</p>
            <table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse; width: 100%;'>
                <thead>
                    <tr style='background-color: #f2f2f2;'>
                        <th>Tenant Name</th>
                        <th>Type</th>
                        <th>Expiry Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>";

        foreach ($tenants as $tenant) {
            if ($tenant->client_secret_expires_at && $tenant->client_secret_expires_at->lt(now()->addDays(30))) {
                $html .= "
                    <tr>
                        <td>{$tenant->name}</td>
                        <td>Client Secret</td>
                        <td>{$tenant->client_secret_expires_at->format('Y-m-d')}</td>
                        <td style='color: red;'>Expiring Soon</td>
                    </tr>";
            }

            if ($tenant->certificate_expires_at && $tenant->certificate_expires_at->lt(now()->addDays(30))) {
                $html .= "
                    <tr>
                        <td>{$tenant->name}</td>
                        <td>Certificate</td>
                        <td>{$tenant->certificate_expires_at->format('Y-m-d')}</td>
                        <td style='color: red;'>Expiring Soon</td>
                    </tr>";
            }
        }

        $html .= "
                </tbody>
            </table>
            <p>Please update these credentials in the tenant settings and Azure Portal to avoid service interruption.</p>";

        try {
            Mail::html($html, function ($message) use ($toEmail) {
                $message->to($toEmail)
                    ->subject('Tenant Credential Expiry Alert');
            });
        } catch (\Exception $e) {
            Log::error('Failed to send secret expiry notification: '.$e->getMessage());
        }
    }
}
