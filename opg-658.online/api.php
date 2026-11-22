<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');
require_once 'config/database.php';
$action = $_GET['action'] ?? '';
$response = ['success' => false, 'message' => 'Неизвестное действие'];
switch ($action) {
    case 'get_users':
        $response = getUsers();
        break;
    case 'add_user':
        $response = addUser();
        break;
    case 'add_points':
        $response = addPoints();
        break;
    case 'remove_points':
        $response = removePoints();
        break;
    case 'get_history':
        $response = getHistory();
        break;
    case 'get_achievements':
        $response = getAchievements();
        break;
    case 'add_achievement':
        $response = addAchievement();
        break;
    case 'delete_achievement':
        $response = deleteAchievement();
        break;
    case 'get_system_settings':
        $response = getSystemSettings();
        break;
    case 'update_system_settings':
        $response = updateSystemSettings();
        break;
    case 'calculate_points':
        $response = calculatePoints();
        break;
}
echo json_encode($response, JSON_UNESCAPED_UNICODE);
function getUsers() {
    try {
        $sql = "SELECT id, username, avatar, role, total_points, created_at FROM users ORDER BY total_points DESC";
        $users = fetchAll($sql);
        return ['success' => true, 'data' => $users];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка получения пользователей: ' . $e->getMessage()];
    }
}
function addUser() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['username'])) {
        return ['success' => false, 'message' => 'Имя пользователя обязательно'];
    }
    try {
        $sql = "INSERT INTO users (username, avatar, role) VALUES (?, ?, ?)";
        executeQuery($sql, [$data['username'], $data['avatar'] ?? '👤', $data['role'] ?? 'user']);
        return ['success' => true, 'message' => 'Пользователь добавлен успешно'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка добавления пользователя: ' . $e->getMessage()];
    }
}
function addPoints() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['user_id']) || !isset($data['points']) || !isset($data['reason'])) {
        return ['success' => false, 'message' => 'Не все поля заполнены'];
    }
    try {
        $pdo = getDBConnection();
        $pdo->beginTransaction();
        $sql = "INSERT INTO points_operations (user_id, points, operation_type, reason, admin_id) VALUES (?, ?, 'add', ?, ?)";
        executeQuery($sql, [$data['user_id'], $data['points'], $data['reason'], $data['admin_id'] ?? 1]);
        $sql = "UPDATE users SET total_points = total_points + ? WHERE id = ?";
        executeQuery($sql, [$data['points'], $data['user_id']]);
        $pdo->commit();
        checkAchievements($data['user_id']);
        return ['success' => true, 'message' => 'Очки добавлены успешно'];
    } catch (Exception $e) {
        if (isset($pdo)) $pdo->rollBack();
        return ['success' => false, 'message' => 'Ошибка добавления очков: ' . $e->getMessage()];
    }
}
function removePoints() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['user_id']) || !isset($data['points']) || !isset($data['reason'])) {
        return ['success' => false, 'message' => 'Не все поля заполнены'];
    }
    try {
        $pdo = getDBConnection();
        $pdo->beginTransaction();
        $sql = "INSERT INTO points_operations (user_id, points, operation_type, reason, admin_id) VALUES (?, ?, 'remove', ?, ?)";
        executeQuery($sql, [$data['user_id'], $data['points'], $data['reason'], $data['admin_id'] ?? 1]);
        $sql = "UPDATE users SET total_points = total_points - ? WHERE id = ?";
        executeQuery($sql, [$data['points'], $data['user_id']]);
        $pdo->commit();
        return ['success' => true, 'message' => 'Очки списаны успешно'];
    } catch (Exception $e) {
        if (isset($pdo)) $pdo->rollBack();
        return ['success' => false, 'message' => 'Ошибка списания очков: ' . $e->getMessage()];
    }
}
function getHistory() {
    try {
        $sql = "SELECT po.*, u.username, u.avatar, a.username as admin_name
                FROM points_operations po
                JOIN users u ON po.user_id = u.id
                LEFT JOIN users a ON po.admin_id = a.id
                ORDER BY po.created_at DESC
                LIMIT 100";
        $history = fetchAll($sql);
        return ['success' => true, 'data' => $history];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка получения истории: ' . $e->getMessage()];
    }
}
function getAchievements() {
    try {
        $sql = "SELECT * FROM achievements ORDER BY points_required ASC";
        $achievements = fetchAll($sql);
        return ['success' => true, 'data' => $achievements];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка получения достижений: ' . $e->getMessage()];
    }
}
function addAchievement() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['name']) || !isset($data['description'])) {
        return ['success' => false, 'message' => 'Не все поля заполнены'];
    }
    try {
        $sql = "INSERT INTO achievements (name, description, icon, points_required) VALUES (?, ?, ?, ?)";
        executeQuery($sql, [
            $data['name'],
            $data['description'],
            $data['icon'] ?? '🏆',
            $data['points_required'] ?? 0
        ]);
        return ['success' => true, 'message' => 'Достижение добавлено успешно'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка добавления достижения: ' . $e->getMessage()];
    }
}
function deleteAchievement() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['id'])) {
        return ['success' => false, 'message' => 'ID достижения не указан'];
    }
    try {
        executeQuery("DELETE FROM user_achievements WHERE achievement_id = ?", [$data['id']]);
        executeQuery("DELETE FROM achievements WHERE id = ?", [$data['id']]);
        return ['success' => true, 'message' => 'Достижение удалено успешно'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка удаления достижения: ' . $e->getMessage()];
    }
}
function getSystemSettings() {
    try {
        $sql = "SELECT * FROM system_settings";
        $settings = fetchAll($sql);
        $formatted = [];
        foreach ($settings as $setting) {
            $formatted[$setting['setting_key']] = $setting['setting_value'];
        }
        return ['success' => true, 'data' => $formatted];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка получения настроек: ' . $e->getMessage()];
    }
}
function updateSystemSettings() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['settings'])) {
        return ['success' => false, 'message' => 'Настройки не указаны'];
    }
    try {
        foreach ($data['settings'] as $key => $value) {
            $sql = "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?";
            executeQuery($sql, [$value, $key]);
        }
        return ['success' => true, 'message' => 'Настройки обновлены успешно'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Ошибка обновления настроек: ' . $e->getMessage()];
    }
}
function calculatePoints() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['an']) || !isset($data['ao'])) {
        return ['success' => false, 'message' => 'Не все поля заполнены'];
    }
    $an = floatval($data['an']);
    $ao = floatval($data['ao']);
    if ($ao <= 0) {
        return ['success' => false, 'message' => 'Общая работа должна быть больше 0'];
    }
    $k = $an / $ao;
    if ($k > 0.5) {
        $result = $an * $k;
    } else {
        $result = $an * (1 - $k);
    }
    return [
        'success' => true,
        'data' => [
            'coefficient' => round($k, 4),
            'points' => round($result),
            'formula' => $k > 0.5 ? 'N = An × k' : 'N = An × (1 - k)'
        ]
    ];
}
function checkAchievements($userId) {
    try {
        $user = fetchOne("SELECT total_points FROM users WHERE id = ?", [$userId]);
        if (!$user) return;
        $totalPoints = $user['total_points'];
        $achievements = fetchAll("SELECT * FROM achievements");
        foreach ($achievements as $achievement) {
            $existing = fetchOne(
                "SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?",
                [$userId, $achievement['id']]
            );
            if (!$existing && $totalPoints >= $achievement['points_required']) {
                $sql = "INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)";
                executeQuery($sql, [$userId, $achievement['id']]);
            }
        }
    } catch (Exception $e) {
        error_log("Ошибка проверки достижений: " . $e->getMessage());
    }
}
?>