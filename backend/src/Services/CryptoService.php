<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use RuntimeException;

/**
 * Cifrado de datos sensibles en reposo (AES-256-GCM).
 *
 * Los campos de texto libre (direcciones, notas) se guardan cifrados en la
 * base de datos. El formato incluye versión para poder rotar la clave en el
 * futuro sin confundir valores antiguos con texto plano:
 *
 *   enc:v1:<base64(iv | tag | ciphertext)>
 *
 * Los valores sin el prefijo se devuelven tal cual, de modo que los registros
 * creados antes de activar el cifrado siguen funcionando mientras se migran.
 */
final class CryptoService
{
    private const PREFIJO = 'enc:v1:';
    private const METODO  = 'aes-256-gcm';
    private const IV_LEN  = 12;
    private const TAG_LEN = 16;

    private string $clave;

    public function __construct(?string $clave = null)
    {
        $cfg = Config::getInstance();
        $raw = $clave ?? $cfg->get('APP_KEY', '');

        if (preg_match('/^[0-9a-f]{64}$/i', $raw) === 1) {
            $this->clave = (string) hex2bin($raw);
        } elseif ($raw !== '') {
            $this->clave = hash('sha256', $raw, true);
        } else {
            // Sin APP_KEY se deriva del secreto JWT: no es ideal, pero evita
            // guardar texto plano y mantiene el arranque en desarrollo.
            $this->clave = hash('sha256', $cfg->get('JWT_SECRET'), true);
        }
    }

    public function cifrar(?string $texto): ?string
    {
        if ($texto === null || $texto === '') {
            return $texto;
        }
        if ($this->estaCifrado($texto)) {
            return $texto;
        }

        $iv  = random_bytes(self::IV_LEN);
        $tag = '';
        $ct  = openssl_encrypt($texto, self::METODO, $this->clave, OPENSSL_RAW_DATA, $iv, $tag, '', self::TAG_LEN);

        if ($ct === false) {
            throw new RuntimeException('No se pudo cifrar el dato.');
        }

        return self::PREFIJO . base64_encode($iv . $tag . $ct);
    }

    public function descifrar(?string $texto): ?string
    {
        if ($texto === null || !$this->estaCifrado($texto)) {
            return $texto;
        }

        $raw = base64_decode(substr($texto, strlen(self::PREFIJO)), true);
        if ($raw === false || strlen($raw) < self::IV_LEN + self::TAG_LEN) {
            return '';
        }

        $iv  = substr($raw, 0, self::IV_LEN);
        $tag = substr($raw, self::IV_LEN, self::TAG_LEN);
        $ct  = substr($raw, self::IV_LEN + self::TAG_LEN);

        $texto = openssl_decrypt($ct, self::METODO, $this->clave, OPENSSL_RAW_DATA, $iv, $tag);
        return $texto === false ? '' : $texto;
    }

    public function estaCifrado(?string $texto): bool
    {
        return is_string($texto) && str_starts_with($texto, self::PREFIJO);
    }
}
