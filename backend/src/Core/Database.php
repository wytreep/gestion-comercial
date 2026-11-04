<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\DatabaseException;
use PDO;
use PDOException;

final class Database
{
    private static ?self $instance = null;
    private PDO $pdo;
    private int $savepointCounter = 0;

    private function __construct()
    {
        $cfg = Config::getInstance();
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $cfg->get('DB_HOST', 'db'),
            $cfg->get('DB_PORT', '3306'),
            $cfg->get('DB_NAME', 'gestion_comercial'),
            $cfg->get('DB_CHARSET', 'utf8mb4')
        );

        try {
            $this->pdo = new PDO(
                $dsn,
                $cfg->get('DB_USER'),
                $cfg->get('DB_PASSWORD'),
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                ]
            );
        } catch (PDOException $e) {
            throw new DatabaseException('No se pudo conectar a la base de datos: ' . $e->getMessage());
        }
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    /**
     * Ejecuta un callable dentro de una transacción.
     * Hace rollback automático si se lanza cualquier excepción.
     * Si ya hay una transacción abierta usa un savepoint para que los
     * servicios puedan anidarse sin perder la atomicidad del proceso padre.
     */
    public function transaction(callable $fn): mixed
    {
        if ($this->pdo->inTransaction()) {
            $savepoint = 'gcom_sp_' . (++$this->savepointCounter);
            $this->pdo->exec("SAVEPOINT {$savepoint}");
            try {
                $result = $fn($this);
                $this->pdo->exec("RELEASE SAVEPOINT {$savepoint}");
                return $result;
            } catch (\Throwable $e) {
                $this->pdo->exec("ROLLBACK TO SAVEPOINT {$savepoint}");
                $this->pdo->exec("RELEASE SAVEPOINT {$savepoint}");
                throw $e;
            }
        }

        $this->pdo->beginTransaction();
        try {
            $result = $fn($this);
            $this->pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
