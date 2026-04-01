<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;
use App\Services\EmailModeService;
use Illuminate\Support\Facades\Log;

class OutageService
{
    public function process()
    {
        $customers = $this->getCustomers();
        $outages = $this->getOutages();

        foreach ($outages as $outage) {

            $location = strtoupper($outage['location'] ?? '');

            if (empty($location)) continue;

            // Example: WILLIAMSTOWN,VIC
            $parts = explode(',', $location);
            $outageSuburb = trim($parts[0] ?? '');
            $outageState  = trim($parts[1] ?? '');

            foreach ($customers as $customer) {

                $custSuburb = strtoupper($customer['address']['suburb'] ?? '');
                $custState  = strtoupper($customer['address']['state'] ?? '');

                // ✅ Match location
                if ($outageSuburb !== $custSuburb || $outageState !== $custState) {
                    continue;
                }

                // ✅ Prevent duplicate
                if ($this->alreadyNotified($outage['outageID'], $customer['id'])) {
                    continue;
                }

                $this->handleNotification($customer, $outage);
            }
        }
    }

    // ================= API CALLS =================

    private function getCustomers()
    {
        $response = Http::get(env('CUSTOMER_API_URL'));

        return $response->json()['customers'] ?? [];
    }

    private function getOutages()
    {
        $response = Http::get(env('OUTAGE_API_URL'));

        return $response->json()['outages'] ?? [];
    }

    // ================= LOGIC =================

    private function handleNotification($customer, $outage)
    {
        $plannedStart = !empty($outage['plannedStart']) 
            ? Carbon::parse($outage['plannedStart']) 
            : null;

        $created = !empty($outage['created']) 
            ? Carbon::parse($outage['created']) 
            : null;

        // ✅ Planned outage → notify today if tomorrow
        if ($outage['type'] === 'planned' && $plannedStart && $plannedStart->isTomorrow()) {

            $this->sendNotification($customer, $outage, 'planned');
        }

        // ✅ Unplanned outage → immediate
        if ($outage['type'] === 'unplanned' && $created && $created->gt(now()->subMinutes(15))) {

            $this->sendNotification($customer, $outage, 'unplanned');
        }
    }

    private function sendNotification($customer, $outage, $type)
    {
        $originalEmail = $customer['email'];
        $tenantId = app('tenant.id') ?? null;

        $email = EmailModeService::getRecipients($originalEmail, $tenantId);

        if (!$email) {
            Log::error('Cannot send notification - no email configured for test mode', [
                'customer_id' => $customer['id'],
                'outage_id' => $outage['outageID'],
                'tenant_id' => $tenantId,
            ]);
            return;
        }

        $message = $type === 'planned'
            ? "Planned outage tomorrow at {$outage['plannedStart']} in {$outage['location']}"
            : "Unplanned outage in your area ({$outage['location']}). We are working on it.";

        try {
            Mail::raw($message, function ($mail) use ($email, $type, $tenantId) {
                $mail->to($email)
                    ->subject($type === 'planned' ? 'Planned Outage' : 'Unplanned Outage');

                EmailModeService::processMail($mail, $tenantId);
            });

            Log::info('Outage notification sent', [
                'customer_id' => $customer['id'],
                'outage_id' => $outage['outageID'],
                'recipient' => $email,
                'type' => $type,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send outage notification: ' . $e->getMessage(), [
                'customer_id' => $customer['id'],
                'outage_id' => $outage['outageID'],
            ]);
            return;
        }

        DB::table('outage_notifications')->insert([
            'outage_id' => $outage['outageID'],
            'customer_id' => $customer['id'],
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    private function alreadyNotified($outageId, $customerId)
    {
        return DB::table('outage_notifications')
            ->where('outage_id', $outageId)
            ->where('customer_id', $customerId)
            ->exists();
    }
}