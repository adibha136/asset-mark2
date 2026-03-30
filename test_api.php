<?php
require 'vendor/autoload.php';

use Illuminate\Support\Facades\Http;

$response = Http::timeout(30)->withHeaders([
    'Accept' => 'application/json',
    'Content-Type' => 'application/json',
])->post('https://api.virtualplatform.com.au/v2/auth', [
    'username' => 'satheesh@nextelecom.au',
    'password' => 'Smarttech2022@!',
    'mfapin' => '0000',
]);

echo "Status: " . $response->status() . "\n";
echo "Response:\n";
echo json_encode($response->json(), JSON_PRETTY_PRINT) . "\n";
?>
