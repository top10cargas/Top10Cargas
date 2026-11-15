<?php
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$input = getJsonInput();
$users = readJsonFile(USERS_FILE, []);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // ----------------------------------------------------
    // CADASTRO / REGISTRO DE USUÁRIO
    // ----------------------------------------------------
    if ($action === 'register') {
        $email = trim(strtolower($input['email'] ?? ''));
        $name = trim($input['name'] ?? '');
        $password = trim($input['password'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $company = trim($input['company'] ?? '');
        $cpfCnpj = trim($input['cpfCnpj'] ?? '');
        $avatar = $input['avatar'] ?? null;

        if (empty($email)) {
            sendResponse(['error' => 'Informe um e-mail válido para o cadastro.'], 400);
        }
        if (strlen($password) < 4) {
            sendResponse(['error' => 'A senha deve ter pelo menos 4 caracteres.'], 400);
        }

        // Verifica duplicidade por email ou cpf
        foreach ($users as $u) {
            if (isset($u['email']) && strtolower($u['email']) === $email) {
                sendResponse(['error' => 'Já existe uma conta cadastrada com este e-mail.'], 409);
            }
            if (!empty($cpfCnpj) && !empty($u['cpfCnpj']) && preg_replace('/\D/', '', $u['cpfCnpj']) === preg_replace('/\D/', '', $cpfCnpj)) {
                sendResponse(['error' => 'Já existe uma conta cadastrada com este CPF/CNPJ.'], 409);
            }
        }

        $newUser = [
            'id' => 'user_' . time() . '_' . rand(100, 999),
            'name' => $name ?: $email,
            'email' => $email,
            'password' => $password,
            'phone' => $phone,
            'company' => $company,
            'cpfCnpj' => $cpfCnpj,
            'role' => 'client',
            'avatar' => $avatar ?: 'https://api.dicebear.com/7.x/initials/svg?seed=' . urlencode($name ?: 'Cliente'),
            'createdAt' => date('c')
        ];

        $users[] = $newUser;
        writeJsonFile(USERS_FILE, $users);

        sendResponse([
            'success' => true,
            'user' => $newUser
        ], 201);
    }

    // ----------------------------------------------------
    // LOGIN DE USUÁRIO OU ADMINISTRADOR
    // ----------------------------------------------------
    if ($action === 'login') {
        $identifier = trim(strtolower($input['identifier'] ?? $input['email'] ?? ''));
        $password = trim($input['password'] ?? '');

        if (empty($identifier) || empty($password)) {
            sendResponse(['error' => 'Preencha o identificador (e-mail ou CPF) e a senha.'], 400);
        }

        // Verificação do administrador
        global $ADMIN_CREDENTIALS;
        if ($identifier === strtolower($ADMIN_CREDENTIALS['email'])) {
            if ($password !== $ADMIN_CREDENTIALS['password']) {
                sendResponse(['error' => 'Senha incorreta para a conta de administrador.'], 401);
            }
            $adminUser = null;
            foreach ($users as $u) {
                if (isset($u['email']) && strtolower($u['email']) === $identifier) {
                    $adminUser = $u;
                    break;
                }
            }
            if (!$adminUser) {
                $adminUser = [
                    'id' => 'user_admin_top10',
                    'name' => $ADMIN_CREDENTIALS['name'],
                    'email' => $ADMIN_CREDENTIALS['email'],
                    'role' => 'admin',
                    'company' => $ADMIN_CREDENTIALS['company']
                ];
            }
            sendResponse(['success' => true, 'user' => $adminUser]);
        }

        // Verificação de clientes
        $digitsOnly = preg_replace('/\D/', '', $identifier);
        $foundUser = null;

        foreach ($users as $u) {
            if (isset($u['email']) && strtolower($u['email']) === $identifier) {
                $foundUser = $u;
                break;
            }
            if (strlen($digitsOnly) >= 8) {
                $uCpf = preg_replace('/\D/', '', $u['cpfCnpj'] ?? '');
                $uPhone = preg_replace('/\D/', '', $u['phone'] ?? '');
                if ($uCpf === $digitsOnly || $uPhone === $digitsOnly) {
                    $foundUser = $u;
                    break;
                }
            }
        }

        if (!$foundUser) {
            sendResponse(['error' => 'Conta não encontrada. Verifique os dados ou crie uma conta.'], 404);
        }

        if (trim($foundUser['password'] ?? '') !== $password) {
            sendResponse(['error' => 'Senha incorreta. Verifique e tente novamente.'], 401);
        }

        sendResponse(['success' => true, 'user' => $foundUser]);
    }
}

sendResponse(['error' => 'Ação não suportada.'], 400);
