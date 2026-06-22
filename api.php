<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'config.php';

try {
    // 1. Connect to MySQL without specifying database to create it if it doesn't exist
    $dsn = "mysql:host=" . DB_HOST;
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    
    // Connect to database
    $pdo->exec("USE `" . DB_NAME . "`");
    
    // 2. Initialize tables if they do not exist
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(64) NOT NULL,
        role VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");

    $pdo->exec("CREATE TABLE IF NOT EXISTS staff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
    ) ENGINE=InnoDB");

    $pdo->exec("CREATE TABLE IF NOT EXISTS supervisors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
    ) ENGINE=InnoDB");

    $pdo->exec("CREATE TABLE IF NOT EXISTS statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
    ) ENGINE=InnoDB");

    $pdo->exec("CREATE TABLE IF NOT EXISTS properties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
    ) ENGINE=InnoDB");

    $pdo->exec("CREATE TABLE IF NOT EXISTS daily_logs (
        id VARCHAR(50) PRIMARY KEY,
        date VARCHAR(10) NOT NULL,
        day VARCHAR(15) NOT NULL,
        propertyName VARCHAR(100) NOT NULL,
        dutyType VARCHAR(100) NOT NULL,
        startTime VARCHAR(10) NOT NULL,
        breakTime VARCHAR(50) DEFAULT '-',
        endTime VARCHAR(10) NOT NULL,
        workDetail TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        assignedStaff TEXT NOT NULL,
        assignedSupervisor TEXT NOT NULL,
        createdBy VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");

    // Pre-seed default Admin if users table is empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    if ($stmt->fetchColumn() == 0) {
        // Default Admin credentials: admin / admin123
        // SHA-256 of 'admin123' is '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2'
        $stmt = $pdo->prepare("INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            'u_' . round(microtime(true) * 1000),
            'System Admin',
            'admin',
            '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2',
            'Admin'
        ]);
    }

} catch (PDOException $e) {
    echo json_encode([
        'error' => true,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
    exit;
}

// 3. API Logic
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? $input['action'] ?? '';

switch ($action) {
    case 'login':
        $username = trim($input['username'] ?? '');
        $passwordHash = trim($input['passwordHash'] ?? '');
        
        $stmt = $pdo->prepare("SELECT id, name, username, role, password_hash FROM users WHERE LOWER(username) = LOWER(?)");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && $user['password_hash'] === $passwordHash) {
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'username' => $user['username'],
                    'role' => $user['role']
                ]
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid username or password.'
            ]);
        }
        break;

    case 'init_app':
        // Retrieve all logs
        $stmt = $pdo->query("SELECT * FROM daily_logs");
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // JSON decode staff/supervisor list arrays
        foreach ($logs as &$log) {
            $log['assignedStaff'] = json_decode($log['assignedStaff'], true) ?? explode(', ', $log['assignedStaff']);
            $log['assignedSupervisor'] = json_decode($log['assignedSupervisor'], true) ?? explode(', ', $log['assignedSupervisor']);
        }
        
        // Retrieve directories
        $staff = $pdo->query("SELECT name FROM staff ORDER BY name ASC")->fetchAll(PDO::FETCH_COLUMN);
        $supervisors = $pdo->query("SELECT name FROM supervisors ORDER BY name ASC")->fetchAll(PDO::FETCH_COLUMN);
        $statuses = $pdo->query("SELECT name FROM statuses ORDER BY name ASC")->fetchAll(PDO::FETCH_COLUMN);
        $properties = $pdo->query("SELECT name FROM properties ORDER BY name ASC")->fetchAll(PDO::FETCH_COLUMN);
        
        // Retrieve users (hide password hash)
        $users = $pdo->query("SELECT id, name, username, role FROM users")->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'logs' => $logs,
            'staff' => $staff,
            'supervisors' => $supervisors,
            'statuses' => $statuses,
            'properties' => $properties,
            'users' => $users
        ]);
        break;

    case 'save_log':
        $log = $input['log'] ?? null;
        if (!$log) {
            echo json_encode(['success' => false, 'message' => 'No log data provided']);
            break;
        }

        $assignedStaff = json_encode($log['assignedStaff'] ?? []);
        $assignedSupervisor = json_encode($log['assignedSupervisor'] ?? []);

        $stmt = $pdo->prepare("
            INSERT INTO daily_logs (id, date, day, propertyName, dutyType, startTime, breakTime, endTime, workDetail, status, assignedStaff, assignedSupervisor, createdBy)
            VALUES (:id, :date, :day, :propertyName, :dutyType, :startTime, :breakTime, :endTime, :workDetail, :status, :assignedStaff, :assignedSupervisor, :createdBy)
            ON DUPLICATE KEY UPDATE 
                date = VALUES(date),
                day = VALUES(day),
                propertyName = VALUES(propertyName),
                dutyType = VALUES(dutyType),
                startTime = VALUES(startTime),
                breakTime = VALUES(breakTime),
                endTime = VALUES(endTime),
                workDetail = VALUES(workDetail),
                status = VALUES(status),
                assignedStaff = VALUES(assignedStaff),
                assignedSupervisor = VALUES(assignedSupervisor),
                createdBy = VALUES(createdBy)
        ");

        $stmt->execute([
            'id' => $log['id'],
            'date' => $log['date'],
            'day' => $log['day'],
            'propertyName' => $log['propertyName'],
            'dutyType' => $log['dutyType'],
            'startTime' => $log['startTime'],
            'breakTime' => $log['breakTime'] ?? '-',
            'endTime' => $log['endTime'],
            'workDetail' => $log['workDetail'],
            'status' => $log['status'],
            'assignedStaff' => $assignedStaff,
            'assignedSupervisor' => $assignedSupervisor,
            'createdBy' => $log['createdBy']
        ]);

        echo json_encode(['success' => true]);
        break;

    case 'delete_log':
        $id = $input['id'] ?? '';
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'No ID provided']);
            break;
        }

        $stmt = $pdo->prepare("DELETE FROM daily_logs WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'clear_all_logs':
        $pdo->exec("DELETE FROM daily_logs");
        echo json_encode(['success' => true]);
        break;

    case 'sync_logs':
        $logs = $input['logs'] ?? [];
        if (empty($logs)) {
            echo json_encode(['success' => true, 'message' => 'No logs to sync']);
            break;
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO daily_logs (id, date, day, propertyName, dutyType, startTime, breakTime, endTime, workDetail, status, assignedStaff, assignedSupervisor, createdBy)
                VALUES (:id, :date, :day, :propertyName, :dutyType, :startTime, :breakTime, :endTime, :workDetail, :status, :assignedStaff, :assignedSupervisor, :createdBy)
                ON DUPLICATE KEY UPDATE 
                    date = VALUES(date),
                    day = VALUES(day),
                    propertyName = VALUES(propertyName),
                    dutyType = VALUES(dutyType),
                    startTime = VALUES(startTime),
                    breakTime = VALUES(breakTime),
                    endTime = VALUES(endTime),
                    workDetail = VALUES(workDetail),
                    status = VALUES(status),
                    assignedStaff = VALUES(assignedStaff),
                    assignedSupervisor = VALUES(assignedSupervisor),
                    createdBy = VALUES(createdBy)
            ");

            foreach ($logs as $log) {
                $assignedStaff = json_encode($log['assignedStaff'] ?? []);
                $assignedSupervisor = json_encode($log['assignedSupervisor'] ?? []);

                $stmt->execute([
                    'id' => $log['id'],
                    'date' => $log['date'],
                    'day' => $log['day'],
                    'propertyName' => $log['propertyName'],
                    'dutyType' => $log['dutyType'],
                    'startTime' => $log['startTime'],
                    'breakTime' => $log['breakTime'] ?? '-',
                    'endTime' => $log['endTime'],
                    'workDetail' => $log['workDetail'],
                    'status' => $log['status'],
                    'assignedStaff' => $assignedStaff,
                    'assignedSupervisor' => $assignedSupervisor,
                    'createdBy' => $log['createdBy']
                ]);
            }
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Sync failed: ' . $e->getMessage()]);
        }
        break;

    case 'save_staff_dir':
        $staff = $input['staff'] ?? [];
        $pdo->exec("DELETE FROM staff");
        if (!empty($staff)) {
            $stmt = $pdo->prepare("INSERT INTO staff (name) VALUES (?)");
            foreach ($staff as $name) {
                if (trim($name)) {
                    $stmt->execute([trim($name)]);
                }
            }
        }
        echo json_encode(['success' => true]);
        break;

    case 'save_supervisor_dir':
        $supervisors = $input['supervisors'] ?? [];
        $pdo->exec("DELETE FROM supervisors");
        if (!empty($supervisors)) {
            $stmt = $pdo->prepare("INSERT INTO supervisors (name) VALUES (?)");
            foreach ($supervisors as $name) {
                if (trim($name)) {
                    $stmt->execute([trim($name)]);
                }
            }
        }
        echo json_encode(['success' => true]);
        break;

    case 'save_status_dir':
        $statuses = $input['statuses'] ?? [];
        $pdo->exec("DELETE FROM statuses");
        if (!empty($statuses)) {
            $stmt = $pdo->prepare("INSERT INTO statuses (name) VALUES (?)");
            foreach ($statuses as $name) {
                if (trim($name)) {
                    $stmt->execute([trim($name)]);
                }
            }
        }
        echo json_encode(['success' => true]);
        break;

    case 'save_property_dir':
        $properties = $input['properties'] ?? [];
        $pdo->exec("DELETE FROM properties");
        if (!empty($properties)) {
            $stmt = $pdo->prepare("INSERT INTO properties (name) VALUES (?)");
            foreach ($properties as $name) {
                if (trim($name)) {
                    $stmt->execute([trim($name)]);
                }
            }
        }
        echo json_encode(['success' => true]);
        break;

    case 'save_user_dir':
        $users = $input['users'] ?? [];
        if (!empty($users)) {
            // Get all user IDs from the incoming list
            $incomingIds = array_map(function($u) { return $u['id']; }, $users);
            
            // Delete users from DB not in the incoming list
            $placeholders = implode(',', array_fill(0, count($incomingIds), '?'));
            $stmt = $pdo->prepare("DELETE FROM users WHERE id NOT IN ($placeholders)");
            $stmt->execute($incomingIds);
            
            foreach ($users as $u) {
                // Check if user already exists
                $stmtCheck = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
                $stmtCheck->execute([$u['id']]);
                $existingPass = $stmtCheck->fetchColumn();
                
                if ($existingPass !== false) {
                    // Update existing user details (leave password_hash intact)
                    $stmtUpdate = $pdo->prepare("UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?");
                    $stmtUpdate->execute([$u['name'], $u['username'], $u['role'], $u['id']]);
                } else {
                    // Insert new user (must have passwordHash)
                    $passHash = $u['passwordHash'] ?? '4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2'; // fallback default
                    $stmtInsert = $pdo->prepare("INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)");
                    $stmtInsert->execute([$u['id'], $u['name'], $u['username'], $passHash, $u['role']]);
                }
            }
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'User directory cannot be completely empty.']);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
        break;
}
?>
