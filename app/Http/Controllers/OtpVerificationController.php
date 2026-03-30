<?php

namespace App\Http\Controllers;

use App\Models\OtpVerification;
use Illuminate\Http\Request;
use Carbon\Carbon;

class OtpVerificationController extends Controller
{
    public function sendOtp(Request $request)
    {
        $validated = $request->validate([
            'mobile' => 'required|string|min:10|max:20',
        ]);

        $mobile = $validated['mobile'];
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiryTime = Carbon::now()->addMinutes(5);

        OtpVerification::where('mobile', $mobile)->delete();

        $record = OtpVerification::create([
            'mobile' => $mobile,
            'otp' => $otp,
            'expiry_time' => $expiryTime,
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'OTP sent successfully',
            'mobile' => $mobile,
            'expires_in' => 300,
        ], 200);
    }

    public function verifyOtp(Request $request)
    {
        $validated = $request->validate([
            'mobile' => 'required|string|min:10|max:20',
            'otp' => 'required|string|size:6',
        ]);

        $mobile = $validated['mobile'];
        $otp = $validated['otp'];

        $record = OtpVerification::where('mobile', $mobile)
            ->where('status', 'pending')
            ->first();

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'No pending OTP found for this mobile number',
            ], 400);
        }

        if (Carbon::now()->isAfter($record->expiry_time)) {
            $record->update(['status' => 'expired']);
            return response()->json([
                'success' => false,
                'message' => 'OTP has expired. Please request a new one.',
            ], 400);
        }

        if ($record->otp !== $otp) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid OTP',
            ], 400);
        }

        $record->update(['status' => 'verified']);

        return response()->json([
            'success' => true,
            'message' => 'OTP verified successfully',
            'mobile' => $mobile,
            'verified_at' => $record->updated_at,
        ], 200);
    }

    public function resendOtp(Request $request)
    {
        $validated = $request->validate([
            'mobile' => 'required|string|min:10|max:20',
        ]);

        $mobile = $validated['mobile'];

        $record = OtpVerification::where('mobile', $mobile)->first();

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'No OTP record found for this mobile number',
            ], 400);
        }

        $newOtp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiryTime = Carbon::now()->addMinutes(5);

        $record->update([
            'otp' => $newOtp,
            'expiry_time' => $expiryTime,
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'OTP resent successfully',
            'mobile' => $mobile,
            'expires_in' => 300,
        ], 200);
    }

    public function checkVerificationStatus(Request $request)
    {
        $validated = $request->validate([
            'mobile' => 'required|string|min:10|max:20',
        ]);

        $mobile = $validated['mobile'];

        $record = OtpVerification::where('mobile', $mobile)->first();

        if (!$record) {
            return response()->json([
                'verified' => false,
                'status' => null,
            ], 200);
        }

        return response()->json([
            'verified' => $record->status === 'verified',
            'status' => $record->status,
            'mobile' => $mobile,
        ], 200);
    }
}
