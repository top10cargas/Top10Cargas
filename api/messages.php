<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();
$messages = readJsonFile(MESSAGES_FILE, []);

if ($method === 'GET') {
    $u1 = $_GET['user1'] ?? null;
    $u2 = $_GET['user2'] ?? null;

    if ($u1 && $u2) {
        $filtered = array_values(array_filter($messages, function($m) use ($u1, $u2) {
            $sender = $m['senderId'] ?? '';
            $recipient = $m['recipientId'] ?? '';
            return ($sender === $u1 && $recipient === $u2) || ($sender === $u2 && $recipient === $u1);
        }));
        sendResponse(['success' => true, 'messages' => $filtered]);
    }

    sendResponse(['success' => true, 'messages' => $messages]);
}

if ($method === 'POST') {
    $text = trim($input['text'] ?? '');
    if (empty($text)) {
        sendResponse(['error' => 'A mensagem não pode ser vazia.'], 400);
    }

    $newMsg = [
        'id' => 'msg_' . time() . '_' . rand(100, 999),
        'senderId' => $input['senderId'] ?? 'user_admin_top10',
        'senderName' => $input['senderName'] ?? 'Top 10 Cargas',
        'senderRole' => $input['senderRole'] ?? 'admin',
        'recipientId' => $input['recipientId'] ?? 'user_admin_top10',
        'text' => $text,
        'timestamp' => date('c'),
        'read' => false
    ];

    $messages[] = $newMsg;
    writeJsonFile(MESSAGES_FILE, $messages);
    sendResponse(['success' => true, 'message' => $newMsg], 201);
}

sendResponse(['error' => 'Método não suportado.'], 405);
