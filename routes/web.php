<?php

use App\Http\Controllers\ChecklistController;
use App\Http\Controllers\EmailSettingsController;
use App\Http\Controllers\GlobalSearchController;
use App\Http\Controllers\LeadCaptureController;
use App\Http\Controllers\MailSettingController;
use App\Http\Controllers\NextelecomSettingController;
use App\Http\Controllers\OtpVerificationController;
use App\Jobs\FetchUserPhoto;
use App\Jobs\SyncTenantDirectory;
use App\Mail\OtpMail;
use App\Models\Asset;
use App\Models\AssetActivity;
use App\Models\AssetAssignment;
use App\Models\AssetDocument;
use App\Models\Customer;
use App\Models\DirectoryUser;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\SyncLog;
use App\Models\SyncSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Services\EmailModeService;
use App\Services\MailService;
use App\Services\MicrosoftGraphService;
use App\Services\NextelecomService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

Route::prefix('api')->group(function () {
    Route::get('/mail-settings', [MailSettingController::class, 'index']);
    Route::post('/mail-settings', [MailSettingController::class, 'update']);
    Route::post('/mail-settings/test', [MailSettingController::class, 'test']);

    Route::get('/email-settings', [EmailSettingsController::class, 'index']);
    Route::post('/email-settings', [EmailSettingsController::class, 'update']);
    Route::post('/email-settings/test', [EmailSettingsController::class, 'test']);

    $mockMode = env('NEXTELECOM_MOCK_MODE', false);

    Route::post('/nextelecom/test-connection', function (Request $request) {
        $username = $request->input('username');
        $password = $request->input('password');
        $mfapin = $request->input('mfapin', '0000');

        if (! $username || ! $password) {
            return response()->json([
                'connected' => false,
                'message' => 'Username and password are required',
            ], 400);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post('https://api.virtualplatform.com.au/v2/auth', [
                'username' => $username,
                'password' => $password,
                'mfapin' => $mfapin,
            ]);

            $data = $response->json();

            return response()->json([
                'connected' => $response->status() === 200,
                'status' => $response->status(),
                'message' => $response->status() === 200 ? 'API connection successful' : 'API returned error',
                'hasToken' => isset($data['token']) || isset($data['access_token']) || isset($data['AUTH_TOKEN']),
                'data' => $data,
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'connected' => false,
                'status' => 0,
                'message' => 'API is unreachable',
                'error' => $e->getMessage(),
                'hint' => 'The VirtualPlatform API server is not responding. Verify the endpoint and your network connection.',
            ], 503);
        }
    });

    Route::post('/nextelecom/proxy-auth', function (Request $request) use ($mockMode) {
        if ($mockMode) {
            return response()->json([
                'token' => 'mock_token_'.Str::random(40),
                'auth_type' => $request->input('authType', 'standard'),
                'username' => $request->input('username'),
                'expires_in' => 86400,
                'message' => 'Mock authentication successful',
            ], 200);
        }

        $type = $request->input('authType', 'standard');
        $url = $type === 'onetime'
            ? 'https://api.virtualplatform.com.au/v2/onetime/auth'
            : 'https://api.virtualplatform.com.au/v2/auth';

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post($url, [
                'username' => $request->input('username'),
                'password' => $request->input('password'),
                'mfapin' => $request->input('mfapin', '0000'),
            ]);

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Connection Failed',
                'message' => $e->getMessage(),
                'hint' => 'The VirtualPlatform API may be unreachable. Enable NEXTELECOM_MOCK_MODE=true in .env to test with mock data.',
            ], 500);
        }
    });

    Route::get('/nextelecom/proxy-customers', function (Request $request) use ($mockMode) {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);

        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if (! $tenantId) {
            Log::warning('Nextelecom: No tenant ID found - skipping database sync');
        }

        if ($mockMode) {
            $mockCustomers = [
                ['id' => 1, 'name' => 'Acme Corporation', 'phone' => '03 9999 1111', 'email' => 'contact@acme.com.au', 'type' => 'business', 'abn' => '12345678901'],
                ['id' => 2, 'name' => 'Tech Solutions Pty Ltd', 'phone' => '03 8888 2222', 'email' => 'sales@techsol.com.au', 'type' => 'business', 'abn' => '98765432101'],
                ['id' => 3, 'name' => 'John Smith', 'phone' => '0412 555 333', 'email' => 'john@example.com', 'type' => 'person', 'abn' => null],
            ];

            if ($tenantId) {
                try {
                    Customer::syncFromApi($mockCustomers, $tenantId);
                    Log::info('Nextelecom: Customers synced', ['count' => count($mockCustomers), 'tenant' => $tenantId]);
                } catch (\Exception $e) {
                    Log::error('Nextelecom: Sync failed', ['error' => $e->getMessage()]);
                }
            }

            return response()->json([
                'data' => [
                    'customers' => $mockCustomers,
                ],
                'status' => 'OK',
            ], 200);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'Authorization' => $token,
            ])->get('https://api.virtualplatform.com.au/v2/wholesale/customers');

            if ($response->ok()) {
                $data = $response->json();
                $customers = [];

                if (is_array($data)) {
                    $customers = $data;
                } elseif (is_array($data['data']['customers'] ?? null)) {
                    $customers = $data['data']['customers'];
                } elseif (is_array($data['customers'] ?? null)) {
                    $customers = $data['customers'];
                } elseif (is_array($data['data'] ?? null)) {
                    $customers = $data['data'];
                }

                if (! empty($customers) && $tenantId) {
                    try {
                        Customer::syncFromApi($customers, $tenantId);
                        Log::info('Nextelecom: Customers synced from API', ['count' => count($customers), 'tenant' => $tenantId]);
                    } catch (\Exception $e) {
                        Log::error('Nextelecom: Sync failed', ['error' => $e->getMessage()]);
                    }
                }
            }

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Proxy Error',
                'message' => $e->getMessage(),
            ], 500);
        }
    });

    Route::post('/nextelecom/proxy-customers', function (Request $request) {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'Authorization' => $token,
            ])->post('https://api.virtualplatform.com.au/v2/wholesale/customers', $request->all());

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Proxy Error',
                'message' => $e->getMessage(),
            ], 500);
        }
    });

    Route::get('/nextelecom/proxy-customer-detail', function (Request $request) use ($mockMode) {
        $customerId = $request->input('customerID');

        if (! $customerId) {
            return response()->json(['error' => 'Customer ID is required'], 400);
        }

        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if ($mockMode) {
            return response()->json([
                'data' => [
                    'id' => $customerId,
                    'name' => 'Mock Customer',
                    'abn' => '12345678901',
                    'phone' => '0400000000',
                    'email' => 'customer@example.com',
                    'type' => 'business',
                    'address' => [
                        'streetNumber' => '123',
                        'streetName' => 'Main',
                        'streetType' => 'ST',
                        'suburb' => 'Brisbane',
                        'state' => 'QLD',
                        'postcode' => '4000',
                    ],
                    'individuals' => [
                        [
                            'firstName' => 'John',
                            'lastName' => 'Doe',
                            'email' => 'john@example.com',
                            'phone' => '0400111111',
                            'position' => 'Director',
                        ],
                    ],
                ],
            ], 200);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get("https://api.virtualplatform.com.au/v2/wholesale/customers/{$customerId}");

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch customer details',
                'message' => $e->getMessage(),
            ], 500);
        }
    });

    Route::get('/nextelecom/proxy-customer-metrics', function (Request $request) use ($mockMode) {
        $customerId = $request->input('customerID');

        if (! $customerId) {
            return response()->json(['error' => 'Customer ID is required'], 400);
        }

        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if ($mockMode) {
            return response()->json([
                'data' => [
                    'id' => $customerId,
                    'bandwidth' => 100,
                    'uptime' => 99.9,
                    'activeConnections' => 5,
                    'totalDataUsage' => 2500,
                ],
            ], 200);
        }

        try {
            $fullUrl = "https://api.virtualplatform.com.au/v2/wholesale/customers/{$customerId}/metrics";
            Log::info('Metrics API Request', [
                'customerId' => $customerId,
                'url' => $fullUrl,
                'token' => substr($token, 0, 50).'...',
            ]);

            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get($fullUrl);

            $responseBody = $response->json();
            Log::info('Metrics API Response', [
                'customerId' => $customerId,
                'status' => $response->status(),
                'headers' => $response->headers(),
                'body' => $responseBody,
            ]);

            return response()->json($responseBody, $response->status());
        } catch (\Exception $e) {
            Log::error('Metrics API Error', [
                'customerId' => $customerId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to fetch metrics',
                'message' => $e->getMessage(),
            ], 500);
        }
    });

    Route::get('/nextelecom/proxy-customer-data', function (Request $request) use ($mockMode) {
        $customerId = $request->input('customerID');

        if (! $customerId) {
            return response()->json(['error' => 'Customer ID is required'], 400);
        }

        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if ($mockMode) {
            return response()->json([
                'data' => [
                    'id' => $customerId,
                    'recordCount' => 1000,
                    'lastUpdate' => '2026-03-30T14:15:53Z',
                ],
            ], 200);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get("https://api.virtualplatform.com.au/v2/wholesale/customers/{$customerId}/data");

            Log::info('Data API Response', [
                'customerId' => $customerId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            Log::error('Data API Error', [
                'customerId' => $customerId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to fetch data',
                'message' => $e->getMessage(),
            ], 500);
        }
    });

    Route::get('/nextelecom/proxy-customer-users', function (Request $request) use ($mockMode) {
        $customerId = $request->input('customerID');

        if (! $customerId) {
            return response()->json(['error' => 'Customer ID is required'], 400);
        }

        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if ($mockMode) {
            return response()->json([
                'data' => [
                    [
                        'id' => 'USR_001',
                        'name' => 'John Doe',
                        'email' => 'john@example.com',
                        'role' => 'Admin',
                        'status' => 'active',
                    ],
                    [
                        'id' => 'USR_002',
                        'name' => 'Jane Smith',
                        'email' => 'jane@example.com',
                        'role' => 'User',
                        'status' => 'active',
                    ],
                ],
            ], 200);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get("https://api.virtualplatform.com.au/v2/wholesale/customers/{$customerId}/users");

            Log::info('Users API Response', [
                'customerId' => $customerId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            Log::error('Users API Error', [
                'customerId' => $customerId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to fetch users',
                'message' => $e->getMessage(),
            ], 500);
        }
    });

    Route::get('/nextelecom/proxy-customer-integration', function (Request $request) use ($mockMode) {
        $customerId = $request->input('customerID');

        if (! $customerId) {
            return response()->json(['error' => 'Customer ID is required'], 400);
        }

        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if ($mockMode) {
            return response()->json([
                'data' => [
                    'id' => $customerId,
                    'xero' => [
                        'enabled' => true,
                        'lastSync' => '2026-03-30T10:00:00Z',
                        'status' => 'synced',
                    ],
                ],
            ], 200);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get("https://api.virtualplatform.com.au/v2/wholesale/customers/{$customerId}/integration");

            Log::info('Integration API Response', [
                'customerId' => $customerId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            Log::error('Integration API Error', [
                'customerId' => $customerId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to fetch integration',
                'message' => $e->getMessage(),
            ], 500);
        }
    });

    Route::get('/nextelecom/customers', function (Request $request) {
        $tenantId = app('tenant.id');
        $customers = Customer::where('tenant_id', $tenantId)
            ->select('id', 'external_id', 'name', 'email', 'phone', 'type', 'abn', 'street_number', 'street_name', 'street_type', 'suburb', 'state', 'postcode', 'sub_number', 'is_reseller', 'integration_create', 'status')
            ->get()
            ->map(function ($customer) {
                return [
                    'id' => $customer->external_id ?? $customer->id,
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'type' => $customer->type,
                    'abn' => $customer->abn,
                    'address' => [
                        'streetNumber' => $customer->street_number,
                        'streetName' => $customer->street_name,
                        'streetType' => $customer->street_type,
                        'suburb' => $customer->suburb,
                        'state' => $customer->state,
                        'postcode' => $customer->postcode,
                        'subNumber' => $customer->sub_number,
                    ],
                    'isReseller' => (bool) $customer->is_reseller,
                    'integrationCreate' => (bool) $customer->integration_create,
                    'status' => $customer->status,
                ];
            });

        return response()->json([
            'data' => [
                'customers' => $customers,
            ],
            'status' => 'OK',
        ], 200);
    });

    Route::get('/nextelecom/proxy-connectivity', function (Request $request) use ($mockMode) {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if ($mockMode) {
            return response()->json([
                'data' => [
                    'connectivity' => [
                        [
                            'connectivityID' => 'CON_001',
                            'name' => 'Internet - Sydney',
                            'product' => 'FTTP-10040-1-STD',
                            'carrier' => 'NBN',
                            'status' => 'LIVE',
                            'productDetails' => ['name' => 'NBN FTTP Business TC4 100/40Mbps'],
                            'serviceLocation' => ['suburb' => 'Sydney', 'state' => 'NSW', 'postcode' => '2000'],
                            'ipAddressing' => ['ipCount' => 2, 'ipList' => ['138.252.147.21', '138.252.147.22']],
                        ],
                        [
                            'connectivityID' => 'CON_002',
                            'name' => 'Internet - Melbourne',
                            'product' => 'FTTP-10040-1-STD',
                            'carrier' => 'NBN',
                            'status' => 'LIVE',
                            'productDetails' => ['name' => 'NBN FTTP Business TC4 100/40Mbps'],
                            'serviceLocation' => ['suburb' => 'Melbourne', 'state' => 'VIC', 'postcode' => '3000'],
                            'ipAddressing' => ['ipCount' => 2, 'ipList' => ['138.252.147.23', '138.252.147.24']],
                        ],
                        [
                            'connectivityID' => 'CON_003',
                            'name' => 'Backup - Brisbane',
                            'product' => 'FTTP-10040-1-STD',
                            'carrier' => 'NBN',
                            'status' => 'PROVISIONING',
                            'productDetails' => ['name' => 'NBN FTTP Business TC4 100/40Mbps'],
                            'serviceLocation' => ['suburb' => 'Brisbane', 'state' => 'QLD', 'postcode' => '4000'],
                            'ipAddressing' => ['ipCount' => 0, 'ipList' => [null]],
                        ],
                    ],
                ],
            ], 200);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get('https://api.virtualplatform.com.au/v2/connectivity/connections');

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch connectivity'], 500);
        }
    });

    Route::get('/nextelecom/proxy-connectivity/{connectionID}', function (Request $request, $connectionID) use ($mockMode) {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if ($mockMode) {
            $mockData = [
                'CON_001' => [
                    'connectivity' => [
                        [
                            'connectivityID' => 'CON_001',
                            'name' => 'Internet - Sydney',
                            'carrier' => 'NBN',
                            'provisioning' => ['status' => 'Complete'],
                            'serviceAvailability' => ['currentStatus' => 'LIVE', 'cpeMac' => '00:1A:2B:3C:4D:5E'],
                            'productDetails' => [
                                [
                                    'name' => 'NBN FTTP Business TC4 100/40Mbps',
                                    'fields' => ['Speed' => '100/40 Mbps'],
                                    'priceGST' => '$450.00/month',
                                ],
                            ],
                            'serviceLocation' => [
                                'streetNumber' => '123',
                                'streetName' => 'Pitt',
                                'streetType' => 'Street',
                                'suburb' => 'Sydney',
                                'state' => 'NSW',
                                'postcode' => '2000',
                            ],
                            'ipAddressing' => ['ipList' => ['138.252.147.21', '138.252.147.22']],
                            'accessDetails' => ['AVCID' => 'AVC000001'],
                            'outage' => ['plannedOutage' => false, 'unplannedOutage' => false],
                        ],
                    ],
                ],
                'CON_002' => [
                    'connectivity' => [
                        [
                            'connectivityID' => 'CON_002',
                            'name' => 'Internet - Melbourne',
                            'carrier' => 'NBN',
                            'provisioning' => ['status' => 'Complete'],
                            'serviceAvailability' => ['currentStatus' => 'LIVE', 'cpeMac' => '00:1A:2B:3C:4D:5F'],
                            'productDetails' => [
                                [
                                    'name' => 'NBN FTTP Business TC4 100/40Mbps',
                                    'fields' => ['Speed' => '100/40 Mbps'],
                                    'priceGST' => '$450.00/month',
                                ],
                            ],
                            'serviceLocation' => [
                                'streetNumber' => '456',
                                'streetName' => 'Collins',
                                'streetType' => 'Street',
                                'suburb' => 'Melbourne',
                                'state' => 'VIC',
                                'postcode' => '3000',
                            ],
                            'ipAddressing' => ['ipList' => ['138.252.147.23', '138.252.147.24']],
                            'accessDetails' => ['AVCID' => 'AVC000002'],
                            'outage' => ['plannedOutage' => false, 'unplannedOutage' => false],
                        ],
                    ],
                ],
                'CON_003' => [
                    'connectivity' => [
                        [
                            'connectivityID' => 'CON_003',
                            'name' => 'Backup - Brisbane',
                            'carrier' => 'NBN',
                            'provisioning' => ['status' => 'In Progress'],
                            'serviceAvailability' => ['currentStatus' => 'PROVISIONING', 'cpeMac' => null],
                            'productDetails' => [
                                [
                                    'name' => 'NBN FTTP Business TC4 100/40Mbps',
                                    'fields' => ['Speed' => '100/40 Mbps'],
                                    'priceGST' => '$450.00/month',
                                ],
                            ],
                            'serviceLocation' => [
                                'streetNumber' => '789',
                                'streetName' => 'Queen',
                                'streetType' => 'Street',
                                'suburb' => 'Brisbane',
                                'state' => 'QLD',
                                'postcode' => '4000',
                            ],
                            'ipAddressing' => ['ipList' => []],
                            'accessDetails' => ['AVCID' => 'AVC000003'],
                            'outage' => ['plannedOutage' => false, 'unplannedOutage' => false],
                        ],
                    ],
                ],
            ];

            if (isset($mockData[$connectionID])) {
                return response()->json(['data' => $mockData[$connectionID]], 200);
            }

            return response()->json(['error' => 'Connection not found'], 404);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get("https://api.virtualplatform.com.au/v2/connectivity/connection/{$connectionID}");

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch connectivity details'], 500);
        }
    });

    Route::get('/nextelecom/proxy-integrations', function (Request $request) use ($mockMode) {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if ($mockMode) {
            return response()->json([
                'data' => [
                    ['integrationID' => 'int_001', 'name' => 'Xero Accounting', 'enabled' => true, 'code' => 'XERO'],
                    ['integrationID' => 'int_002', 'name' => 'Salesforce CRM', 'enabled' => true, 'code' => 'SALESFORCE'],
                    ['integrationID' => 'int_003', 'name' => 'QuickBooks', 'enabled' => false, 'code' => 'QB'],
                ],
            ], 200);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get('https://api.virtualplatform.com.au/v2/wholesale/integrations');

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch integrations'], 500);
        }
    });

    Route::get('/nextelecom/proxy-voip', function (Request $request) use ($mockMode) {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if ($mockMode) {
            return response()->json([
                'data' => [
                    'voip' => [
                        [
                            'voipID' => 'VOIP_001',
                            'name' => 'Business Phone System',
                            'status' => 'ACTIVE',
                            'enabled' => true,
                            'numbers' => ['61282120000', '61282120001'],
                            'users' => 5,
                            'protocol' => 'SIP',
                        ],
                    ],
                ],
            ], 200);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get('https://api.virtualplatform.com.au/v2/voip/services');

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch VoIP services'], 500);
        }
    });

    Route::get('/nextelecom/proxy-outages-debug', function (Request $request) {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get('https://api.virtualplatform.com.au/v2/connectivity/outages');

            return response()->json([
                'status' => $response->status(),
                'raw_response' => $response->json(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    });

    Route::get('/nextelecom/proxy-outages', function (Request $request) use ($mockMode) {
        $tenantId = $request->query('tenant_id') ?? app('tenant.manager')->getTenantId();

        if (! $tenantId) {
            $tenantId = Tenant::first()?->id;
        }

        $token = $request->header('Authorization') ?? NextelecomService::getValidToken($tenantId);
        if (! $token) {
            return response()->json(['error' => 'Missing authorization token or failed to refresh token'], 401);
        }

        if ($mockMode) {
            return response()->json([
                'data' => [
                    'outages' => [
                        [
                            'id' => 'OUT_001',
                            'category' => 'NBN',
                            'type' => 'planned',
                            'title' => 'Planned Maintenance - Sydney',
                            'reason' => 'Planned Maintenance - Database upgrade',
                            'description' => 'Database infrastructure upgrade',
                            'status' => 'scheduled',
                            'severity' => 'medium',
                            'location' => 'Sydney, NSW',
                            'plannedStart' => '2026-04-05T02:00:00Z',
                            'plannedEnd' => '2026-04-05T06:00:00Z',
                            'startTime' => '2026-04-05T02:00:00Z',
                            'endTime' => '2026-04-05T06:00:00Z',
                            'affectedAssets' => 45,
                            'expectedResolution' => '2026-04-05 06:00 AM',
                            'rootCause' => 'Scheduled hardware maintenance and database optimization',
                            'affectedServices' => ['Internet', 'VoIP', 'Cloud Services'],
                            'updates' => [
                                ['timestamp' => '2026-03-30 10:30 AM', 'message' => 'Maintenance scheduled for this weekend'],
                                ['timestamp' => '2026-03-29 02:00 PM', 'message' => 'All customers notified via email'],
                            ],
                            'supportContact' => [
                                'ticketNumber' => 'TKT-2026-001234',
                                'email' => 'support@nextelecom.com.au',
                                'phone' => '1300 TELECOM',
                            ],
                        ],
                        [
                            'id' => 'OUT_002',
                            'category' => 'NBN',
                            'type' => 'unplanned',
                            'title' => 'Network Upgrade - Melbourne',
                            'reason' => 'Equipment failure in primary network node',
                            'description' => 'Core network equipment replacement',
                            'status' => 'active',
                            'severity' => 'high',
                            'location' => 'Melbourne, VIC',
                            'plannedStart' => '2026-03-30T10:00:00Z',
                            'plannedEnd' => null,
                            'startTime' => '2026-03-30T10:00:00Z',
                            'endTime' => null,
                            'affectedAssets' => 128,
                            'expectedResolution' => '2026-03-30 04:00 PM',
                            'rootCause' => 'Equipment failure in primary network node - replacement in progress',
                            'affectedServices' => ['Internet', 'MPLS'],
                            'updates' => [
                                ['timestamp' => '2026-03-30 12:45 PM', 'message' => 'Redundant systems activated, service partially restored'],
                                ['timestamp' => '2026-03-30 11:30 AM', 'message' => 'Primary equipment failure detected'],
                                ['timestamp' => '2026-03-30 10:05 AM', 'message' => 'Outage event initiated'],
                            ],
                            'supportContact' => [
                                'ticketNumber' => 'TKT-2026-001235',
                                'email' => 'support@nextelecom.com.au',
                                'phone' => '1300 TELECOM',
                            ],
                        ],
                    ],
                ],
            ], 200);
        }

        try {
            $response = Http::timeout(30)->withHeaders([
                'Accept' => 'application/json',
                'Authorization' => $token,
            ])->get('https://api.virtualplatform.com.au/v2/connectivity/outages');

            if ($response->ok()) {
                $data = $response->json();

                $outages = $data['data']['outages'] ?? $data['outages'] ?? $data['data'] ?? [];

                if (is_array($outages)) {
                    $outages = array_map(function ($outage) {
                        if (! isset($outage['reason'])) {
                            // Check in details section first
                            if (isset($outage['details']['reason'])) {
                                $outage['reason'] = $outage['details']['reason'];
                            } elseif (isset($outage['details']) && is_array($outage['details'])) {
                                // Try to find reason in various detail fields
                                if (isset($outage['details']['cause'])) {
                                    $outage['reason'] = $outage['details']['cause'];
                                } elseif (isset($outage['details']['impact'])) {
                                    $outage['reason'] = $outage['details']['impact'];
                                } elseif (isset($outage['details']['description'])) {
                                    $outage['reason'] = $outage['details']['description'];
                                }
                            }

                            // Fallback to other fields if not in details
                            if (! isset($outage['reason'])) {
                                if (isset($outage['rootCause'])) {
                                    $outage['reason'] = $outage['rootCause'];
                                } elseif (isset($outage['description'])) {
                                    $outage['reason'] = $outage['description'];
                                } elseif (isset($outage['title'])) {
                                    $outage['reason'] = $outage['title'];
                                } elseif (isset($outage['summary'])) {
                                    $outage['reason'] = $outage['summary'];
                                } elseif (isset($outage['cause'])) {
                                    $outage['reason'] = $outage['cause'];
                                } elseif (isset($outage['impact'])) {
                                    $outage['reason'] = $outage['impact'];
                                } else {
                                    $outage['reason'] = 'No reason provided';
                                }
                            }
                        }

                        if (! isset($outage['plannedStart']) && isset($outage['startTime'])) {
                            $outage['plannedStart'] = $outage['startTime'];
                        }
                        if (! isset($outage['plannedStart']) && isset($outage['start_time'])) {
                            $outage['plannedStart'] = $outage['start_time'];
                        }

                        if (! isset($outage['plannedEnd']) && isset($outage['endTime'])) {
                            $outage['plannedEnd'] = $outage['endTime'];
                        }
                        if (! isset($outage['plannedEnd']) && isset($outage['end_time'])) {
                            $outage['plannedEnd'] = $outage['end_time'];
                        }

                        return $outage;
                    }, $outages);

                    if (isset($data['data']['outages'])) {
                        $data['data']['outages'] = $outages;
                    } elseif (isset($data['outages'])) {
                        $data['outages'] = $outages;
                    } else {
                        $data = $outages;
                    }
                }

                return response()->json($data, $response->status());
            }

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch outages'], 500);
        }
    });

    Route::post('/nextelecom/client-connectivity-workflow', function (Request $request) use ($mockMode) {
        $clientId = $request->input('client_id');
        $clientName = $request->input('client_name');

        if (!$clientId || !$clientName) {
            return response()->json([
                'error' => 'Missing required parameters',
                'message' => 'Both client_id and client_name are required'
            ], 400);
        }

        try {
            Log::info('Client Connectivity Workflow Started', [
                'clientId' => $clientId,
                'clientName' => $clientName,
                'mockMode' => $mockMode,
            ]);

            $token = null;
            
            if ($mockMode) {
                Log::info('Mock Mode: Returning sample data');
                $token = 'mock_token_' . Str::random(40);
            } else {
                Log::info('Real Mode: Calling wholesale login API');
                
                // Get all tenants
                $tenantId = app('tenant.id');
                if (!$tenantId) {
                    $firstTenant = \App\Models\Tenant::first();
                    $tenantId = $firstTenant?->id;
                }
                
                Log::info('Tenant context', [
                    'tenantId' => $tenantId,
                    'hasTenant' => $tenantId ? true : false,
                ]);
                
                // Get all api_token settings for debugging
                $allTokenSettings = \App\Models\NextelecomSetting::where('type', 'api_token')->get();
                Log::info('All token settings in DB', [
                    'count' => $allTokenSettings->count(),
                    'tenants' => $allTokenSettings->map(function($s) { return $s->tenant_id; })->toArray(),
                ]);
                
                // Step 1: Get stored token from settings
                $tokenData = \App\Models\NextelecomSetting::getSetting('api_token', null, $tenantId);
                
                Log::info('Token Data Retrieved', [
                    'tenantId' => $tenantId,
                    'tokenDataType' => gettype($tokenData),
                    'tokenDataKeys' => is_array($tokenData) ? implode(', ', array_keys($tokenData)) : 'not_array',
                    'fullTokenData' => json_encode($tokenData),
                ]);
                
                $storedToken = is_array($tokenData) ? ($tokenData['token'] ?? null) : null;
                
                Log::info('Stored Token Status', [
                    'hasToken' => $storedToken ? true : false,
                    'tokenLength' => $storedToken ? strlen($storedToken) : 0,
                    'tokenType' => gettype($storedToken),
                ]);
                
                if (!$storedToken) {
                    Log::error('No token found in settings', [
                        'allTokenData' => json_encode($tokenData),
                        'tenantId' => $tenantId,
                    ]);
                    return response()->json([
                        'error' => 'Authentication required',
                        'message' => 'No API token found. Please connect in Settings first.',
                    ], 401);
                }
                
                // Step 2: POST to wholesale/login with customer_id and token
                Log::info('Sending wholesale login request', [
                    'clientId' => $clientId,
                    'clientName' => $clientName,
                    'tokenLength' => strlen($storedToken),
                ]);
                
                $loginPayload = [
                    'customerID' => $clientId,
                ];
                
                Log::info('Login Payload Before Send', [
                    'payload' => json_encode($loginPayload),
                    'hasCustomerID' => isset($loginPayload['customerID']),
                ]);
                
                $loginResponse = Http::timeout(30)->withHeaders([
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $storedToken,
                ])->post('https://api.virtualplatform.com.au/v2/wholesale/login', $loginPayload);

                Log::info('Wholesale Login Response', [
                    'status' => $loginResponse->status(),
                    'body' => $loginResponse->body(),
                ]);

                if ($loginResponse->status() !== 200) {
                    Log::error('Wholesale login failed', [
                        'status' => $loginResponse->status(),
                        'response' => $loginResponse->body(),
                    ]);
                    
                    return response()->json([
                        'error' => 'Login failed',
                        'message' => 'Failed to authenticate with client ID',
                        'status' => $loginResponse->status(),
                    ], $loginResponse->status());
                }

                $loginData = $loginResponse->json();
                
                // Try to extract token from response, fallback to stored token if not provided
                $token = $loginData['data']['token'] ?? $loginData['token'] ?? $storedToken;

                if (!$token) {
                    Log::error('Token extraction failed', [
                        'loginData' => $loginData,
                    ]);
                    
                    return response()->json([
                        'error' => 'Token extraction failed',
                        'message' => 'Login successful but no token found in response',
                    ], 500);
                }
                
                Log::info('Token ready for connectivity call', [
                    'tokenFromResponse' => isset($loginData['data']['token']) || isset($loginData['token']),
                    'usingStoredToken' => $token === $storedToken,
                ]);
            }

            if ($mockMode) {
                // Mock connectivity data
                Log::info('Mock Mode: Returning mock connectivity data');
                $allConnectivity = [
                    [
                        'connectivityID' => 'CON_001',
                        'name' => $clientName,
                        'product' => 'FTTP-10040-1-STD',
                        'carrier' => 'NBN',
                        'status' => 'LIVE',
                        'productDetails' => [
                            [
                                'name' => 'NBN FTTP Business TC4 100/40Mbps',
                                'fields' => ['Speed' => '100/40 Mbps'],
                                'priceGST' => '$450.00/month',
                            ]
                        ],
                        'serviceLocation' => [
                            'streetNumber' => '123',
                            'streetName' => 'Main',
                            'suburb' => 'Sydney',
                            'state' => 'NSW',
                            'postcode' => '2000'
                        ],
                        'ipAddressing' => [
                            'ipCount' => 2,
                            'ipList' => ['138.252.147.21', '138.252.147.22']
                        ],
                        'voip' => [
                            'enabled' => true,
                            'numbers' => ['61282120000', '61282120001'],
                            'users' => 5,
                        ],
                        'provisioning' => ['status' => 'Complete'],
                    ],
                ];
            } else {
                // Real API call
                Log::info('Real Mode: Calling connectivity API');
                
                $connectivityResponse = Http::timeout(30)->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/json',
                ])->get('https://api.virtualplatform.com.au/v2/connectivity/connections');

                Log::info('Connectivity Response', [
                    'clientId' => $clientId,
                    'status' => $connectivityResponse->status(),
                    'body' => $connectivityResponse->body(),
                ]);

                if ($connectivityResponse->status() !== 200) {
                    Log::error('Connectivity fetch failed', [
                        'status' => $connectivityResponse->status(),
                        'response' => $connectivityResponse->body(),
                    ]);
                    
                    return response()->json([
                        'error' => 'Failed to fetch connectivity',
                        'message' => 'Could not retrieve connectivity details',
                        'status' => $connectivityResponse->status(),
                    ], $connectivityResponse->status());
                }

                $connectivityData = $connectivityResponse->json();
                $allConnectivity = $connectivityData['data']['connectivity'] ?? $connectivityData['connectivity'] ?? [];
            }

            // Return all connectivity results without filtering by customer name
            $filteredConnectivity = $allConnectivity;

            Log::info('Connectivity Filtered Details', [
                'clientId' => $clientId,
                'clientName' => $clientName,
                'totalConnections' => count($allConnectivity),
                'filteredConnections' => count($filteredConnectivity),
                'allConnectionNames' => array_map(function($c) { return $c['name'] ?? 'NO_NAME'; }, $allConnectivity),
                'firstResult' => count($filteredConnectivity) > 0 ? json_encode($filteredConnectivity[0]) : 'NONE',
            ]);

            return response()->json([
                'status' => 200,
                'data' => [
                    'token' => $token,
                    'clientId' => $clientId,
                    'clientName' => $clientName,
                    'connectivity' => $filteredConnectivity,
                    'summary' => [
                        'totalConnections' => count($allConnectivity),
                        'matchingConnections' => count($filteredConnectivity),
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('Client Connectivity Workflow Error', [
                'clientId' => $clientId,
                'clientName' => $clientName,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'error' => 'Workflow execution failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    });

    Route::prefix('nextelecom/settings')->group(function () {
        Route::get('/', [NextelecomSettingController::class, 'getAllSettings']);
        Route::get('/api', [NextelecomSettingController::class, 'getApiSettings']);
        Route::post('/api', [NextelecomSettingController::class, 'saveApiSettings']);
        Route::get('/token', [NextelecomSettingController::class, 'getTokenData']);
        Route::post('/token', [NextelecomSettingController::class, 'saveTokenData']);
        Route::post('/token/refresh', [NextelecomSettingController::class, 'refreshToken']);
        Route::get('/token/status', [NextelecomSettingController::class, 'checkTokenStatus']);
        Route::delete('/token', [NextelecomSettingController::class, 'deleteToken']);
        Route::get('/email', [NextelecomSettingController::class, 'getEmailSettings']);
        Route::post('/email', [NextelecomSettingController::class, 'saveEmailSettings']);
        Route::get('/sms', [NextelecomSettingController::class, 'getSmsSettings']);
        Route::post('/sms', [NextelecomSettingController::class, 'saveSmsSettings']);
        Route::get('/auto-sms', [NextelecomSettingController::class, 'getAutoSmsSettings']);
        Route::post('/auto-sms', [NextelecomSettingController::class, 'saveAutoSmsSettings']);
    });

    Route::post('/otp/send', [OtpVerificationController::class, 'sendOtp']);
    Route::post('/otp/verify', [OtpVerificationController::class, 'verifyOtp']);
    Route::post('/otp/resend', [OtpVerificationController::class, 'resendOtp']);
    Route::post('/otp/check-status', [OtpVerificationController::class, 'checkVerificationStatus']);

    Route::post('/leads/capture', [LeadCaptureController::class, 'store']);
    Route::get('/leads', [LeadCaptureController::class, 'getLeads']);
    Route::get('/leads/{id}', [LeadCaptureController::class, 'show']);
    Route::put('/leads/{id}', [LeadCaptureController::class, 'update']);
    Route::delete('/leads/{id}', [LeadCaptureController::class, 'delete']);

    Route::get('/checklist-templates', [ChecklistController::class, 'index']);
    Route::post('/checklist-templates', [ChecklistController::class, 'store']);
    Route::put('/checklist-templates/{template}', [ChecklistController::class, 'update']);
    Route::delete('/checklist-templates/{template}', [ChecklistController::class, 'destroy']);

    Route::get('/checklist-assignments', [ChecklistController::class, 'getAssignments']);
    Route::post('/checklist-assignments', [ChecklistController::class, 'assignTemplate']);
    Route::delete('/checklist-assignments/{id}', [ChecklistController::class, 'destroyAssignment']);

    Route::get('/checklist-submissions', [ChecklistController::class, 'getSubmission']);
    Route::post('/checklist-submissions/answer', [ChecklistController::class, 'submitAnswer']);

    Route::get('/search', [GlobalSearchController::class, 'search']);

    Route::get('/test-log', function () {
        Log::info('Test log message');

        return 'Logged';
    });

    Route::post('/login', function (Request $request) {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        Log::info('Login attempt for: '.$credentials['email']);

        // Ensure admin user exists for testing if not already seeded
        if ($credentials['email'] === 'admin@assetflow.com' && ! User::where('email', 'admin@assetflow.com')->exists()) {
            User::create([
                'name' => 'Admin User',
                'email' => 'admin@assetflow.com',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'status' => 'active',
            ]);
            Log::info('Created missing admin@assetflow.com user');
        }

        $user = User::where('email', $credentials['email'])->first();

        if ($user && Hash::check($credentials['password'], $user->password)) {
            // Generate OTP
            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $user->otp_code = $otp;
            $user->otp_expires_at = now()->addMinutes(10);
            $user->save();

            // Configure Mailer from DB settings
            $tenantId = app('tenant.id') ?? null;
            $smtpConfigured = MailService::configureMailer($tenantId);

            // Send Email
            try {
                if (! $smtpConfigured) {
                    Log::warning('SMTP not configured, OTP email not sent', [
                        'user_id' => $user->id,
                        'tenant_id' => $tenantId,
                    ]);
                } else {
                    $recipientEmail = EmailModeService::getRecipients($user->email, $tenantId);

                    if (! $recipientEmail) {
                        Log::warning('Cannot send OTP - no email configured for test mode', [
                            'user_id' => $user->id,
                            'tenant_id' => $tenantId,
                        ]);
                    } else {
                        Mail::to($recipientEmail)->send(new OtpMail($otp));
                        Log::info('OTP sent to: '.$recipientEmail, [
                            'original_recipient' => $user->email,
                            'tenant_id' => $tenantId,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Failed to send OTP to '.$user->email.': '.$e->getMessage());
                // For testing purposes, we might want to still allow proceeding or log the OTP
                Log::info('TESTING OTP for '.$user->email.': '.$otp);
            }

            return response()->json([
                'requires_otp' => true,
                'email' => $user->email,
            ]);
        }

        Log::warning('Failed login attempt for: '.$credentials['email']);

        return response()->json(['message' => 'Invalid credentials'], 401);
    });

    Route::post('/login/verify-otp', function (Request $request) {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:6',
        ]);

        $user = User::where('email', $request->email)
            ->where('otp_code', $request->otp)
            ->where('otp_expires_at', '>', now())
            ->first();

        if ($user) {
            // Clear OTP
            $user->otp_code = null;
            $user->otp_expires_at = null;
            $user->save();

            // Log the user in (though we are using dummy tokens, this is where it would happen)
            Auth::login($user);

            Log::info('User logged in successfully via OTP: '.$user->email);

            return response()->json([
                'user' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role ?? 'User',
                    'avatar' => $user->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
                ],
                'token' => 'dummy-token-for-testing',
            ]);
        }

        return response()->json(['message' => 'Invalid or expired OTP'], 401);
    });

    Route::post('/logout', function (Request $request) {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out successfully']);
    });

    Route::get('/dashboard/stats', function (Request $request) {
        $tenantId = $request->query('tenant_id');

        $totalAssetsCount = Asset::when($tenantId, function ($query) use ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        })->count();

        $activeTenantsCount = Tenant::where('status', 'active')->count();

        $totalUsersCount = DirectoryUser::when($tenantId, function ($query) use ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        })->count();

        // If a specific tenant is selected, we might want to show the Graph-reported count if it's higher
        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
            if ($tenant && $tenant->usersCount > $totalUsersCount) {
                $totalUsersCount = $tenant->usersCount;
            }
        }

        $unlicensedUsersCount = DirectoryUser::when($tenantId, function ($query) use ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        })->where(function ($query) {
            $query->whereNull('license_name')
                ->orWhere('license_name', '')
                ->orWhere('license_name', 'No License');
        })->count();

        $licensedUsersCount = DirectoryUser::when($tenantId, function ($query) use ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        })->whereNotNull('license_name')
            ->where('license_name', '!=', '')
            ->where('license_name', '!=', 'No License')
            ->count();

        $activeUsersCount = DirectoryUser::when($tenantId, function ($query) use ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        })->where('account_enabled', true)->count();

        $inactiveUsersCount = DirectoryUser::when($tenantId, function ($query) use ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        })->where('account_enabled', false)->count();

        $lastSync = SyncLog::when($tenantId, function ($query) use ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        }, function ($query) {
            return $query;
        })->latest()->first();

        // Calculate growth data dynamically for the last 6 months
        $growthData = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $monthEnd = $month->copy()->endOfMonth();

            $assets = Asset::where('created_at', '<=', $monthEnd)
                ->when($tenantId, function ($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })->count();

            $users = DirectoryUser::where('created_at', '<=', $monthEnd)
                ->when($tenantId, function ($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })->count();

            $growthData[] = [
                'name' => $month->format('M'),
                'assets' => $assets,
                'users' => $users,
            ];
        }

        // Calculate changes compared to last month
        $startOfCurrentMonth = now()->startOfMonth();
        $assetsLastMonth = Asset::where('created_at', '<', $startOfCurrentMonth)
            ->when($tenantId, function ($query) use ($tenantId) {
                return $query->where('tenant_id', $tenantId);
            })->count();

        $usersLastMonth = DirectoryUser::where('created_at', '<', $startOfCurrentMonth)
            ->when($tenantId, function ($query) use ($tenantId) {
                return $query->where('tenant_id', $tenantId);
            })->count();

        $tenantsLastMonth = Tenant::where('created_at', '<', $startOfCurrentMonth)->count();

        $calculateChange = function ($current, $previous) {
            if ($previous == 0) {
                return $current > 0 ? ['value' => '+100%', 'type' => 'positive'] : ['value' => '0%', 'type' => 'neutral'];
            }
            $diff = (($current - $previous) / $previous) * 100;

            return [
                'value' => ($diff >= 0 ? '+' : '').number_format($diff, 1).'%',
                'type' => $diff > 0 ? 'positive' : ($diff < 0 ? 'negative' : 'neutral'),
            ];
        };

        $assetChange = $calculateChange($totalAssetsCount, $assetsLastMonth);
        $userChange = $calculateChange($totalUsersCount, $usersLastMonth);
        $tenantChange = [
            'value' => '+'.($activeTenantsCount - $tenantsLastMonth),
            'type' => ($activeTenantsCount - $tenantsLastMonth) > 0 ? 'positive' : 'neutral',
        ];

        // Get recent activities
        $recentAssets = Asset::latest()->take(3)->get()->map(function ($asset) {
            return [
                'id' => 'asset-'.$asset->id,
                'type' => 'asset',
                'title' => 'New asset registered',
                'description' => $asset->name.' added to inventory',
                'timestamp' => $asset->created_at,
                'time' => $asset->created_at->diffForHumans(),
                'color' => 'text-primary bg-primary/10',
            ];
        });

        $recentTenants = Tenant::latest()->take(3)->get()->map(function ($tenant) {
            return [
                'id' => 'tenant-'.$tenant->id,
                'type' => 'tenant',
                'title' => 'New tenant onboarded',
                'description' => $tenant->name.' joined the platform',
                'timestamp' => $tenant->created_at,
                'time' => $tenant->created_at->diffForHumans(),
                'color' => 'text-warning bg-warning/10',
            ];
        });

        $recentSyncs = SyncLog::latest()->take(3)->get()->map(function ($log) {
            return [
                'id' => 'sync-'.$log->id,
                'type' => 'sync',
                'title' => 'Directory sync completed',
                'description' => $log->records_synced.' records synchronized from '.$log->source,
                'timestamp' => $log->created_at,
                'time' => $log->created_at->diffForHumans(),
                'color' => 'text-success bg-success/10',
            ];
        });

        $activities = $recentAssets->concat($recentTenants)->concat($recentSyncs)->sortByDesc('timestamp')->values()->take(5);

        return response()->json([
            'totalAssets' => [
                'value' => number_format($totalAssetsCount),
                'change' => $assetChange['value'],
                'changeType' => $assetChange['type'],
            ],
            'activeTenants' => [
                'value' => (string) $activeTenantsCount,
                'change' => $tenantChange['value'],
                'changeType' => $tenantChange['type'],
            ],
            'totalUsers' => [
                'value' => number_format($totalUsersCount),
                'change' => $userChange['value'],
                'changeType' => $userChange['type'],
                'unlicensed' => $unlicensedUsersCount,
                'licensed' => $licensedUsersCount,
                'active' => $activeUsersCount,
                'inactive' => $inactiveUsersCount,
            ],
            'syncStatus' => [
                'value' => $lastSync ? ($lastSync->status === 'success' ? 'Healthy' : 'Issues') : 'Never',
                'change' => $lastSync ? 'Last sync: '.$lastSync->created_at->diffForHumans() : 'No sync logs',
                'changeType' => $lastSync && $lastSync->status === 'success' ? 'positive' : 'neutral',
            ],
            'growthData' => $growthData,
            'activities' => $activities,
        ]);
    });

    Route::get('/tenants', function () {
        $tenants = Tenant::withCount([
            'directoryUsers as total_users_count',
            'directoryUsers as unlicensed_users_count' => function ($query) {
                $query->whereNull('license_name')
                    ->orWhere('license_name', '')
                    ->orWhere('license_name', 'No License');
            },
            'directoryUsers as licensed_users_count' => function ($query) {
                $query->whereNotNull('license_name')
                    ->where('license_name', '!=', '')
                    ->where('license_name', '!=', 'No License');
            },
            'directoryUsers as active_users_count' => function ($query) {
                $query->where('account_enabled', true);
            },
            'directoryUsers as inactive_users_count' => function ($query) {
                $query->where('account_enabled', false);
            },
            'assets as assigned_assets_count' => function ($query) {
                $query->where('status', 'assigned');
            },
        ])->get();

        // Ensure total_users_count reflects the Graph count if it's higher
        $tenants = $tenants->map(function ($tenant) {
            if ($tenant->usersCount > $tenant->total_users_count) {
                $tenant->total_users_count = $tenant->usersCount;
            }

            return $tenant;
        });

        return response()->json($tenants);
    });

    Route::get('/tenants/user-photo', function (Request $request) {
        $userId = $request->query('user_id');
        $tenantId = $request->query('tenant_id');
        $name = $request->query('name');

        if (! $userId || ! $tenantId) {
            return redirect('https://ui-avatars.com/api/?name='.urlencode($name).'&background=random');
        }

        // Check if we have the photo locally
        $path = "public/photos/{$tenantId}/{$userId}.jpg";

        if (Storage::exists($path)) {
            return response(Storage::get($path))
                ->header('Content-Type', 'image/jpeg')
                ->header('Cache-Control', 'public, max-age=604800') // 1 week cache
                ->header('Expires', gmdate('D, d M Y H:i:s T', time() + 604800));
        }

        // If not, dispatch job to fetch it
        // We check tenant existence briefly to avoid queueing for invalid tenant IDs
        // but actual fetching happens in the job
        $tenant = Tenant::where('azure_tenant_id', $tenantId)->first();
        if ($tenant && $tenant->client_id && $tenant->client_secret) {
            FetchUserPhoto::dispatch($tenantId, $userId);
        }

        // Return default avatar immediately
        return redirect('https://ui-avatars.com/api/?name='.urlencode($name).'&background=random');
    });

    Route::get('/tenants/{id}', function ($id) {
        $tenant = Tenant::findOrFail($id);

        return response()->json($tenant);
    });

    Route::get('/tenants/{id}/users', function ($id) {
        $tenant = Tenant::findOrFail($id);

        // Step 1: Return cached users immediately
        $users = DirectoryUser::where('tenant_id', $tenant->id)->get();

        // Step 2: Trigger background sync if needed (e.g. if we have credentials)
        if ($tenant->fetch_from_graph && $tenant->azure_tenant_id && $tenant->client_id) {
            SyncTenantDirectory::dispatch($tenant->id);
        }

        // Return live data if requested or fallback to cached
        // Actually, the frontend calls this to get LIVE data
        try {
            $graphService = new MicrosoftGraphService($tenant->azure_tenant_id, $tenant->client_id, $tenant->client_secret);
            $liveUsers = $graphService->getAllUsers();
            if (! empty($liveUsers)) {
                return response()->json($liveUsers);
            }
        } catch (\Exception $e) {
            Log::error('Live sync failed: '.$e->getMessage());
        }

        return response()->json($users);
    });

    Route::get('/assets', function () {
        return response()->json([
            ['id' => '1', 'name' => 'MacBook Pro 16"', 'type' => 'Laptop', 'status' => 'active', 'location' => 'Office A', 'assignedTo' => 'John Doe', 'serialNumber' => 'MBP-2024-001'],
            ['id' => '2', 'name' => 'Dell Monitor 27"', 'type' => 'Monitor', 'status' => 'active', 'location' => 'Office A', 'assignedTo' => 'Jane Smith', 'serialNumber' => 'DM-2024-002'],
            ['id' => '3', 'name' => 'iPhone 15 Pro', 'type' => 'Mobile', 'status' => 'active', 'location' => 'Remote', 'assignedTo' => 'Mike Johnson', 'serialNumber' => 'IP-2024-003'],
            ['id' => '4', 'name' => 'Logitech MX Master', 'type' => 'Peripheral', 'status' => 'inactive', 'location' => 'Storage', 'assignedTo' => 'Unassigned', 'serialNumber' => 'LMX-2024-004'],
            ['id' => '5', 'name' => 'HP LaserJet Pro', 'type' => 'Printer', 'status' => 'maintenance', 'location' => 'Office B', 'assignedTo' => 'IT Dept', 'serialNumber' => 'HP-2024-005'],
            ['id' => '6', 'name' => 'ThinkPad X1 Carbon', 'type' => 'Laptop', 'status' => 'active', 'location' => 'Remote', 'assignedTo' => 'Sarah Wilson', 'serialNumber' => 'TP-2024-006'],
        ]);
    });

    Route::get('/assets/{id}', function ($id) {
        $dbAsset = Asset::with('documents')->find($id);

        if ($dbAsset) {
            $dbAsset = $dbAsset->fresh(['documents', 'assignedUsers.tenant']);

            $documents = $dbAsset->documents->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'url' => Storage::url($doc->file_path),
                    'type' => $doc->file_type,
                    'size' => $doc->file_size,
                    'date' => $doc->created_at->format('Y-m-d'),
                ];
            })->toArray();

            // Add the initial document if it exists
            if ($dbAsset->file_path) {
                array_unshift($documents, [
                    'id' => 'initial',
                    'name' => 'Initial Document',
                    'url' => Storage::url($dbAsset->file_path),
                    'type' => pathinfo($dbAsset->file_path, PATHINFO_EXTENSION),
                    'size' => Storage::disk('public')->exists($dbAsset->file_path) ? Storage::disk('public')->size($dbAsset->file_path) : null,
                    'date' => $dbAsset->created_at->format('Y-m-d'),
                ]);
            }

            // Map DB fields to frontend expected fields
            return response()->json([
                'id' => $dbAsset->id,
                'tenant_id' => $dbAsset->tenant_id,
                'name' => $dbAsset->name,
                'type' => $dbAsset->type,
                'status' => $dbAsset->status,
                'serialNumber' => $dbAsset->serial_number,
                'location' => $dbAsset->location,
                'assignedTo' => $dbAsset->assignedto ?? 'Unassigned',
                'assignedUsers' => $dbAsset->assignedUsers->map(function ($u) {
                    return [
                        'id' => $u->id,
                        'name' => $u->name,
                        'email' => $u->email,
                        'phone' => $u->phone,
                        'mobile_phone' => $u->mobile_phone,
                        'license_name' => $u->license_name,
                        'department' => $u->department,
                    ];
                }),
                'purchaseDate' => $dbAsset->created_at->format('Y-m-d'),
                'warrantyUntil' => $dbAsset->warranty_expiry ? $dbAsset->warranty_expiry->format('Y-m-d') : '',
                'cost' => $dbAsset->cost,
                'description' => $dbAsset->description ?? '',
                'ram' => $dbAsset->ram,
                'graphics_card' => $dbAsset->graphics_card,
                'processor' => $dbAsset->processor,
                'keyboard_details' => $dbAsset->keyboard_details,
                'mouse_details' => $dbAsset->mouse_details,
                'documents' => $documents,
                'history' => $dbAsset->activities->map(function ($activity) {
                    return [
                        'id' => $activity->id,
                        'action' => $activity->action,
                        'description' => $activity->description,
                        'user' => $activity->user_name ?? ($activity->user->name ?? 'System'),
                        'date' => $activity->created_at->diffForHumans(),
                    ];
                }),
            ]);
        }

        $assets = [
            ['id' => '1', 'tenant_id' => '00000000-0000-0000-0000-000000000000', 'name' => 'MacBook Pro 16"', 'type' => 'Laptop', 'status' => 'active', 'location' => 'Office A', 'assignedTo' => 'John Doe', 'serialNumber' => 'MBP-2024-001', 'purchaseDate' => '2023-11-15', 'warrantyUntil' => '2025-11-15', 'description' => 'M3 Max, 64GB RAM, 2TB SSD', 'specs' => ['Processor' => 'M3 Max', 'Memory' => '64GB', 'Storage' => '2TB SSD'], 'history' => [['id' => 1, 'action' => 'Smart -Tech', 'user' => 'Admin', 'date' => '2023-11-15']]],
            ['id' => '2', 'tenant_id' => '00000000-0000-0000-0000-000000000000', 'name' => 'Dell Monitor 27"', 'type' => 'Monitor', 'status' => 'active', 'location' => 'Office A', 'assignedTo' => 'Jane Smith', 'serialNumber' => 'DM-2024-002', 'purchaseDate' => '2023-10-20', 'warrantyUntil' => '2026-10-20', 'description' => '4K UHD UltraSharp', 'specs' => ['Resolution' => '4K', 'Size' => '27 inch'], 'history' => [['id' => 1, 'action' => 'Smart -Tech', 'user' => 'Admin', 'date' => '2023-10-20']]],
            ['id' => '3', 'tenant_id' => '00000000-0000-0000-0000-000000000000', 'name' => 'iPhone 15 Pro', 'type' => 'Mobile', 'status' => 'active', 'location' => 'Remote', 'assignedTo' => 'Mike Johnson', 'serialNumber' => 'IP-2024-003', 'purchaseDate' => '2024-01-05', 'warrantyUntil' => '2025-01-05', 'description' => 'Titanium, 256GB', 'specs' => ['Model' => '15 Pro', 'Storage' => '256GB'], 'history' => [['id' => 1, 'action' => 'Smart -Tech', 'user' => 'Admin', 'date' => '2024-01-05']]],
        ];

        foreach ($assets as $asset) {
            if ($asset['id'] == $id) {
                return response()->json($asset);
            }
        }

        return response()->json(['message' => 'Asset not found'], 404);
    });

    Route::put('/assets/{id}', function (Request $request, $id) {
        $asset = Asset::findOrFail($id);
        $oldStatus = $asset->status;
        $oldType = $asset->type;

        $validated = $request->validate([
            'name' => 'required|string',
            'type' => 'required|string',
            'serial_number' => 'nullable|string',
            'status' => 'required|string',
            'description' => 'nullable|string',
            'warranty_expiry' => 'nullable|date',
            'cost' => 'nullable|numeric',
            'ram' => 'nullable|string',
            'graphics_card' => 'nullable|string',
            'processor' => 'nullable|string',
            'keyboard_details' => 'nullable|string',
            'mouse_details' => 'nullable|string',
        ]);

        $asset->update($validated);

        if ($oldStatus !== $asset->status || $oldType !== $asset->type) {
            $changes = [];
            if ($oldStatus !== $asset->status) {
                $changes[] = "status changed from {$oldStatus} to {$asset->status}";
            }
            if ($oldType !== $asset->type) {
                $changes[] = "type changed from {$oldType} to {$asset->type}";
            }

            AssetActivity::create([
                'asset_id' => $asset->id,
                'action' => 'Asset updated',
                'user_name' => Auth::user()?->name ?? 'System',
                'user_id' => Auth::id(),
                'description' => ucfirst(implode(' and ', $changes)),
            ]);
        } else {
            AssetActivity::create([
                'asset_id' => $asset->id,
                'action' => 'Asset updated',
                'user_name' => Auth::user()?->name ?? 'System',
                'user_id' => Auth::id(),
                'description' => 'Asset information updated.',
            ]);
        }

        return response()->json($asset);
    });

    Route::post('/assets/{id}/documents', function (Request $request, $id) {
        $asset = Asset::findOrFail($id);

        $validated = $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'name' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $filePath = $file->store('assets/documents', 'public');

        $document = AssetDocument::create([
            'asset_id' => $asset->id,
            'name' => $validated['name'] ?? $file->getClientOriginalName(),
            'file_path' => $filePath,
            'file_type' => $file->getClientOriginalExtension(),
            'file_size' => $file->getSize(),
        ]);

        AssetActivity::create([
            'asset_id' => $asset->id,
            'action' => 'Document uploaded',
            'user_name' => Auth::user()?->name ?? 'System',
            'user_id' => Auth::id(),
            'description' => "Uploaded document: {$document->name}",
        ]);

        return response()->json([
            'id' => $document->id,
            'name' => $document->name,
            'url' => Storage::url($document->file_path),
            'type' => $document->file_type,
            'size' => $document->file_size,
            'date' => $document->created_at->format('Y-m-d'),
        ], 201);
    });

    Route::post('/tenants', function (Request $request) {
        Log::info('Tenant creation request:', $request->all());

        $data = $request->all();

        // Fallback for cases where request is malformed but contains data in keys
        if (! $request->has('name')) {
            foreach ($data as $key => $value) {
                if (str_contains($key, 'name')) {
                    $decoded = json_decode('{'.$key.(is_null($value) ? '' : ':'.$value).'}', true);
                    if ($decoded && isset($decoded['name'])) {
                        $request->merge($decoded);
                        break;
                    }
                }
            }
        }

        if (! $request->input('name') && ! $request->input('azure_tenant_id')) {
            return response()->json(['error' => 'Name or Azure Tenant ID is required', 'received' => $request->all()], 422);
        }

        $name = $request->input('name');
        $domain = $request->input('domain');
        $licenseName = $request->input('license_name');
        $licenseCount = (int) $request->input('license_count', 0);
        $usersCount = 0;
        $assetsCount = 0;

        $isManual = $request->has('is_manual') ? filter_var($request->input('is_manual'), FILTER_VALIDATE_BOOLEAN) : true;
        $fetchFromGraph = filter_var($request->input('fetch_from_graph'), FILTER_VALIDATE_BOOLEAN);
        $tenantId = $request->input('azure_tenant_id');
        $clientId = $request->input('client_id');
        $clientSecret = $request->input('client_secret');

        if ($tenantId && $clientId && $clientSecret && $fetchFromGraph) {
            try {
                $graphService = new MicrosoftGraphService($tenantId, $clientId, $clientSecret);
                $details = $graphService->getAllDetails();

                if ($details['name']) {
                    // If it's not manual, we prioritize Graph data
                    if (! $isManual) {
                        $name = $details['name'];
                        $domain = $details['domain'] ?? $domain;
                    } else {
                        $name = $name ?: $details['name'];
                        $domain = $domain ?: $details['domain'];
                    }

                    $licenseName = $licenseName ?: $details['license_name'];
                    $licenseCount = $licenseCount ?: $details['license_count'];
                    $usersCount = $details['users_count'];
                    $assetsCount = $details['assets_count'];
                }
            } catch (\Exception $e) {
                Log::error('Failed to fetch from Graph API during creation: '.$e->getMessage());
            }
        }

        if (! $name && $tenantId) {
            $name = 'Tenant '.substr($tenantId, 0, 8);
        }

        $tenant = Tenant::create([
            'name' => $name,
            'domain' => $domain,
            'status' => 'active',
            'is_manual' => $isManual,
            'fetch_from_graph' => $fetchFromGraph,
            'auto_directory_sync' => filter_var($request->input('auto_directory_sync'), FILTER_VALIDATE_BOOLEAN),
            'redirect_url' => $request->input('redirect_url'),
            'azure_tenant_id' => $tenantId,
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'description' => $request->input('description'),
            'license_name' => $licenseName,
            'license_count' => $licenseCount,
            'usersCount' => $usersCount,
            'assetsCount' => $assetsCount,
        ]);

        if ($tenant->fetch_from_graph) {
            // Run sync in background
            SyncTenantDirectory::dispatch($tenant->id);
        }

        return response()->json($tenant, 201);
    });

    Route::put('/tenants/{id}', function (Request $request, $id) {
        $tenant = Tenant::findOrFail($id);

        $updateData = [
            'name' => $request->input('name', $tenant->name),
            'domain' => $request->input('domain', $tenant->domain),
            'status' => $request->input('status', $tenant->status),
            'is_manual' => $request->has('is_manual') ? filter_var($request->input('is_manual'), FILTER_VALIDATE_BOOLEAN) : $tenant->is_manual,
            'fetch_from_graph' => $request->has('fetch_from_graph') ? filter_var($request->input('fetch_from_graph'), FILTER_VALIDATE_BOOLEAN) : $tenant->fetch_from_graph,
            'auto_directory_sync' => $request->has('auto_directory_sync') ? filter_var($request->input('auto_directory_sync'), FILTER_VALIDATE_BOOLEAN) : $tenant->auto_directory_sync,
            'redirect_url' => $request->input('redirect_url', $tenant->redirect_url),
            'azure_tenant_id' => $request->input('azure_tenant_id', $tenant->azure_tenant_id),
            'client_id' => $request->input('client_id', $tenant->client_id),
            'client_secret' => $request->input('client_secret', $tenant->client_secret),
            'description' => $request->input('description', $tenant->description),
            'license_name' => $request->input('license_name', $tenant->license_name),
            'license_count' => $request->has('license_count') ? (int) $request->input('license_count') : $tenant->license_count,
        ];

        if ($updateData['fetch_from_graph'] && $updateData['azure_tenant_id'] && $updateData['client_id'] && $updateData['client_secret']) {
            // Fetch fresh data if "refresh" is passed, if credentials changed, or if it was manual before
            if ($request->has('refresh') ||
                $tenant->azure_tenant_id !== $updateData['azure_tenant_id'] ||
                $tenant->client_id !== $updateData['client_id'] ||
                $tenant->client_secret !== $updateData['client_secret'] ||
                $tenant->is_manual) {

                try {
                    $graphService = new MicrosoftGraphService($updateData['azure_tenant_id'], $updateData['client_id'], $updateData['client_secret']);
                    $details = $graphService->getAllDetails();

                    if ($details['name']) {
                        $updateData['name'] = $request->input('name') ?: $details['name'];
                        $updateData['domain'] = $request->input('domain') ?: $details['domain'];
                        $updateData['license_name'] = $request->input('license_name') ?: $details['license_name'];
                        $updateData['license_count'] = (int) $request->input('license_count') ?: $details['license_count'];
                        $updateData['usersCount'] = $details['users_count'];
                        $updateData['assetsCount'] = $details['assets_count'];
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to update from Graph API: '.$e->getMessage());
                }
            }
        }

        $tenant->update($updateData);

        if ($tenant->auto_directory_sync && $tenant->fetch_from_graph) {
            SyncTenantDirectory::dispatch($tenant->id);
        }

        return response()->json($tenant);
    });

    Route::delete('/tenants/{id}', function ($id) {
        Tenant::destroy($id);

        return response()->json(null, 204);
    });

    Route::get('/roles', function () {
        return response()->json(Role::with('permissions')->get());
    });

    Route::post('/roles', function (Request $request) {
        $request->validate([
            'name' => 'required|unique:roles',
            'description' => 'nullable',
        ]);

        $role = Role::create([
            'name' => $request->name,
            'slug' => strtolower(str_replace(' ', '-', $request->name)),
            'description' => $request->description,
        ]);

        // Create default permissions for all menus
        $menus = ['dashboard', 'assets', 'tenants', 'users', 'checklists', 'settings'];
        foreach ($menus as $menu) {
            RolePermission::create([
                'role_id' => $role->id,
                'menu' => $menu,
                'can_view' => false,
                'can_add' => false,
                'can_edit' => false,
                'can_delete' => false,
            ]);
        }

        return response()->json($role->load('permissions'), 201);
    });

    Route::put('/roles/{id}', function (Request $request, $id) {
        $role = Role::findOrFail($id);
        $role->update($request->only(['name', 'description']));

        if ($request->has('permissions')) {
            foreach ($request->permissions as $permData) {
                RolePermission::where('role_id', $role->id)
                    ->where('menu', $permData['menu'])
                    ->update([
                        'can_view' => $permData['can_view'],
                        'can_add' => $permData['can_add'],
                        'can_edit' => $permData['can_edit'],
                        'can_delete' => $permData['can_delete'],
                    ]);
            }
        }

        return response()->json($role->load('permissions'));
    });

    Route::delete('/roles/{id}', function ($id) {
        $role = Role::findOrFail($id);
        if (in_array($role->slug, ['admin'])) {
            return response()->json(['message' => 'Cannot delete admin role'], 403);
        }
        $role->delete();

        return response()->json(null, 204);
    });

    Route::get('/users', function (Request $request) {
        $query = User::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->get();
        $emails = $users->pluck('email')->map(fn ($e) => strtolower($e))->toArray();

        // Fetch all directory users with their assets and tenants to ensure we can match case-insensitively in PHP
        $directoryUsersGrouped = DirectoryUser::with(['assets', 'tenant'])
            ->get()
            ->filter(fn ($du) => in_array(strtolower($du->email), $emails))
            ->groupBy(fn ($du) => strtolower($du->email));

        return response()->json($users->map(function ($user) use ($directoryUsersGrouped) {
            $userEmailLower = strtolower($user->email);
            $directoryUsers = $directoryUsersGrouped->get($userEmailLower, collect());

            $tenants = $directoryUsers->map(fn ($du) => $du->tenant?->name)->filter()->unique()->values()->implode(', ');
            $licenses = $directoryUsers->map(fn ($du) => $du->license_name)->filter()->unique()->values()->implode(', ');

            $allAssets = [];
            foreach ($directoryUsers as $du) {
                foreach ($du->assets as $asset) {
                    $allAssets[] = "{$asset->name} ({$asset->type})";
                }
            }
            $assetDetails = implode(', ', array_unique($allAssets));

            return [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? 'Not provided',
                'role' => $user->role ?? 'user',
                'status' => $user->status ?? 'active',
                'lastActive' => 'Now',
                'avatar' => $user->avatar ?? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
                'tenant' => $tenants ?: '-',
                'license' => $licenses ?: '-',
                'asset_details' => $assetDetails ?: '-',
            ];
        }));
    });

    Route::post('/users', function (Request $request) {
        Log::info('POST /users hit', ['email' => $request->email]);
        $validator = Validator::make($request->all(), [
            'name' => 'required',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8',
            'role' => 'sometimes|string',
            'status' => 'sometimes|string',
            'phone' => 'sometimes|nullable|string',
        ]);

        if ($validator->fails()) {
            Log::warning('User creation validation failed', [
                'errors' => $validator->errors()->toArray(),
                'input' => $request->except(['password']),
            ]);

            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $roleSlug = $request->role ?? 'user';
        $role = Role::where('slug', $roleSlug)->first();

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $roleSlug,
            'role_id' => $role ? $role->id : null,
            'status' => $request->status ?? 'active',
            'phone' => $request->phone,
            'avatar' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        ]);

        NotificationService::sendUserCredentialsNotification($user, $request->password);

        return response()->json($user, 201);
    });

    Route::put('/users/{id}', function (Request $request, $id) {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required',
            'email' => 'sometimes|required|email|unique:users,email,'.$id,
            'password' => 'sometimes|required|min:8',
            'role' => 'sometimes|string',
            'status' => 'sometimes|string',
            'phone' => 'sometimes|nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user->update($request->only(['name', 'email', 'role', 'status', 'phone']));

        if ($request->has('role')) {
            $role = Role::where('slug', $request->role)->first();
            if ($role) {
                $user->role_id = $role->id;
                $user->save();
            }
        }

        if ($request->has('password')) {
            $user->update(['password' => Hash::make($request->password)]);
        }

        return response()->json($user);
    });

    Route::delete('/users/{id}', function ($id) {
        User::destroy($id);

        return response()->json(null, 204);
    });

    Route::get('/sync/stats', function () {
        $lastSync = SyncLog::orderBy('created_at', 'desc')->first();
        $totalSynced = SyncLog::sum('records_synced');

        return response()->json([
            'totalSynced' => number_format($totalSynced),
            'lastSync' => $lastSync ? $lastSync->created_at->diffForHumans() : 'Never',
            'syncRate' => '98.5%', // Mock value
            'isConnected' => true,
        ]);
    });

    Route::get('/sync/logs', function () {
        return response()->json(SyncLog::orderBy('created_at', 'desc')->take(10)->get()->map(function ($log) {
            return [
                'id' => (string) $log->id,
                'timestamp' => $log->created_at->format('Y-m-d H:i:s'),
                'status' => $log->status,
                'recordsSynced' => $log->records_synced,
                'duration' => $log->duration,
                'source' => $log->source,
            ];
        }));
    });

    Route::post('/sync/run', function () {
        Log::info('Sync triggered manually');

        // Simulate a sync process
        $duration = rand(60, 180); // seconds
        $recordsSynced = rand(100, 300);

        $log = SyncLog::create([
            'status' => 'success',
            'records_synced' => $recordsSynced,
            'duration' => floor($duration / 60).'m '.($duration % 60).'s',
            'source' => 'Azure AD',
        ]);

        return response()->json($log);
    });

    Route::get('/sync/settings', function () {
        $settings = SyncSetting::all()->pluck('value', 'key');

        return response()->json([
            'autoSyncEnabled' => filter_var($settings->get('auto_sync_enabled', 'true'), FILTER_VALIDATE_BOOLEAN),
            'syncInterval' => $settings->get('sync_interval', '1'),
            'inactiveCheckTime' => $settings->get('inactive_check_time', '00:00'),
            'fetchFromGraph' => filter_var($settings->get('fetch_from_graph', 'true'), FILTER_VALIDATE_BOOLEAN),
        ]);
    });

    Route::post('/sync/settings', function (Request $request) {
        $settings = $request->only(['autoSyncEnabled', 'syncInterval', 'inactiveCheckTime', 'fetchFromGraph']);

        foreach ($settings as $key => $value) {
            SyncSetting::updateOrCreate(
                ['key' => Str::snake($key)],
                ['value' => is_bool($value) ? ($value ? 'true' : 'false') : $value]
            );
        }

        return response()->json(['message' => 'Settings updated successfully']);
    });

    Route::post('/tenants/{id}/sync-directory', function ($id) {
        $tenant = Tenant::findOrFail($id);

        if (! $tenant->fetch_from_graph || ! $tenant->azure_tenant_id || ! $tenant->client_id || ! $tenant->client_secret) {
            return response()->json(['error' => 'Graph API not enabled'], 400);
        }

        try {
            // Enable auto-sync if it's not already enabled, as per user requirement
            if (! $tenant->auto_directory_sync) {
                $tenant->update(['auto_directory_sync' => true]);
            }

            SyncTenantDirectory::dispatch($tenant->id);

            return response()->json(['message' => 'Directory sync started in background', 'auto_sync' => true]);
        } catch (\Exception $e) {
            Log::error('Directory sync error: '.$e->getMessage());

            return response()->json(['error' => 'Sync failed: '.$e->getMessage()], 500);
        }
    });

    Route::post('/tenants/{id}/auto-sync', function (Request $request, $id) {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'auto_directory_sync' => 'required|boolean',
        ]);

        $tenant->update($validated);

        // If enabled, trigger a sync immediately
        if ($tenant->auto_directory_sync && $tenant->fetch_from_graph) {
            SyncTenantDirectory::dispatch($tenant->id);
        }

        return response()->json([
            'message' => 'Auto-sync '.($validated['auto_directory_sync'] ? 'enabled' : 'disabled'),
            'auto_directory_sync' => $validated['auto_directory_sync'],
            'last_sync_at' => $tenant->last_sync_at,
        ]);
    });

    Route::get('/tenants/{id}/directory-users', function ($id, \App\Services\ChecklistService $checklistService) {
        $tenant = Tenant::findOrFail($id);

        $users = DirectoryUser::where('tenant_id', $tenant->id)
            ->with([
                'assets',
                'checklistSubmissions.assignment.template.questions',
                'checklistSubmissions.answers',
            ])
            ->get();

        // Ensure submissions exist for each user before calculating counts
        foreach ($users as $user) {
            $checklistService->ensureSubmissions($user);
        }

        // Refresh relations if they were updated by ensureSubmissions
        $users->load([
            'checklistSubmissions.assignment.template.questions',
            'checklistSubmissions.answers',
        ]);

        return response()->json($users->map(function ($user) use ($checklistService) {
            $counts = $checklistService->getQuestionCounts($user);

            // Explicitly cast to array to ensure all dynamic properties are included in JSON
            $userData = $user->toArray();

            return array_merge($userData, $counts);
        }));
    });

    Route::post('/tenants/{id}/assets', function (Request $request, $id) {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string',
            'type' => 'required|string',
            'serial_number' => 'nullable|string',
            'warranty_expiry' => 'nullable|date',
            'license_expiry' => 'nullable|date',
            'description' => 'nullable|string',
            'cost' => 'nullable|numeric',
            'purchased_type' => 'nullable|string',
            'file' => 'nullable|file|max:10240', // 10MB max
            'ram' => 'nullable|string',
            'graphics_card' => 'nullable|string',
            'processor' => 'nullable|string',
            'keyboard_details' => 'nullable|string',
            'mouse_details' => 'nullable|string',
        ]);

        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('assets', 'public');
        }

        $asset = Asset::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'serial_number' => $validated['serial_number'] ?? null,
            'warranty_expiry' => $validated['warranty_expiry'] ?? null,
            'license_expiry' => $validated['license_expiry'] ?? null,
            'description' => $validated['description'] ?? null,
            'cost' => $validated['cost'] ?? null,
            'purchased_type' => $validated['purchased_type'] ?? null,
            'file_path' => $filePath,
            'status' => 'available',
            'ram' => $validated['ram'] ?? null,
            'graphics_card' => $validated['graphics_card'] ?? null,
            'processor' => $validated['processor'] ?? null,
            'keyboard_details' => $validated['keyboard_details'] ?? null,
            'mouse_details' => $validated['mouse_details'] ?? null,
        ]);

        AssetActivity::create([
            'asset_id' => $asset->id,
            'action' => 'Asset created',
            'user_name' => Auth::user()?->name ?? 'System',
            'user_id' => Auth::id(),
            'description' => 'Initial registration of the asset.',
        ]);

        return response()->json($asset, 201);
    });

    Route::get('/tenants/{id}/assets', function ($id, \App\Services\ChecklistService $checklistService) {
        $tenant = Tenant::findOrFail($id);

        $assets = Asset::where('tenant_id', $tenant->id)
            ->with([
                'assignedUsers.tenant',
                'assignedUsers.checklistSubmissions.assignment.template.questions',
                'assignedUsers.checklistSubmissions.answers',
            ])
            ->get();

        foreach ($assets as $asset) {
            foreach ($asset->assignedUsers as $user) {
                $checklistService->ensureSubmissions($user);

                // Re-load relations for the user after ensureSubmissions
                $user->load([
                    'checklistSubmissions.assignment.template.questions',
                    'checklistSubmissions.answers',
                ]);

                $counts = $checklistService->getQuestionCounts($user);

                // Flatten for API response
                foreach ($counts as $key => $value) {
                    $user->$key = $value;
                }

                // Cleanup relations to keep payload small
                unset($user->checklistSubmissions);
            }
        }

        return response()->json($assets);
    });

    Route::delete('/tenants/{tenantId}/assets/{assetId}', function ($tenantId, $assetId) {
        $tenant = Tenant::findOrFail($tenantId);
        $asset = Asset::where('tenant_id', $tenant->id)->findOrFail($assetId);

        // Delete associated assignments first
        AssetAssignment::where('asset_id', $asset->id)->delete();

        $asset->delete();

        return response()->json(null, 204);
    });

    Route::post('/tenants/{id}/assign-asset', function (Request $request, $id) {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:directory_users,id',
            'asset_id' => 'required|uuid|exists:assets,id',
        ]);

        $user = DirectoryUser::where('tenant_id', $tenant->id)->findOrFail($validated['user_id']);
        $asset = Asset::where('tenant_id', $tenant->id)->findOrFail($validated['asset_id']);

        // Unassign any current users first
        AssetAssignment::where('asset_id', $asset->id)
            ->whereNull('unassigned_at')
            ->update(['unassigned_at' => now()]);

        $assignment = AssetAssignment::create([
            'asset_id' => $asset->id,
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'assigned_at' => now(),
        ]);

        // Update asset status
        $asset->update(['status' => 'assigned']);

        AssetActivity::create([
            'asset_id' => $asset->id,
            'action' => 'Asset assigned',
            'user_name' => Auth::user()?->name ?? 'System',
            'user_id' => Auth::id(),
            'description' => "Assigned to {$user->name}",
        ]);

        NotificationService::sendAssetAssignedNotification($user, $asset);

        return response()->json($assignment, 201);
    });

    Route::get('/directory-users/{id}/assets', function ($id, \App\Services\ChecklistService $checklistService) {
        $user = DirectoryUser::with([
            'assets.assignedUsers.tenant',
            'checklistSubmissions.assignment.template.questions',
            'checklistSubmissions.answers',
        ])->findOrFail($id);

        $checklistService->ensureSubmissions($user);
        $user->load([
            'checklistSubmissions.assignment.template.questions',
            'checklistSubmissions.answers',
        ]);

        $counts = $checklistService->getQuestionCounts($user);
        $userData = array_merge($user->toArray(), $counts);

        return response()->json([
            'user' => $userData,
            'assigned_assets' => $user->assets,
            'm365_license' => $user->license_name,
        ]);
    });

    Route::post('/directory-users/{id}/sync', function ($id) {
        $user = DirectoryUser::findOrFail($id);
        $tenant = Tenant::findOrFail($user->tenant_id);

        if (! $tenant->azure_tenant_id || ! $tenant->client_id || ! $tenant->client_secret || ! $user->azure_id) {
            return response()->json(['error' => 'Graph API not configured for this user'], 400);
        }

        try {
            $graphService = new MicrosoftGraphService($tenant->azure_tenant_id, $tenant->client_id, $tenant->client_secret);
            $graphUser = $graphService->getUser($user->azure_id);

            if ($graphUser) {
                $user->update([
                    'name' => $graphUser['name'],
                    'email' => $graphUser['email'],
                    'phone' => $graphUser['phone'] ?? null,
                    'mobile_phone' => $graphUser['mobile_phone'] ?? null,
                    'department' => $graphUser['department'] ?? null,
                    'office_location' => $graphUser['office_location'] ?? null,
                    'job_title' => $graphUser['job_title'] ?? null,
                    'license_name' => $graphUser['license_name'] ?? 'No License',
                    'account_enabled' => $graphUser['status'] === 'active' ? true : false,
                    'profile_pic_url' => $graphUser['avatar'] ?? null,
                ]);

                return response()->json(['message' => 'User synced successfully', 'user' => $user]);
            }

            return response()->json(['error' => 'User not found in Graph API'], 404);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    });

    Route::get('/directory-users/{userId}/activity', function ($userId) {
        $user = DirectoryUser::findOrFail($userId);
        $tenant = Tenant::findOrFail($user->tenant_id);

        if (! $tenant->azure_tenant_id || ! $tenant->client_id || ! $tenant->client_secret || ! $user->azure_id) {
            return response()->json([
                'activity' => [],
                'app_access' => [],
                'signals' => [
                    'mfa_enabled' => false,
                    'is_compliant' => false,
                    'risk_level' => 'hidden',
                    'risk_score' => $user->azure_id ? 0 : 10.0, // Give perfect score if no ID to hide error
                ],
            ]);
        }

        $graphService = new MicrosoftGraphService($tenant->azure_tenant_id, $tenant->client_id, $tenant->client_secret);

        // Use the cached batch method for performance
        return response()->json($graphService->getUserFullProfileCached($user->azure_id));
    });

    Route::post('/tenants/{id}/quick-assign', function (Request $request, $id) {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:directory_users,id',
            'name' => 'required|string',
            'type' => 'required|string',
            'serial_number' => 'nullable|string',
            'warranty_expiry' => 'nullable|date',
            'license_expiry' => 'nullable|date',
            'description' => 'nullable|string',
            'cost' => 'nullable|numeric',
            'purchased_type' => 'nullable|string',
            'ram' => 'nullable|string',
            'graphics_card' => 'nullable|string',
            'processor' => 'nullable|string',
            'keyboard_details' => 'nullable|string',
            'mouse_details' => 'nullable|string',
        ]);

        // 1. Create the asset
        $asset = Asset::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'serial_number' => $validated['serial_number'] ?? null,
            'warranty_expiry' => $validated['warranty_expiry'] ?? null,
            'license_expiry' => $validated['license_expiry'] ?? null,
            'description' => $validated['description'] ?? null,
            'cost' => $validated['cost'] ?? null,
            'purchased_type' => $validated['purchased_type'] ?? null,
            'status' => 'assigned',
            'ram' => $validated['ram'] ?? null,
            'graphics_card' => $validated['graphics_card'] ?? null,
            'processor' => $validated['processor'] ?? null,
            'keyboard_details' => $validated['keyboard_details'] ?? null,
            'mouse_details' => $validated['mouse_details'] ?? null,
        ]);

        // 2. Assign it
        AssetAssignment::create([
            'asset_id' => $asset->id,
            'user_id' => $validated['user_id'],
            'tenant_id' => $tenant->id,
            'assigned_at' => now(),
        ]);

        $assignedUser = DirectoryUser::find($validated['user_id']);

        AssetActivity::create([
            'asset_id' => $asset->id,
            'action' => 'Asset created & assigned',
            'user_name' => Auth::user()?->name ?? 'System',
            'user_id' => Auth::id(),
            'description' => "Asset created and immediately assigned to {$assignedUser->name}",
        ]);

        NotificationService::sendAssetAssignedNotification($assignedUser, $asset);

        return response()->json($asset, 201);
    });

    Route::post('/tenants/{id}/transfer-asset', function (Request $request, $id) {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'asset_id' => 'required|uuid|exists:assets,id',
            'from_user_id' => 'nullable|uuid|exists:directory_users,id',
            'to_user_id' => 'required|uuid|exists:directory_users,id',
        ]);

        $asset = Asset::where('tenant_id', $tenant->id)->findOrFail($validated['asset_id']);

        $fromUser = ($validated['from_user_id'] ?? null) ? DirectoryUser::find($validated['from_user_id']) : null;
        $toUser = DirectoryUser::findOrFail($validated['to_user_id']);

        $fromName = $fromUser?->name ?? 'previous user';

        // 1. Unassign current user(s)
        AssetAssignment::where('asset_id', $asset->id)
            ->whereNull('unassigned_at')
            ->update(['unassigned_at' => now()]);

        // 2. Assign to new user
        $assignment = AssetAssignment::create([
            'asset_id' => $asset->id,
            'user_id' => $toUser->id,
            'tenant_id' => $tenant->id,
            'assigned_at' => now(),
        ]);

        AssetActivity::create([
            'asset_id' => $asset->id,
            'action' => 'Asset transferred',
            'user_name' => Auth::user()?->name ?? 'System',
            'user_id' => Auth::id(),
            'description' => "Transferred from {$fromName} to {$toUser->name}",
        ]);

        NotificationService::sendAssetAssignedNotification($toUser, $asset);

        // Ensure status is assigned
        $asset->update(['status' => 'assigned']);

        return response()->json($assignment, 201);
    });

    Route::post('/tenants/{id}/unassign-asset', function (Request $request, $id) {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'asset_id' => 'required|uuid|exists:assets,id',
        ]);

        $asset = Asset::where('tenant_id', $tenant->id)->findOrFail($validated['asset_id']);

        // Find current user before unassigning
        $lastAssignment = AssetAssignment::where('asset_id', $asset->id)
            ->whereNull('unassigned_at')
            ->with('user')
            ->first();

        $userName = $lastAssignment?->user?->name ?? 'unknown user';

        // 1. Mark current assignments as completed
        AssetAssignment::where('asset_id', $asset->id)
            ->whereNull('unassigned_at')
            ->update(['unassigned_at' => now()]);

        // 2. Set asset status back to available
        $asset->update(['status' => 'available']);

        AssetActivity::create([
            'asset_id' => $asset->id,
            'action' => 'Asset unassigned',
            'user_name' => Auth::user()?->name ?? 'System',
            'user_id' => Auth::id(),
            'description' => "Asset unassigned from {$userName} and returned to inventory.",
        ]);

        return response()->json(['message' => 'Asset unassigned successfully']);
    });

    Route::get('/tenants/{id}/stats', function ($id) {
        $tenant = Tenant::findOrFail($id);
        $assetCount = Asset::where('tenant_id', $id)->count();

        $dbActiveUsers = DirectoryUser::where('tenant_id', $id)->where('account_enabled', true)->count();
        $dbInactiveUsers = DirectoryUser::where('tenant_id', $id)->where('account_enabled', false)->count();
        $dbTotalUsers = $dbActiveUsers + $dbInactiveUsers;

        // Use the stored usersCount as the source of truth if it's higher (official Graph count)
        $totalUsers = max($dbTotalUsers, $tenant->usersCount);

        // If we have a discrepancy, we scale the other stats proportionally or just use DB counts if they are more granular
        // For now, let's just use the official total but keep the granular DB stats if they match or exceed
        $activeUsers = $dbActiveUsers;
        $inactiveUsers = $dbInactiveUsers;

        if ($totalUsers > $dbTotalUsers) {
            // If we know there are more users but haven't synced them all yet,
            // we at least show the correct total in one of the fields or just use the official total
            $activeUsers = max($activeUsers, $totalUsers - $inactiveUsers);
        }

        // Calculate used and free licenses
        $usedLicenses = DirectoryUser::where('tenant_id', $id)
            ->whereNotNull('license_name')
            ->where('license_name', '!=', 'No License')
            ->count();

        // If official licensed count was available from Graph, we could use it here.
        // For now, we rely on what's in the DB but we ensure the total license count is correct
        $totalLicenses = $tenant->license_count ?? 0;
        $freeLicenses = max(0, $totalLicenses - $usedLicenses);

        $noLicenseCount = DirectoryUser::where('tenant_id', $id)
            ->where(function ($q) {
                $q->whereNull('license_name')
                    ->orWhere('license_name', 'No License');
            })
            ->count();

        if ($totalUsers > $dbTotalUsers) {
            $noLicenseCount = max($noLicenseCount, $totalUsers - $usedLicenses);
        }

        // Mock license cost calculation (assuming $20 per license)
        $licensePrice = 20.00;
        $totalLicenseCost = $totalLicenses * $licensePrice;

        return response()->json([
            'total_licenses' => $totalLicenses,
            'used_licenses' => $usedLicenses,
            'free_licenses' => $freeLicenses,
            'no_license_count' => $noLicenseCount,
            'total_license_cost' => $totalLicenseCost,
            'asset_count' => $assetCount,
            'active_users' => $activeUsers,
            'inactive_users' => $inactiveUsers,
            'total_users' => $totalUsers,
        ]);
    });
});

Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
