<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Repositories\BaseRepository;
use App\Exceptions\BusinessException;

final class BackupService extends BaseRepository
{
    private Config $config;

    public function __construct()
    {
        parent::__construct();
        $this->config = Config::getInstance();
    }

    /**
     * Genera un dump SQL restaurable: incluye DDL (CREATE TABLE) y datos,
     * omitiendo columnas generadas (GENERATED ALWAYS AS ... STORED/VIRTUAL).
     */
    public function generarSql(): string
    {
        $db     = $this->config->get('DB_NAME', 'gestion_comercial');
        $tablas = $this->getTablasDatos();

        $sql  = "-- Gestión Comercial - Backup generado: " . date('Y-m-d H:i:s') . "\n";
        $sql .= "-- Base de datos: {$db}\n";
        $sql .= "-- Restaurar con: mysql -u root -p < este_archivo.sql\n\n";
        $sql .= "SET NAMES utf8mb4;\n";
        $sql .= "SET FOREIGN_KEY_CHECKS = 0;\n";
        $sql .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n";
        $sql .= "CREATE DATABASE IF NOT EXISTS `{$db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n";
        $sql .= "USE `{$db}`;\n\n";

        foreach ($tablas as $tabla) {
            $sql .= $this->dumpTabla($tabla);
        }

        // Triggers y vistas son parte del esquema: sin ellos el backup no
        // reproduce el comportamiento de la base original.
        $sql .= $this->dumpTriggers();
        $sql .= $this->dumpVistas();

        $sql .= "SET FOREIGN_KEY_CHECKS = 1;\n";

        // Registrar el backup en el log
        $this->insert(
            'INSERT INTO backups_log (nombre_archivo, tamanio_bytes, tablas_incluidas)
             VALUES (:nombre, :tamanio, :tablas)',
            [
                ':nombre'  => 'backup_' . date('Ymd_His') . '.sql',
                ':tamanio' => strlen($sql),
                ':tablas'  => implode(',', $tablas),
            ]
        );

        return $sql;
    }

    public function historialBackups(): array
    {
        return $this->query(
            'SELECT * FROM backups_log ORDER BY created_at DESC LIMIT 30'
        );
    }

    // ── Helpers privados ─────────────────────────────────────────────

    private function getTablasDatos(): array
    {
        // Orden de dependencias: primero las tablas padre.
        return [
            'categorias', 'tipos_gasto', 'proveedores', 'usuarios',
            'productos', 'historial_precios', 'stock_movimientos',
            'clientes', 'compras', 'detalle_compra', 'gastos_compra',
            'ventas', 'detalle_venta', 'pagos', 'gastos_reparto',
            'notificaciones',
        ];
    }

    private function dumpTriggers(): string
    {
        $triggers = $this->query('SHOW TRIGGERS');

        if ($triggers === []) {
            return '';
        }

        $sql = "-- Triggers\nDELIMITER $$\n\n";

        foreach ($triggers as $trigger) {
            $nombre = (string) ($trigger['Trigger'] ?? '');
            if ($nombre === '') {
                continue;
            }

            $create = $this->queryOne("SHOW CREATE TRIGGER `{$nombre}`");
            $ddl    = $create['SQL Original Statement'] ?? $create['Create Trigger'] ?? null;

            if ($ddl === null) {
                throw new BusinessException("No se pudo obtener el DDL del trigger '{$nombre}'.");
            }

            $sql .= "DROP TRIGGER IF EXISTS `{$nombre}`$$\n";
            $sql .= rtrim($ddl, ';') . "$$\n\n";
        }

        return $sql . "DELIMITER ;\n\n";
    }

    private function dumpVistas(): string
    {
        $vistas = $this->query(
            "SHOW FULL TABLES WHERE Table_type = 'VIEW'"
        );

        if ($vistas === []) {
            return '';
        }

        $sql = "-- Vistas\n";

        foreach ($vistas as $fila) {
            $nombre = (string) (reset($fila) ?: '');
            if ($nombre === '') {
                continue;
            }

            $create = $this->queryOne("SHOW CREATE VIEW `{$nombre}`");
            $ddl    = $create['Create View'] ?? null;

            if ($ddl === null) {
                throw new BusinessException("No se pudo obtener el DDL de la vista '{$nombre}'.");
            }

            $sql .= "DROP VIEW IF EXISTS `{$nombre}`;\n";
            $sql .= rtrim($ddl, ';') . ";\n\n";
        }

        return $sql;
    }

    private function dumpTabla(string $tabla): string
    {
        $create = $this->queryOne("SHOW CREATE TABLE `{$tabla}`");
        $ddl    = $create['Create Table'] ?? null;

        if ($ddl === null) {
            throw new BusinessException("No se pudo obtener el DDL de la tabla '{$tabla}'.");
        }

        $sql  = "-- Tabla: {$tabla}\n";
        $sql .= "DROP TABLE IF EXISTS `{$tabla}`;\n";
        $sql .= $ddl . ";\n\n";

        // Excluir columnas generadas: MySQL no permite insertarles valores.
        $columnas = $this->query("SHOW COLUMNS FROM `{$tabla}`");
        $dataCols = [];

        foreach ($columnas as $columna) {
            $extra = strtoupper((string) ($columna['Extra'] ?? ''));
            if (str_contains($extra, 'GENERATED')) {
                continue;
            }
            $dataCols[] = $columna['Field'];
        }

        if ($dataCols === []) {
            return $sql . "\n";
        }

        $colList = implode(', ', array_map(fn (string $c): string => "`{$c}`", $dataCols));
        $rows    = $this->query(
            "SELECT {$colList} FROM `{$tabla}`"
        );

        if ($rows === []) {
            return $sql . "\n";
        }

        $sql .= "INSERT INTO `{$tabla}` ({$colList}) VALUES\n";

        $values = [];
        foreach ($rows as $row) {
            $rowValues = [];
            foreach ($dataCols as $col) {
                $value = $row[$col] ?? null;
                $rowValues[] = $value === null
                    ? 'NULL'
                    : $this->pdo->quote((string) $value);
            }
            $values[] = '(' . implode(', ', $rowValues) . ')';
        }

        $sql .= implode(",\n", $values) . ";\n\n";

        return $sql;
    }
}
