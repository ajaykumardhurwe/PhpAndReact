
<?php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/config/database.php";

$database = new Database();
$db = $database->connect();

$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents("php://input"), true);

function sendResponse($success, $message, $data = null, $status = 200)
{
    http_response_code($status);

    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ]);

    exit;
}

function validateBook($input)
{
    if (
        !is_array($input) ||
        empty(trim($input['title'] ?? '')) ||
        empty(trim($input['author'] ?? '')) ||
        empty(trim($input['isbn'] ?? '')) ||
        empty(trim($input['category'] ?? ''))
    ) {
        sendResponse(false, "All book fields are required", null, 400);
    }

    $quantity = filter_var(
        $input['quantity'] ?? null,
        FILTER_VALIDATE_INT
    );

    if ($quantity === false || $quantity < 1) {
        sendResponse(false, "Quantity must be at least 1", null, 400);
    }

    return [
        "title" => trim($input['title']),
        "author" => trim($input['author']),
        "isbn" => trim($input['isbn']),
        "category" => trim($input['category']),
        "quantity" => $quantity
    ];
}

try {

    // READ: Get all books or search books
    if ($method === "GET") {

        $search = trim($_GET['search'] ?? '');

        if ($search !== '') {

            $sql = "SELECT * FROM books
                    WHERE title LIKE :search
                    OR author LIKE :search
                    OR isbn LIKE :search
                    ORDER BY id DESC";

            $stmt = $db->prepare($sql);
            $stmt->execute([
                ':search' => "%$search%"
            ]);

        } else {

            $stmt = $db->query(
                "SELECT * FROM books ORDER BY id DESC"
            );
        }

        $books = $stmt->fetchAll();

        sendResponse(true, "Books fetched successfully", $books);
    }

    // CREATE: Add new book
    if ($method === "POST") {

        $book = validateBook($input);

        $sql = "INSERT INTO books
                (title, author, isbn, category, quantity, available)
                VALUES
                (:title, :author, :isbn, :category, :quantity, :available)";

        $stmt = $db->prepare($sql);

        $stmt->execute([
            ':title' => $book['title'],
            ':author' => $book['author'],
            ':isbn' => $book['isbn'],
            ':category' => $book['category'],
            ':quantity' => $book['quantity'],
            ':available' => $book['quantity']
        ]);

        sendResponse(
            true,
            "Book added successfully",
            ['id' => $db->lastInsertId()],
            201
        );
    }

    // UPDATE: Update existing book
    if ($method === "PUT") {

        $id = filter_var(
            $input['id'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (!$id || $id < 1) {
            sendResponse(false, "Valid book ID is required", null, 400);
        }

        $book = validateBook($input);

        $stmt = $db->prepare(
            "SELECT id, quantity, available FROM books WHERE id = :id"
        );
        $stmt->execute([':id' => $id]);

        $existing = $stmt->fetch();

        if (!$existing) {
            sendResponse(false, "Book not found", null, 404);
        }

        $borrowed = (int)$existing['quantity'] -
                    (int)$existing['available'];

        if ($book['quantity'] < $borrowed) {
            sendResponse(
                false,
                "Quantity cannot be less than borrowed books",
                null,
                400
            );
        }

        $newAvailable = $book['quantity'] - $borrowed;

        $sql = "UPDATE books SET
                title = :title,
                author = :author,
                isbn = :isbn,
                category = :category,
                quantity = :quantity,
                available = :available
                WHERE id = :id";

        $stmt = $db->prepare($sql);

        $stmt->execute([
            ':title' => $book['title'],
            ':author' => $book['author'],
            ':isbn' => $book['isbn'],
            ':category' => $book['category'],
            ':quantity' => $book['quantity'],
            ':available' => $newAvailable,
            ':id' => $id
        ]);

        sendResponse(true, "Book updated successfully");
    }

    // DELETE: Delete book
    if ($method === "DELETE") {

        $id = filter_var(
            $_GET['id'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (!$id || $id < 1) {
            sendResponse(false, "Valid book ID is required", null, 400);
        }

        $stmt = $db->prepare(
            "DELETE FROM books WHERE id = :id"
        );

        $stmt->execute([':id' => $id]);

        if ($stmt->rowCount() === 0) {
            sendResponse(false, "Book not found", null, 404);
        }

        sendResponse(true, "Book deleted successfully");
    }

    sendResponse(false, "Method not allowed", null, 405);

} catch (PDOException $e) {

    if ($e->getCode() == 23000) {
        sendResponse(false, "This ISBN already exists", null, 409);
    }

    sendResponse(false, "Database operation failed", null, 500);

} catch (Throwable $e) {

    sendResponse(false, "Something went wrong", null, 500);
}
