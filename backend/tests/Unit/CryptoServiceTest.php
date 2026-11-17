<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\CryptoService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * CryptoService — cifrado de campos sensibles en reposo (AES-256-GCM).
 *
 * Clave fija de 32 bytes (64 hex) para que los tests no dependan del .env.
 */
final class CryptoServiceTest extends TestCase
{
    private const CLAVE = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

    private CryptoService $crypto;

    protected function setUp(): void
    {
        $this->crypto = new CryptoService(self::CLAVE);
    }

    public function testCifrarYDescifrarDevuelveElTextoOriginal(): void
    {
        $texto = 'Calle 12 #34-56, Cali';

        $cifrado = $this->crypto->cifrar($texto);

        self::assertNotSame($texto, $cifrado);
        self::assertSame($texto, $this->crypto->descifrar($cifrado));
    }

    public function testElCifradoLlevaElPrefijoDeVersion(): void
    {
        self::assertStringStartsWith('enc:v1:', (string) $this->crypto->cifrar('dato'));
    }

    public function testCifrarDosVecesElMismoTextoProduceValoresDistintos(): void
    {
        // IV aleatorio por registro: dos cifrados del mismo dato no deben ser iguales.
        $texto = 'notas internas del cliente';

        $primero  = $this->crypto->cifrar($texto);
        $segundo  = $this->crypto->cifrar($texto);

        self::assertNotSame($primero, $segundo);
        self::assertSame($texto, $this->crypto->descifrar($primero));
        self::assertSame($texto, $this->crypto->descifrar($segundo));
    }

    public function testCifrarEsIdempotenteSobreUnValorYaCifrado(): void
    {
        $cifrado = $this->crypto->cifrar('Guadalajara de Buga');

        self::assertSame($cifrado, $this->crypto->cifrar($cifrado));
    }

    public function testCifrarConClaveDistintaGeneraOtroResultado(): void
    {
        $otro = new CryptoService(str_repeat('f', 64));

        self::assertNotSame(
            $this->crypto->cifrar('mismo texto'),
            $otro->cifrar('mismo texto')
        );
    }

    /**
     * @return array<string, array{?string}>
     */
    public static function valoresVacios(): array
    {
        return [
            'null'    => [null],
            'cadena vacía' => [''],
        ];
    }

    #[DataProvider('valoresVacios')]
    public function testCifrarValoresVaciosLosDevuelveSinTocar(?string $valor): void
    {
        self::assertSame($valor, $this->crypto->cifrar($valor));
    }

    public function testDescifrarTextoPlanoLegadoLoDevuelveTalCual(): void
    {
        // Retrofit transparente: los registros anteriores al cifrado siguen leyéndose.
        self::assertSame('Carrera 8 #12-34', $this->crypto->descifrar('Carrera 8 #12-34'));
    }

    public function testDescifrarConOtraClaveNoRevelaElTexto(): void
    {
        $cifrado = $this->crypto->cifrar('dato reservado');
        $otro    = new CryptoService(str_repeat('f', 64));

        // GCM valida el tag de autenticación: con clave incorrecta debe fallar en silencio.
        self::assertSame('', $otro->descifrar($cifrado));
        self::assertNotSame('dato reservado', $otro->descifrar($cifrado));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function payloadsCorruptos(): array
    {
        return [
            'base64 inválido'   => ['enc:v1:no-es-base64!!'],
            'demasiado corto'   => ['enc:v1:' . base64_encode('corto')],
            'vacío tras prefijo' => ['enc:v1:'],
        ];
    }

    #[DataProvider('payloadsCorruptos')]
    public function testDescifrarPayloadCorruptoDevuelveCadenaVacia(string $payload): void
    {
        self::assertSame('', $this->crypto->descifrar($payload));
    }

    public function testEstaCifradoDetectaSoloElPrefijoConocido(): void
    {
        self::assertTrue($this->crypto->estaCifrado('enc:v1:abc'));
        self::assertFalse($this->crypto->estaCifrado('enc:v2:abc'));
        self::assertFalse($this->crypto->estaCifrado('texto plano'));
        self::assertFalse($this->crypto->estaCifrado(null));
    }
}
