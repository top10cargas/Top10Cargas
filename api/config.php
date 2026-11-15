<?php
/**
 * TOP10 CARGAS - Configuração e Utilidades do Servidor API
 * Permite acesso CORS de qualquer dispositivo (Desktop, Mobile, Tablet)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Responder requisições OPTIONS (pre-flight do navegador)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Diretório de armazenamento persistente no servidor
$DATA_DIR = __DIR__ . '/data';
if (!file_exists($DATA_DIR)) {
    mkdir($DATA_DIR, 0755, true);
    // Cria proteção para impedir download direto dos arquivos JSON via navegador
    file_put_contents($DATA_DIR . '/.htaccess', "Deny from all\n");
    file_put_contents($DATA_DIR . '/index.html', "");
}

define('USERS_FILE', $DATA_DIR . '/users.json');
define('QUOTES_FILE', $DATA_DIR . '/quotes.json');
define('MESSAGES_FILE', $DATA_DIR . '/messages.json');
define('ADMIN_PHONES_FILE', $DATA_DIR . '/admin_phones.json');

// Credenciais oficiais do administrador
$ADMIN_CREDENTIALS = [
    'email' => 'top10cargas@hotmail.com',
    'password' => 'Caxias844$',
    'name' => 'Top 10 Cargas Brasil',
    'company' => 'Top 10 Cargas & Logística Nacional'
];

/**
 * Lê dados de um arquivo JSON
 */
function readJsonFile($filePath, $default = []) {
    if (!file_exists($filePath)) {
        return $default;
    }
    $content = file_get_contents($filePath);
    $data = json_decode($content, true);
    return is_array($data) ? $data : $default;
}

/**
 * Escreve dados em um arquivo JSON com lock exclusivo
 */
function writeJsonFile($filePath, $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($filePath, $json, LOCK_EX);
}

/**
 * Obtém corpo da requisição JSON (payload)
 */
function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return is_array($data) ? $data : [];
}

/**
 * Envia resposta JSON com código HTTP
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Inicializa dados padrão caso o servidor seja novo
 */
function initializeDefaultDataIfNeeded() {
    global $ADMIN_CREDENTIALS;

    // Usuários padrão
    if (!file_exists(USERS_FILE)) {
        $defaultUsers = [
            [
                'id' => 'user_admin_top10',
                'name' => $ADMIN_CREDENTIALS['name'],
                'email' => $ADMIN_CREDENTIALS['email'],
                'password' => $ADMIN_CREDENTIALS['password'],
                'phone' => '+55 11 3200-4000',
                'company' => $ADMIN_CREDENTIALS['company'],
                'role' => 'admin',
                'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                'createdAt' => date('c')
            ],
            [
                'id' => 'user_client_demo',
                'name' => 'Lucas Silveira',
                'email' => 'lucas@empresa.com.br',
                'password' => 'demo',
                'phone' => '+55 11 98765-4321',
                'company' => 'Silveira Distribuição & Comércio Ltda',
                'role' => 'client',
                'avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
                'createdAt' => date('c')
            ]
        ];
        writeJsonFile(USERS_FILE, $defaultUsers);
    }

    // Cotações padrão
    if (!file_exists(QUOTES_FILE)) {
        $defaultQuotes = [
            [
                'id' => 'COT-8921',
                'clientId' => 'user_client_demo',
                'clientName' => 'Lucas Silveira',
                'clientEmail' => 'lucas@empresa.com.br',
                'clientPhone' => '+55 11 98765-4321',
                'createdAt' => date('c', time() - 7200),
                'modality' => 'rodoviario',
                'dimensions' => [
                    'length' => 45,
                    'width' => 35,
                    'height' => 30,
                    'volumeCm3' => 47250
                ],
                'weight' => 14.5,
                'packageImage' => 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
                'origin' => 'São Paulo / SP - Região Central',
                'destination' => 'Curitiba / PR - Distrito Industrial',
                'packageCount' => 2,
                'description' => 'Peças e insumos industriais embalados em caixa de papelão reforçada',
                'isFragile' => true,
                'declaredValue' => 1800,
                'status' => 'PENDIENTE_ANALISIS',
                'deliveryStage' => 'cotacao',
                'proposal' => null,
                'history' => [
                    [
                        'date' => date('c', time() - 7200),
                        'action' => 'Solicitação criada',
                        'user' => 'Lucas Silveira',
                        'note' => 'Cotação de envio sujeita a análise'
                    ]
                ]
            ]
        ];
        writeJsonFile(QUOTES_FILE, $defaultQuotes);
    }

    // Mensagens padrão
    if (!file_exists(MESSAGES_FILE)) {
        $defaultMessages = [
            [
                'id' => 'msg_1',
                'senderId' => 'user_admin_top10',
                'senderName' => 'Top 10 Cargas (Suporte)',
                'senderRole' => 'admin',
                'recipientId' => 'user_client_demo',
                'text' => 'Olá! Seja bem-vindo à Top10 Cargas. Em que podemos ajudar com sua cotação ou entrega hoje?',
                'timestamp' => date('c', time() - 14400),
                'read' => true
            ]
        ];
        writeJsonFile(MESSAGES_FILE, $defaultMessages);
    }
}

// Inicializar na primeira chamada
initializeDefaultDataIfNeeded();
