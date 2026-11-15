
<?php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/config/database.php";

$secret = getenv("SOCIAL_MEDIA_SECRET") ?: "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET";

function response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function body() {
    return json_decode(file_get_contents("php://input"), true) ?? [];
}

function base64url($data) {
    return rtrim(strtr(base64_encode($data), "+/", "-_"), "=");
}

function createToken($userId) {
    global $secret;

    $payload = base64url(json_encode([
        "user_id" => (int)$userId,
        "exp" => time() + 86400 * 7
    ]));

    $signature = base64url(
        hash_hmac("sha256", $payload, $secret, true)
    );

    return $payload . "." . $signature;
}

function authenticate() {
    global $secret, $pdo;

    $headers = getallheaders();
    $auth = $headers["Authorization"] ?? "";

    if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $matches)) {
        response(["message" => "Authorization token required"], 401);
    }

    $parts = explode(".", $matches[1]);

    if (count($parts) !== 2) {
        response(["message" => "Invalid token"], 401);
    }

    [$payload, $signature] = $parts;

    $expected = base64url(
        hash_hmac("sha256", $payload, $secret, true)
    );

    if (!hash_equals($expected, $signature)) {
        response(["message" => "Invalid token"], 401);
    }

    $decoded = json_decode(
        base64_decode(strtr($payload, "-_", "+/")),
        true
    );

    if (!$decoded || ($decoded["exp"] ?? 0) < time()) {
        response(["message" => "Token expired"], 401);
    }

    $stmt = $pdo->prepare(
        "SELECT id, name, email FROM users WHERE id = ?"
    );
    $stmt->execute([$decoded["user_id"]]);

    $user = $stmt->fetch();

    if (!$user) {
        response(["message" => "User not found"], 401);
    }

    return $user;
}

$method = $_SERVER["REQUEST_METHOD"];
$path = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);

$base = "/social-media-api";
$route = substr($path, strlen($base));

if ($route === false || $route === $path) {
    response(["message" => "Invalid API path"], 404);
}

// =====================================
// REGISTER
// POST /social-media-api/register
// =====================================

if ($route === "/register" && $method === "POST") {

    $data = body();

    $name = trim($data["name"] ?? "");
    $email = trim($data["email"] ?? "");
    $password = $data["password"] ?? "";

    if ($name === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)
        || strlen($password) < 8) {
        response([
            "message" => "Enter valid name, email and password (minimum 8 characters)"
        ], 422);
    }

    $stmt = $pdo->prepare(
        "SELECT id FROM users WHERE email = ?"
    );
    $stmt->execute([$email]);

    if ($stmt->fetch()) {
        response(["message" => "Email already registered"], 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare(
        "INSERT INTO users (name, email, password)
         VALUES (?, ?, ?)"
    );

    $stmt->execute([$name, $email, $hash]);

    response([
        "message" => "Registration successful"
    ], 201);
}

// =====================================
// LOGIN
// POST /social-media-api/login
// =====================================

if ($route === "/login" && $method === "POST") {

    $data = body();

    $email = trim($data["email"] ?? "");
    $password = $data["password"] ?? "";

    $stmt = $pdo->prepare(
        "SELECT id, name, email, password
         FROM users WHERE email = ?"
    );

    $stmt->execute([$email]);

    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user["password"])) {
        response(["message" => "Invalid email or password"], 401);
    }

    $token = createToken($user["id"]);

    unset($user["password"]);

    response([
        "message" => "Login successful",
        "token" => $token,
        "user" => $user
    ]);
}

// =====================================
// GET CURRENT USER
// GET /social-media-api/me
// =====================================

if ($route === "/me" && $method === "GET") {

    $user = authenticate();

    response(["user" => $user]);
}

// =====================================
// GET ALL POSTS
// GET /social-media-api/posts
// =====================================

if ($route === "/posts" && $method === "GET") {

    $user = authenticate();

    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.content,
            p.created_at,
            u.id AS user_id,
            u.name AS author,
            COUNT(DISTINCT l.id) AS likes_count,
            COUNT(DISTINCT c.id) AS comments_count,
            MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END)
                AS liked_by_me
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON l.post_id = p.id
        LEFT JOIN comments c ON c.post_id = p.id
        GROUP BY p.id, p.content, p.created_at, u.id, u.name
        ORDER BY p.created_at DESC
    ");

    $stmt->execute([$user["id"]]);

    response(["posts" => $stmt->fetchAll()]);
}

// =====================================
// CREATE POST
// POST /social-media-api/posts
// =====================================

if ($route === "/posts" && $method === "POST") {

    $user = authenticate();
    $data = body();

    $content = trim($data["content"] ?? "");

    if ($content === "") {
        response(["message" => "Post content is required"], 422);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO posts (user_id, content) VALUES (?, ?)"
    );

    $stmt->execute([$user["id"], $content]);

    response([
        "message" => "Post created successfully",
        "id" => $pdo->lastInsertId()
    ], 201);
}

// =====================================
// DELETE POST
// DELETE /social-media-api/posts/{id}
// =====================================

if (preg_match('#^/posts/(\d+)$#', $route, $matches)
    && $method === "DELETE") {

    $user = authenticate();
    $postId = (int)$matches[1];

    $stmt = $pdo->prepare(
        "DELETE FROM posts WHERE id = ? AND user_id = ?"
    );

    $stmt->execute([$postId, $user["id"]]);

    if ($stmt->rowCount() === 0) {
        response(["message" => "Post not found or unauthorized"], 404);
    }

    response(["message" => "Post deleted successfully"]);
}

// =====================================
// LIKE / UNLIKE POST
// POST /social-media-api/posts/{id}/like
// =====================================

if (preg_match('#^/posts/(\d+)/like$#', $route, $matches)
    && $method === "POST") {

    $user = authenticate();
    $postId = (int)$matches[1];

    $stmt = $pdo->prepare("SELECT id FROM posts WHERE id = ?");
    $stmt->execute([$postId]);

    if (!$stmt->fetch()) {
        response(["message" => "Post not found"], 404);
    }

    $stmt = $pdo->prepare(
        "SELECT id FROM likes WHERE user_id = ? AND post_id = ?"
    );

    $stmt->execute([$user["id"], $postId]);

    if ($stmt->fetch()) {

        $stmt = $pdo->prepare(
            "DELETE FROM likes WHERE user_id = ? AND post_id = ?"
        );

        $stmt->execute([$user["id"], $postId]);

        $liked = false;

    } else {

        $stmt = $pdo->prepare(
            "INSERT INTO likes (user_id, post_id) VALUES (?, ?)"
        );

        $stmt->execute([$user["id"], $postId]);

        $liked = true;
    }

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM likes WHERE post_id = ?"
    );

    $stmt->execute([$postId]);

    response([
        "liked" => $liked,
        "likes_count" => (int)$stmt->fetchColumn()
    ]);
}

// =====================================
// GET COMMENTS
// GET /social-media-api/posts/{id}/comments
// =====================================

if (preg_match('#^/posts/(\d+)/comments$#', $route, $matches)
    && $method === "GET") {

    authenticate();
    $postId = (int)$matches[1];

    $stmt = $pdo->prepare("
        SELECT c.id, c.comment, c.created_at,
               u.id AS user_id, u.name AS author
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    ");

    $stmt->execute([$postId]);

    response(["comments" => $stmt->fetchAll()]);
}

// =====================================
// ADD COMMENT
// POST /social-media-api/posts/{id}/comments
// =====================================

if (preg_match('#^/posts/(\d+)/comments$#', $route, $matches)
    && $method === "POST") {

    $user = authenticate();
    $postId = (int)$matches[1];
    $data = body();

    $comment = trim($data["comment"] ?? "");

    if ($comment === "") {
        response(["message" => "Comment cannot be empty"], 422);
    }

    $stmt = $pdo->prepare(
        "SELECT id FROM posts WHERE id = ?"
    );

    $stmt->execute([$postId]);

    if (!$stmt->fetch()) {
        response(["message" => "Post not found"], 404);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO comments (user_id, post_id, comment)
         VALUES (?, ?, ?)"
    );

    $stmt->execute([$user["id"], $postId, $comment]);

    response(["message" => "Comment added successfully"], 201);
}

response(["message" => "API endpoint not found"], 404);
