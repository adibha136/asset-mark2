<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MicrosoftGraphService
{
    protected string $tenantId;

    protected string $clientId;

    protected string $clientSecret;

    protected ?string $accessToken = null;

    public function __construct(string $tenantId, string $clientId, string $clientSecret)
    {
        $this->tenantId = $tenantId;
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
    }

    protected function getLicenseDisplayName(string $skuPartNumber): string
    {
        $licenseNames = [
            'ENTERPRISEPREMIUM' => 'Microsoft 365 Enterprise Premium',
            'ENTERPRISEPACK' => 'Microsoft 365 Enterprise E3',
            'STANDARDPACK' => 'Microsoft 365 Business Standard',
            'BUSINESSBASIC' => 'Microsoft 365 Business Basic',
            'BUSINESSPREMIUM' => 'Microsoft 365 Business Premium',
            'O365_BUSINESS_ESSENTIALS' => 'Microsoft 365 Business Basic',
            'O365_BUSINESS_PREMIUM' => 'Microsoft 365 Business Standard',
            'SPB' => 'Microsoft 365 Business Premium',
            'FLOW_FREE' => 'Microsoft Power Automate Free',
            'POWER_BI_STANDARD' => 'Power BI Pro',
            'POWER_BI_PRO' => 'Power BI Pro',
            'PROJECTPROFESSIONAL' => 'Project Plan 3',
            'VISIOPRO' => 'Visio Plan 2',
            'EMS' => 'Enterprise Mobility + Security E3',
            'EMSPREMIUM' => 'Enterprise Mobility + Security E5',
            'DEVELOPER_PACK' => 'Microsoft 365 E5 Developer',
            'WIN10_PRO_ENT_SUB' => 'Windows 10/11 Enterprise E3',
        ];

        if (isset($licenseNames[$skuPartNumber])) {
            return $licenseNames[$skuPartNumber];
        }

        // Fallback for unknown SKUs: clean up the string (e.g., O365_BUSINESS_ESSENTIALS -> O365 Business Essentials)
        $name = str_replace('_', ' ', $skuPartNumber);
        $name = str_replace('-', ' ', $name);

        return ucwords(strtolower($name));
    }

    protected function getAccessToken(): ?string
    {
        if ($this->accessToken) {
            return $this->accessToken;
        }

        $cacheKey = "graph_token_{$this->tenantId}";
        if (Cache::has($cacheKey)) {
            $this->accessToken = Cache::get($cacheKey);

            return $this->accessToken;
        }

        try {
            $response = Http::asForm()->post("https://login.microsoftonline.com/{$this->tenantId}/oauth2/v2.0/token", [
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'grant_type' => 'client_credentials',
                'scope' => 'https://graph.microsoft.com/.default',
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $this->accessToken = $data['access_token'];
                $expiresIn = $data['expires_in'] ?? 3500;
                Cache::put($cacheKey, $this->accessToken, now()->addSeconds($expiresIn - 60));

                return $this->accessToken;
            }

            Log::error('Microsoft Graph Auth Failed', ['tenant_id' => $this->tenantId, 'response' => $response->body()]);
        } catch (\Exception $e) {
            Log::error('Microsoft Graph Auth Exception: '.$e->getMessage());
        }

        return null;
    }

    public function makeBatchRequest(array $requests): array
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return [];
        }

        try {
            $response = Http::withToken($token)
                ->post('https://graph.microsoft.com/v1.0/$batch', [
                    'requests' => $requests,
                ]);

            if ($response->successful()) {
                return $response->json('responses') ?? [];
            }

            Log::error('Graph Batch Failed: '.$response->body());
        } catch (\Exception $e) {
            Log::error('Graph Batch Error: '.$e->getMessage());
        }

        return [];
    }

    public function getUserFullProfileCached(string $userId): array
    {
        // Cache the combined result for 10 minutes to make subsequent potential reloads instant
        return Cache::remember("user_full_profile_{$userId}", 600, function () use ($userId) {
            return $this->getUserFullProfile($userId);
        });
    }

    public function getUserFullProfile(string $userId): array
    {
        // Prepare Batch Requests
        $lastWeek = now()->subDays(30)->setTimezone('UTC')->format('Y-m-d\TH:i:s\Z');

        $requests = [
            [
                'id' => 'signIns',
                'method' => 'GET',
                'url' => "/auditLogs/signIns?\$filter=userId eq '{$userId}' and createdDateTime ge {$lastWeek}&\$orderBy=createdDateTime desc&\$top=50",
            ],
            [
                'id' => 'appRoleAssignments',
                'method' => 'GET',
                'url' => "/users/{$userId}/appRoleAssignments",
            ],
            [
                'id' => 'memberOf',
                'method' => 'GET',
                'url' => "/users/{$userId}/memberOf?\$select=displayName,id,description",
            ],
            [
                'id' => 'followedSites',
                'method' => 'GET',
                'url' => "/users/{$userId}/followedSites?\$select=displayName,webUrl,id",
            ],
            [
                'id' => 'driveRecent',
                'method' => 'GET',
                'url' => "/users/{$userId}/drive/recent?\$top=5",
            ],
        ];

        /*
           NOTE: 'auditLogs/signIns' requires specific permissions (AuditLog.Read.All).
           If the token doesn't have it, this part of the batch will return 403,
           while others might succeed. The code handles this gracefully.
        */

        $responses = $this->makeBatchRequest($requests);
        $results = [];

        foreach ($responses as $resp) {
            // Check for success status (200-299)
            if (isset($resp['status']) && $resp['status'] >= 200 && $resp['status'] < 300) {
                $results[$resp['id']] = $resp['body']['value'] ?? [];
            } else {
                Log::warning("Batch request {$resp['id']} failed with status {$resp['status']}");
                $results[$resp['id']] = [];
            }
        }

        // 1. Process Activity
        $activityData = ['logs' => [], 'signals' => ['mfa_enabled' => false, 'is_compliant' => false, 'risk_level' => 'hidden', 'risk_score' => 0]];
        if (! empty($results['signIns'])) {
            $signIns = $results['signIns'];
            $mfaEnabled = false;
            $isCompliant = false;
            $riskLevel = 'low';

            foreach ($signIns as $signIn) {
                if (! empty($signIn['authenticationDetails'])) {
                    foreach ($signIn['authenticationDetails'] as $detail) {
                        $stepResult = $detail['authenticationStepResultDetail'] ?? '';
                        if (str_contains($stepResult, 'MFA') || str_contains($stepResult, 'multi-factor')) {
                            $mfaEnabled = true;
                            break;
                        }
                    }
                }
                if (! $mfaEnabled && ! empty($signIn['authenticationMethodsUsed'])) {
                    foreach ($signIn['authenticationMethodsUsed'] as $method) {
                        if (in_array($method, ['Mobile app notification', 'Text message', 'Phone call', 'FIDO2 security key'])) {
                            $mfaEnabled = true;
                            break;
                        }
                    }
                }
                if (isset($signIn['deviceDetail']['isCompliant']) && $signIn['deviceDetail']['isCompliant'] === true) {
                    $isCompliant = true;
                }
                $currentRisk = $signIn['riskLevelDuringSignIn'] ?? 'none';
                if ($currentRisk !== 'none' && $currentRisk !== 'low') {
                    $riskLevel = $currentRisk;
                }
            }
            $activityData = [
                'logs' => $signIns,
                'signals' => [
                    'mfa_enabled' => $mfaEnabled,
                    'is_compliant' => $isCompliant,
                    'risk_level' => $riskLevel,
                    'risk_score' => $riskLevel === 'high' ? 2.1 : ($riskLevel === 'medium' ? 5.4 : 8.8),
                ],
            ];
        }

        // 2. Process App Access
        $appData = [];
        if (! empty($results['appRoleAssignments'])) {
            foreach ($results['appRoleAssignments'] as $assignment) {
                $appData[] = [
                    'app_name' => $assignment['resourceDisplayName'] ?? 'Unknown App',
                    'role_name' => 'Assigned Access',
                    'assigned_at' => $assignment['createdDateTime'] ?? null,
                ];
            }
        }

        // 3. Process SharePoint (combining memberOf, followedSites, driveRecent)
        $sharePointAccess = [];
        // Groups
        if (! empty($results['memberOf'])) {
            foreach ($results['memberOf'] as $group) {
                if (isset($group['@odata.type']) && $group['@odata.type'] === '#microsoft.graph.group') {
                    $sharePointAccess[] = [
                        'site_name' => $group['displayName'],
                        'access_type' => 'Group/Team Member',
                        'role' => 'Member',
                        'source' => 'Microsoft 365 Group',
                        'id' => $group['id'],
                    ];
                }
            }
        }
        // Followed Sites
        if (! empty($results['followedSites'])) {
            foreach ($results['followedSites'] as $site) {
                $exists = collect($sharePointAccess)->contains('site_name', $site['displayName']);
                if (! $exists) {
                    $sharePointAccess[] = [
                        'site_name' => $site['displayName'],
                        'access_type' => 'Direct/Followed Access',
                        'role' => 'Contributor',
                        'source' => 'SharePoint Online',
                        'url' => $site['webUrl'],
                        'id' => $site['id'],
                    ];
                }
            }
        }
        // Recent Files
        $recentFiles = [];
        if (! empty($results['driveRecent'])) {
            $recentFiles = array_map(function ($item) {
                return [
                    'name' => $item['name'],
                    'url' => $item['webUrl'],
                    'last_accessed' => $item['lastModifiedDateTime'] ?? null,
                ];
            }, $results['driveRecent']);
        }

        return [
            'activity' => $activityData['logs'] ?? [],
            'signals' => $activityData['signals'] ?? [],
            'app_access' => $appData,
            'sharepoint' => [
                'sites' => $sharePointAccess,
                'recent_files' => $recentFiles,
            ],
            'synced_at' => now()->toIso8601String(),
        ];
    }

    // Existing helper methods...
    public function getUserPhoto(string $userId): ?string
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return null;
        }

        try {
            $response = Http::withToken($token)
                ->get("https://graph.microsoft.com/v1.0/users/{$userId}/photo/\$value");

            if ($response->successful()) {
                return $response->body();
            }
        } catch (\Exception $e) {
        }

        return null;
    }

    public function getApplicationDetails(): array
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return [];
        }
        try {
            $response = Http::withToken($token)->get("https://graph.microsoft.com/v1.0/applications/{$this->clientId}");
            if ($response->successful()) {
                return $response->json() ?? [];
            }
        } catch (\Exception $e) {
            Log::error('Graph getApplicationDetails Error: '.$e->getMessage());
        }

        return [];
    }

    public function getAllDetails(): array
    {
        $org = $this->getOrganizationDetails();
        $skus = $this->getSubscribedSkus();
        $userCount = $this->getUserCount();
        $deviceCount = $this->getDeviceCount();
        $app = $this->getApplicationDetails();

        $primaryLicense = null;
        if (! empty($skus)) {
            foreach ($skus as $sku) {
                if ($sku['capabilityStatus'] === 'Enabled') {
                    $primaryLicense = $sku;
                    if (str_contains($sku['skuPartNumber'], 'ENTERPRISE')) {
                        break;
                    }
                }
            }
        }

        // Find the expiry date for the current secret
        $secretExpiresAt = null;
        if (! empty($app['passwordCredentials'])) {
            foreach ($app['passwordCredentials'] as $cred) {
                // Since we don't know the exact secret value's ID, we take the one that is closest to expiring or currently valid
                // In a real scenario, we might want to match by hint if available
                $endDateTime = $cred['endDateTime'] ?? null;
                if ($endDateTime) {
                    $expiry = \Carbon\Carbon::parse($endDateTime);
                    if (! $secretExpiresAt || $expiry->lt($secretExpiresAt)) {
                        $secretExpiresAt = $expiry;
                    }
                }
            }
        }

        $certExpiresAt = null;
        if (! empty($app['keyCredentials'])) {
            foreach ($app['keyCredentials'] as $cred) {
                $endDateTime = $cred['endDateTime'] ?? null;
                if ($endDateTime) {
                    $expiry = \Carbon\Carbon::parse($endDateTime);
                    if (! $certExpiresAt || $expiry->lt($certExpiresAt)) {
                        $certExpiresAt = $expiry;
                    }
                }
            }
        }

        return [
            'name' => $org['displayName'] ?? null,
            'domain' => $org['verifiedDomains'][0]['name'] ?? null,
            'license_name' => $primaryLicense ? $this->getLicenseDisplayName($primaryLicense['skuPartNumber']) : null,
            'license_count' => $primaryLicense ? ($primaryLicense['prepaidUnits']['enabled'] ?? 0) : 0,
            'users_count' => $userCount,
            'assets_count' => $deviceCount,
            'client_secret_expires_at' => $secretExpiresAt,
            'certificate_expires_at' => $certExpiresAt,
        ];
    }

    public function getOrganizationDetails(): array
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return [];
        }
        try {
            $response = Http::withToken($token)->get('https://graph.microsoft.com/v1.0/organization');
            if ($response->successful()) {
                return $response->json('value')[0] ?? [];
            }
        } catch (\Exception $e) {
        }

        return [];
    }

    public function getSubscribedSkus(): array
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return [];
        }
        try {
            $response = Http::withToken($token)->get('https://graph.microsoft.com/v1.0/subscribedSkus');
            if ($response->successful()) {
                return $response->json('value') ?? [];
            }
        } catch (\Exception $e) {
        }

        return [];
    }

    public function getUserCount(): int
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return 0;
        }
        try {
            $response = Http::withToken($token)->withHeaders(['ConsistencyLevel' => 'eventual'])->get('https://graph.microsoft.com/v1.0/users?$count=true&$top=1');
            if ($response->successful()) {
                return (int) ($response->json()['@odata.count'] ?? 0);
            }
        } catch (\Exception $e) {
        }

        return 0;
    }

    public function getDeviceCount(): int
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return 0;
        }
        try {
            $response = Http::withToken($token)->withHeaders(['ConsistencyLevel' => 'eventual'])->get('https://graph.microsoft.com/v1.0/devices?$count=true&$top=1');
            if ($response->successful()) {
                return (int) ($response->json()['@odata.count'] ?? 0);
            }
        } catch (\Exception $e) {
        }

        return 0;
    }

    public function getUser(string $userId): ?array
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return null;
        }

        try {
            $skus = $this->getSubscribedSkus();
            $skuMap = [];
            foreach ($skus as $sku) {
                $skuMap[$sku['skuId']] = $sku['skuPartNumber'];
            }

            $response = Http::withToken($token)
                ->get("https://graph.microsoft.com/v1.0/users/{$userId}?\$select=displayName,mail,userPrincipalName,id,assignedLicenses,accountEnabled,mobilePhone,businessPhones,department,officeLocation,jobTitle");

            if ($response->successful()) {
                $user = $response->json();

                $licenseName = 'No License';
                if (! empty($user['assignedLicenses'])) {
                    $licenseNames = [];
                    foreach ($user['assignedLicenses'] as $license) {
                        if (isset($skuMap[$license['skuId']])) {
                            $licenseNames[] = $this->getLicenseDisplayName($skuMap[$license['skuId']]);
                        }
                    }
                    if (! empty($licenseNames)) {
                        $licenseName = implode(', ', array_slice($licenseNames, 0, 2));
                    }
                }

                return [
                    'name' => $user['displayName'],
                    'email' => $user['mail'] ?? $user['userPrincipalName'],
                    'id' => $user['id'],
                    'license_name' => $licenseName,
                    'status' => $user['accountEnabled'] ? 'active' : 'inactive',
                    'phone' => ! empty($user['businessPhones']) ? $user['businessPhones'][0] : null,
                    'mobile_phone' => $user['mobilePhone'] ?? null,
                    'department' => $user['department'] ?? null,
                    'office_location' => $user['officeLocation'] ?? null,
                    'job_title' => $user['jobTitle'] ?? null,
                    'avatar' => '/api/tenants/user-photo?user_id='.$user['id'].'&name='.urlencode($user['displayName']).'&tenant_id='.$this->tenantId,
                ];
            }
        } catch (\Exception $e) {
            Log::error('Graph GetUser Failed: '.$e->getMessage());
        }

        return null;
    }

    public function getUsers(int $limit = 5): array
    {
        // Simple implementation for user sync, kept separate from batch profile fetch
        $token = $this->getAccessToken();
        if (! $token) {
            return [];
        }

        try {
            $skus = $this->getSubscribedSkus();
            $skuMap = [];
            foreach ($skus as $sku) {
                $skuMap[$sku['skuId']] = $sku['skuPartNumber'];
            }

            $response = Http::withToken($token)
                ->get("https://graph.microsoft.com/v1.0/users?\$top={$limit}&\$select=displayName,mail,userPrincipalName,id,assignedLicenses,accountEnabled,mobilePhone,businessPhones,department,officeLocation,jobTitle");

            if ($response->successful()) {
                $users = $response->json('value') ?? [];

                return $this->mapGraphUsers($users, $skuMap);
            }
        } catch (\Exception $e) {
        }

        return [];
    }

    public function getAllUsers(): array
    {
        $token = $this->getAccessToken();
        if (! $token) {
            return [];
        }

        $allUsers = [];
        $skus = $this->getSubscribedSkus();
        $skuMap = [];
        foreach ($skus as $sku) {
            $skuMap[$sku['skuId']] = $sku['skuPartNumber'];
        }

        // Use a standard top value and explicit select
        $url = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=displayName,mail,userPrincipalName,id,assignedLicenses,accountEnabled,mobilePhone,businessPhones,department,officeLocation,jobTitle';

        try {
            $page = 1;
            while ($url) {
                Log::info("Fetching Graph users page {$page}", ['url' => $url]);

                $response = Http::withToken($token)
                    ->withHeaders([
                        'ConsistencyLevel' => 'eventual',
                    ])
                    ->get($url);

                if ($response->successful()) {
                    $data = $response->json();
                    $users = $data['value'] ?? [];

                    if (empty($users)) {
                        Log::info("Page {$page} returned no users. Stopping.");
                        break;
                    }

                    $mappedUsers = $this->mapGraphUsers($users, $skuMap);
                    $allUsers = array_merge($allUsers, $mappedUsers);

                    Log::info("Page {$page} fetched: ".count($users).' users. Total so far: '.count($allUsers));

                    // Microsoft Graph uses @odata.nextLink for pagination
                    $url = $data['@odata.nextLink'] ?? null;

                    if ($url) {
                        Log::info('Found nextLink for page '.($page + 1));
                    } else {
                        Log::info("No more pages after page {$page}");
                    }

                    $page++;

                    // Safety break to prevent infinite loops if something goes wrong with nextLink
                    if ($page > 100) {
                        Log::warning('Pagination limit reached (100 pages). Stopping to prevent infinite loop.');
                        break;
                    }
                } else {
                    Log::error("Graph API page {$page} failed", [
                        'status' => $response->status(),
                        'body' => $response->body(),
                        'url' => $url,
                    ]);
                    break;
                }
            }
        } catch (\Exception $e) {
            Log::error('Graph GetAllUsers Exception: '.$e->getMessage());
        }

        Log::info('Sync completed. Total users fetched: '.count($allUsers));

        return $allUsers;
    }

    protected function mapGraphUsers(array $users, array $skuMap): array
    {
        return array_map(function ($user) use ($skuMap) {
            $licenseName = 'No License';
            if (! empty($user['assignedLicenses'])) {
                $licenseNames = [];
                foreach ($user['assignedLicenses'] as $license) {
                    if (isset($skuMap[$license['skuId']])) {
                        $licenseNames[] = $this->getLicenseDisplayName($skuMap[$license['skuId']]);
                    }
                }
                if (! empty($licenseNames)) {
                    $licenseName = implode(', ', array_slice($licenseNames, 0, 2));
                }
            }

            return [
                'name' => $user['displayName'],
                'email' => $user['mail'] ?? $user['userPrincipalName'],
                'id' => $user['id'],
                'license_name' => $licenseName,
                'status' => $user['accountEnabled'] ? 'active' : 'inactive',
                'phone' => ! empty($user['businessPhones']) ? $user['businessPhones'][0] : null,
                'mobile_phone' => $user['mobilePhone'] ?? null,
                'department' => $user['department'] ?? null,
                'office_location' => $user['officeLocation'] ?? null,
                'job_title' => $user['jobTitle'] ?? null,
                'avatar' => '/api/tenants/user-photo?user_id='.$user['id'].'&name='.urlencode($user['displayName']).'&tenant_id='.$this->tenantId,
            ];
        }, $users);
    }
}
