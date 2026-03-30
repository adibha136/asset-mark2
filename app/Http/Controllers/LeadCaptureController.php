<?php

namespace App\Http\Controllers;

use App\Models\LeadCapture;
use Illuminate\Http\Request;

class LeadCaptureController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'mobile' => 'required|string|min:10|max:20',
            'customer_name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'purpose_of_visit' => 'nullable|string',
            'interested_product' => 'nullable|string',
            'budget' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        $lead = LeadCapture::create([
            'mobile' => $validated['mobile'],
            'customer_name' => $validated['customer_name'],
            'address' => $validated['address'] ?? null,
            'purpose_of_visit' => $validated['purpose_of_visit'] ?? null,
            'interested_product' => $validated['interested_product'] ?? null,
            'budget' => $validated['budget'] ?? null,
            'remarks' => $validated['remarks'] ?? null,
            'status' => 'submitted',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lead captured successfully',
            'lead' => $lead,
        ], 201);
    }

    public function getLeads(Request $request)
    {
        $leads = LeadCapture::query()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $leads,
            'count' => $leads->count(),
        ], 200);
    }

    public function show($id)
    {
        $lead = LeadCapture::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $lead,
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $lead = LeadCapture::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead not found',
            ], 404);
        }

        $validated = $request->validate([
            'customer_name' => 'sometimes|string|max:255',
            'address' => 'nullable|string',
            'purpose_of_visit' => 'nullable|string',
            'interested_product' => 'nullable|string',
            'budget' => 'nullable|string',
            'remarks' => 'nullable|string',
            'status' => 'nullable|in:draft,submitted,contacted',
        ]);

        $lead->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Lead updated successfully',
            'data' => $lead,
        ], 200);
    }

    public function delete($id)
    {
        $lead = LeadCapture::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead not found',
            ], 404);
        }

        $lead->delete();

        return response()->json([
            'success' => true,
            'message' => 'Lead deleted successfully',
        ], 200);
    }
}
