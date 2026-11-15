<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();
$users = readJsonFile(USERS_FILE, []);

// ----------------------------------------------------
// GET /api/users.php - Lista todos os usuários
// ----------------------------------------------------
if ($method === 'GET') {
    global $ADMIN_CREDENTIALS;
    $adminEmail = strtolower($ADMIN_CREDENTIALS['email']);
    $role = $_GET['role'] ?? null;
    $search = strtolower(trim($_GET['search'] ?? ''));

    $filtered = array_values(array_filter($users, function($u) use ($adminEmail, $role, $search) {
        if (!isset($u['email']) || strtolower($u['email']) === $adminEmail) {
            return false;
        }
        if ($role && ($u['role'] ?? '') !== $role) {
            return false;
        }
        if ($search) {
            $name = strtolower($u['name'] ?? '');
            $email = strtolower($u['email'] ?? '');
            $phone = strtolower($u['phone'] ?? '');
            if (strpos($name, $search) === false && strpos($email, $search) === false && strpos($phone, $search) === false) {
                return false;
            }
        }
        return true;
    }));

    sendResponse([
        'success' => true,
        'total' => count($filtered),
        'users' => $filtered
    ]);
}

// ----------------------------------------------------
// POST /api/users.php - Cria ou sincroniza usuário
// ----------------------------------------------------
if ($method === 'POST') {
    $email = trim(strtolower($input['email'] ?? ''));
    if (empty($email)) {
        sendResponse(['error' => 'Informe o e-mail do usuário.'], 400);
    }

    $existingIndex = -1;
    foreach ($users as $i => $u) {
        if (isset($u['email']) && strtolower($u['email']) === $email) {
            $existingIndex = $i;
            break;
        }
    }

    if ($existingIndex >= 0) {
        // Atualiza campos se informados
        if (!empty($input['name'])) $users[$existingIndex]['name'] = trim($input['name']);
        if (!empty($input['phone'])) $users[$existingIndex]['phone'] = trim($input['phone']);
        if (!empty($input['company'])) $users[$existingIndex]['company'] = trim($input['company']);
        if (!empty($input['avatar'])) $users[$existingIndex]['avatar'] = $input['avatar'];
        writeJsonFile(USERS_FILE, $users);
        sendResponse(['success' => true, 'user' => $users[$existingIndex], 'updated' => true]);
    } else {
        $newUser = [
            'id' => $input['id'] ?? ('user_' . time() . '_' . rand(100, 999)),
            'name' => trim($input['name'] ?? $email),
            'email' => $email,
            'password' => trim($input['password'] ?? ('cli' . rand(1000, 9999))),
            'phone' => trim($input['phone'] ?? ''),
            'company' => trim($input['company'] ?? ''),
            'cpfCnpj' => trim($input['cpfCnpj'] ?? ''),
            'role' => $input['role'] ?? 'client',
            'avatar' => $input['avatar'] ?? ('https://api.dicebear.com/7.x/initials/svg?seed=' . urlencode($input['name'] ?? $email)),
            'createdAt' => $input['createdAt'] ?? date('c')
        ];
        $users[] = $newUser;
        writeJsonFile(USERS_FILE, $users);
        sendResponse(['success' => true, 'user' => $newUser, 'created' => true], 201);
    }
}

// ----------------------------------------------------
// PUT /api/users.php?id=... - Atualiza dados ou senha
// ----------------------------------------------------
if ($method === 'PUT') {
    $id = $_GET['id'] ?? $input['id'] ?? '';
    if (empty($id)) {
        sendResponse(['error' => 'ID do usuário não fornecido.'], 400);
    }

    $foundIndex = -1;
    foreach ($users as $i => $u) {
        if (($u['id'] ?? '') === $id) {
            $foundIndex = $i;
            break;
        }
    }

    if ($foundIndex < 0) {
        sendResponse(['error' => 'Usuário não encontrado.'], 404);
    }

    if (isset($input['password'])) {
        $newPass = trim($input['password']);
        if (strlen($newPass) < 4) {
            sendResponse(['error' => 'A senha deve ter pelo menos 4 caracteres.'], 400);
        }
        $users[$foundIndex]['password'] = $newPass;
    }
    if (isset($input['role'])) {
        $users[$foundIndex]['role'] = $input['role'];
    }
    if (isset($input['name'])) {
        $users[$foundIndex]['name'] = trim($input['name']);
    }
    if (isset($input['phone'])) {
        $users[$foundIndex]['phone'] = trim($input['phone']);
    }

    writeJsonFile(USERS_FILE, $users);
    sendResponse(['success' => true, 'user' => $users[$foundIndex]]);
}

// ----------------------------------------------------
// DELETE /api/users.php?id=... - Exclui usuário
// ----------------------------------------------------
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (empty($id)) {
        sendResponse(['error' => 'ID do usuário não fornecido.'], 400);
    }

    $initialCount = count($users);
    $users = array_values(array_filter($users, function($u) use ($id) {
        return ($u['id'] ?? '') !== $id;
    }));

    if (count($users) === $initialCount) {
        sendResponse(['error' => 'Usuário não encontrado.'], 404);
    }

    writeJsonFile(USERS_FILE, $users);
    sendResponse(['success' => true, 'message' => 'Usuário excluído com sucesso.']);
}

sendResponse(['error' => 'Método HTTP não suportado.'], 405);
