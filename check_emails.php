<?php

require __DIR__.'/vendor/autoload.php';

use GuzzleHttp\Client;

$tenantId = '69794fbf-cfa4-45fa-b3bf-9108196c3f72';
$clientId = '01634043-d0c1-4ccb-a2ab-5b07e32279c5';
$clientSecret = 'YOUR_CLIENT_SECRET';

$client = new Client();

try {
    $response = $client->post("https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token", [
        'form_params' => [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'scope' => 'https://graph.microsoft.com/.default',
            'grant_type' => 'client_credentials',
        ],
    ]);

    $data = json_decode($response->getBody(), true);
    $accessToken = $data['access_token'];

    $allUsers = [];
    $url = 'https://graph.microsoft.com/v1.0/users?$top=999';
    while ($url) {
        $response = $client->get($url, [
            'headers' => [
                'Authorization' => "Bearer $accessToken",
            ],
        ]);
        $data = json_decode($response->getBody(), true);
        $allUsers = array_merge($allUsers, $data['value']);
        $url = $data['@odata.nextLink'] ?? null;
    }
    
    echo "Total: " . count($allUsers) . "\n";
    
    $hasMail = 0;
    $hasUPN = 0;
    $hasEither = 0;
    foreach ($allUsers as $u) {
        if (!empty($u['mail'])) $hasMail++;
        if (!empty($u['userPrincipalName'])) $hasUPN++;
        if (!empty($u['mail']) || !empty($u['userPrincipalName'])) $hasEither++;
    }
    
    echo "Has Mail: $hasMail\n";
    echo "Has UPN: $hasUPN\n";
    echo "Has Either: $hasEither\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
