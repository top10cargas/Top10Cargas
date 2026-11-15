<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();
$quotes = readJsonFile(QUOTES_FILE, []);
$users = readJsonFile(USERS_FILE, []);

// ----------------------------------------------------
// GET /api/quotes.php - Lista todas as cotações
// ----------------------------------------------------
if ($method === 'GET') {
    $clientId = $_GET['clientId'] ?? null;
    $status = $_GET['status'] ?? null;
    $id = $_GET['id'] ?? null;

    if ($id) {
        foreach ($quotes as $q) {
            if (($q['id'] ?? '') === $id) {
                sendResponse(['success' => true, 'quote' => $q]);
            }
        }
        sendResponse(['error' => 'Cotação não encontrada.'], 404);
    }

    $filtered = $quotes;
    if ($clientId) {
        $filtered = array_values(array_filter($filtered, function($q) use ($clientId) {
            return ($q['clientId'] ?? '') === $clientId;
        }));
    }
    if ($status && $status !== 'ALL') {
        $filtered = array_values(array_filter($filtered, function($q) use ($status) {
            return ($q['status'] ?? '') === $status;
        }));
    }

    sendResponse([
        'success' => true,
        'total' => count($filtered),
        'quotes' => $filtered
    ]);
}

// ----------------------------------------------------
// POST /api/quotes.php - Cria nova cotação e cadastra usuário se novo
// ----------------------------------------------------
if ($method === 'POST') {
    $quoteId = $input['id'] ?? ('COT-' . rand(1000, 9999));
    $cleanEmail = trim(strtolower($input['clientEmail'] ?? $input['contactEmail'] ?? ''));
    $cleanName = trim($input['clientName'] ?? $input['contactName'] ?? '');
    $cleanPhone = trim($input['clientPhone'] ?? $input['contactPhone'] ?? '');

    // Se o cliente informou email e não existe na base de usuários, registra no servidor
    $clientId = $input['clientId'] ?? null;
    if ($cleanEmail) {
        $foundUser = null;
        foreach ($users as $u) {
            if (isset($u['email']) && strtolower($u['email']) === $cleanEmail) {
                $foundUser = $u;
                break;
            }
        }
        if (!$foundUser) {
            $newUser = [
                'id' => 'user_cli_' . time() . '_' . rand(100, 999),
                'name' => $cleanName ?: $cleanEmail,
                'email' => $cleanEmail,
                'password' => 'cli' . rand(1000, 9999),
                'phone' => $cleanPhone,
                'company' => '',
                'cpfCnpj' => '',
                'role' => 'client',
                'avatar' => 'https://api.dicebear.com/7.x/initials/svg?seed=' . urlencode($cleanName ?: $cleanEmail),
                'createdAt' => date('c')
            ];
            $users[] = $newUser;
            writeJsonFile(USERS_FILE, $users);
            $clientId = $newUser['id'];
        } else {
            $clientId = $foundUser['id'];
            if (empty($foundUser['phone']) && $cleanPhone) {
                foreach ($users as &$uRef) {
                    if ($uRef['id'] === $foundUser['id']) {
                        $uRef['phone'] = $cleanPhone;
                        break;
                    }
                }
                writeJsonFile(USERS_FILE, $users);
            }
        }
    }

    if (!$clientId) {
        $clientId = 'guest_' . time() . '_' . rand(100, 999);
    }

    $length = floatval($input['dimensions']['length'] ?? $input['length'] ?? 0);
    $width = floatval($input['dimensions']['width'] ?? $input['width'] ?? 0);
    $height = floatval($input['dimensions']['height'] ?? $input['height'] ?? 0);
    $volCm3 = $length * $width * $height;

    $newQuote = [
        'id' => $quoteId,
        'clientId' => $clientId,
        'clientName' => $cleanName ?: 'Cliente',
        'clientEmail' => $cleanEmail,
        'clientPhone' => $cleanPhone,
        'createdAt' => $input['createdAt'] ?? date('c'),
        'modality' => $input['modality'] ?? 'rodoviario',
        'dimensions' => [
            'length' => $length,
            'width' => $width,
            'height' => $height,
            'volumeCm3' => $volCm3
        ],
        'weight' => floatval($input['weight'] ?? 0),
        'packageImage' => $input['packageImage'] ?? null,
        'origin' => trim($input['origin'] ?? ''),
        'destination' => trim($input['destination'] ?? ''),
        'packageCount' => intval($input['packageCount'] ?? 1),
        'description' => trim($input['description'] ?? 'Sem descrição detalhada'),
        'isFragile' => !empty($input['isFragile']),
        'declaredValue' => floatval($input['declaredValue'] ?? 0),
        'status' => $input['status'] ?? 'PENDIENTE_ANALISIS',
        'deliveryStage' => $input['deliveryStage'] ?? 'cotacao',
        'proposal' => $input['proposal'] ?? null,
        'history' => $input['history'] ?? [
            [
                'date' => date('c'),
                'action' => 'Solicitação criada no Servidor',
                'user' => $cleanName ?: 'Cliente',
                'note' => 'Cotação de envio sujeita a análise salva no servidor'
            ]
        ]
    ];

    // Evita duplicata se o ID já existe
    $existingIdx = -1;
    foreach ($quotes as $i => $q) {
        if (($q['id'] ?? '') === $quoteId) {
            $existingIdx = $i;
            break;
        }
    }

    if ($existingIdx >= 0) {
        $quotes[$existingIdx] = $newQuote;
    } else {
        array_unshift($quotes, $newQuote);
    }

    writeJsonFile(QUOTES_FILE, $quotes);
    sendResponse(['success' => true, 'quote' => $newQuote], 201);
}

// ----------------------------------------------------
// PUT /api/quotes.php?id=... - Atualiza status, proposta ou etapa
// ----------------------------------------------------
if ($method === 'PUT') {
    $id = $_GET['id'] ?? $input['id'] ?? '';
    if (empty($id)) {
        sendResponse(['error' => 'ID da cotação não fornecido.'], 400);
    }

    $foundIndex = -1;
    foreach ($quotes as $i => $q) {
        if (($q['id'] ?? '') === $id) {
            $foundIndex = $i;
            break;
        }
    }

    if ($foundIndex < 0) {
        sendResponse(['error' => 'Cotação não encontrada.'], 404);
    }

    // Campos atualizáveis
    if (isset($input['status'])) $quotes[$foundIndex]['status'] = $input['status'];
    if (isset($input['deliveryStage'])) $quotes[$foundIndex]['deliveryStage'] = $input['deliveryStage'];
    if (isset($input['proposal'])) $quotes[$foundIndex]['proposal'] = $input['proposal'];
    if (isset($input['reanalysisNotes'])) $quotes[$foundIndex]['reanalysisNotes'] = $input['reanalysisNotes'];
    if (isset($input['denialReason'])) $quotes[$foundIndex]['denialReason'] = $input['denialReason'];
    if (isset($input['clientDecisionDate'])) $quotes[$foundIndex]['clientDecisionDate'] = $input['clientDecisionDate'];
    if (isset($input['history']) && is_array($input['history'])) $quotes[$foundIndex]['history'] = $input['history'];

    writeJsonFile(QUOTES_FILE, $quotes);
    sendResponse(['success' => true, 'quote' => $quotes[$foundIndex]]);
}

// ----------------------------------------------------
// DELETE /api/quotes.php?id=... - Exclui cotação
// ----------------------------------------------------
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (empty($id)) {
        sendResponse(['error' => 'ID da cotação não fornecido.'], 400);
    }

    $initialCount = count($quotes);
    $quotes = array_values(array_filter($quotes, function($q) use ($id) {
        return ($q['id'] ?? '') !== $id;
    }));

    if (count($quotes) === $initialCount) {
        sendResponse(['error' => 'Cotação não encontrada.'], 404);
    }

    writeJsonFile(QUOTES_FILE, $quotes);
    sendResponse(['success' => true, 'message' => 'Cotação excluída com sucesso.']);
}

sendResponse(['error' => 'Método HTTP não suportado.'], 405);
