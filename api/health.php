<?php
require_once __DIR__ . '/config.php';

$users = readJsonFile(USERS_FILE, []);
$quotes = readJsonFile(QUOTES_FILE, []);

sendResponse([
    'status' => 'online',
    'server' => 'Top10 Cargas Backend API',
    'version' => '1.0.0',
    'timestamp' => date('c'),
    'stats' => [
        'users_count' => count($users),
        'quotes_count' => count($quotes)
    ]
]);
