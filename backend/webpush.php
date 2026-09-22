<?php
// backend/webpush.php - Selvhostet Web Push (VAPID) uten eksterne tredjepartstjenester

class WebPushServer {
    private static $keysFile = __DIR__ . '/vapid_keys.php';
    private static $subject = 'mailto:kontakt@cosplayforalle.no';

    /**
     * Base64URL encoding (RFC 7515)
     */
    public static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64URL decoding (RFC 7515)
     */
    public static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Konverterer 65-byte rå P-256 public key til OpenSSL PEM-format
     */
    public static function rawPointToPem($rawPoint) {
        if (strlen($rawPoint) !== 65 || $rawPoint[0] !== "\x04") {
            return false;
        }
        // ASN.1 SPKI header for id-ecPublicKey med secp256r1 (prime256v1)
        $spkiHeader = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200');
        $der = $spkiHeader . $rawPoint;
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    /**
     * Henter eller genererer permanente VAPID-nøkler
     */
    public static function getVapidKeys() {
        if (file_exists(self::$keysFile)) {
            $keys = include self::$keysFile;
            if (is_array($keys) && !empty($keys['publicKey']) && !empty($keys['privateKey'])) {
                return $keys;
            }
        }

        // Generer nytt EC P-256 nøkkelpar via OpenSSL
        $config = [
            'curve_name' => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC
        ];
        $res = openssl_pkey_new($config);
        if (!$res) {
            throw new Exception("Kunne ikke generere VAPID-nøkkelpar via OpenSSL.");
        }

        openssl_pkey_export($res, $privatePem);
        $details = openssl_pkey_get_details($res);
        $rawPublicKey = "\x04" . $details['ec']['x'] . $details['ec']['y'];

        $keys = [
            'publicKey'  => self::base64UrlEncode($rawPublicKey),
            'privateKey' => self::base64UrlEncode($details['ec']['d']),
            'privatePem' => $privatePem
        ];

        // Lagre permanent på serveren
        $content = "<?php\n// Auto-generert VAPID-nøkkelpar for Cosplay for alle\nreturn " . var_export($keys, true) . ";\n";
        file_put_contents(self::$keysFile, $content);

        return $keys;
    }

    /**
     * Henter offentlig VAPID-nøkkel for frontend
     */
    public static function getPublicKey() {
        $keys = self::getVapidKeys();
        return $keys['publicKey'];
    }

    /**
     * Genererer VAPID JWT autorisasjonsheader (ES256)
     */
    private static function createVapidJwt($endpoint, $keys) {
        $parsed = parse_url($endpoint);
        $aud = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? '');
        if (!empty($parsed['port'])) {
            $aud .= ':' . $parsed['port'];
        }

        $header = ['typ' => 'JWT', 'alg' => 'ES256'];
        $claims = [
            'aud' => $aud,
            'exp' => time() + 86400,
            'sub' => self::$subject
        ];

        $tokenParts = [
            self::base64UrlEncode(json_encode($header)),
            self::base64UrlEncode(json_encode($claims))
        ];
        $signingInput = implode('.', $tokenParts);

        // Hent eller generer PEM for privat nøkkel
        $privateKeyResource = openssl_pkey_get_private($keys['privatePem'] ?? '');
        if (!$privateKeyResource) {
            $d = self::base64UrlDecode($keys['privateKey']);
            $x = self::base64UrlDecode($keys['publicKey']);
            // Bygg ASN.1 ECPrivateKey
            $curveOid = hex2bin('06082a8648ce3d030107'); // 1.2.840.10045.3.1.7
            $ecPrivDer = "\x30" . chr(strlen($d) + strlen($x) + strlen($curveOid) + 16)
                . "\x02\x01\x01" // version 1
                . "\x04" . chr(strlen($d)) . $d
                . "\xa0" . chr(strlen($curveOid) + 2) . "\x06\x08" . substr($curveOid, 2)
                . "\xa1" . chr(strlen($x) + 3) . "\x03" . chr(strlen($x) + 1) . "\x00" . $x;
            $privatePem = "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($ecPrivDer), 64, "\n") . "-----END EC PRIVATE KEY-----\n";
            $privateKeyResource = openssl_pkey_get_private($privatePem);
        }

        $derSignature = '';
        if (!openssl_sign($signingInput, $derSignature, $privateKeyResource, OPENSSL_ALGO_SHA256)) {
            throw new Exception("Kunne ikke signere VAPID JWT.");
        }

        // Konverter DER-signatur til 64-byte R || S (IEEE P1363)
        $rawSig = self::derToRawSignature($derSignature);
        return $signingInput . '.' . self::base64UrlEncode($rawSig);
    }

    /**
     * Konverterer ASN.1 DER signatur til IEEE P1363 R||S format (64 bytes)
     */
    private static function derToRawSignature($der) {
        $pos = 2; // Hopp over 0x30 og lengde
        $pos++; // 0x02
        $rLen = ord($der[$pos++]);
        $r = substr($der, $pos, $rLen);
        $pos += $rLen;

        $pos++; // 0x02
        $sLen = ord($der[$pos++]);
        $s = substr($der, $pos, $sLen);

        $r = ltrim($r, "\x00");
        $s = ltrim($s, "\x00");

        $r = str_pad($r, 32, "\x00", STR_PAD_LEFT);
        $s = str_pad($s, 32, "\x00", STR_PAD_LEFT);

        return $r . $s;
    }

    /**
     * Krypterer melding i henhold til RFC 8291 (aes128gcm)
     */
    public static function encryptPayload($payloadText, $clientPublicKeyBase64, $clientAuthBase64) {
        $clientPublicKey = self::base64UrlDecode($clientPublicKeyBase64);
        $clientAuth = self::base64UrlDecode($clientAuthBase64);

        if (strlen($clientPublicKey) !== 65 || strlen($clientAuth) < 16) {
            throw new Exception("Ugyldig public key eller auth secret fra PushSubscription.");
        }

        // Generer lokalt engangsnøkkelpar (ephemeral P-256)
        $ephemeral = openssl_pkey_new([
            'curve_name' => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC
        ]);
        $ephemDetails = openssl_pkey_get_details($ephemeral);
        $localPublicKey = "\x04" . $ephemDetails['ec']['x'] . $ephemDetails['ec']['y'];

        // ECDH: Beregn felles hemmelighet
        $clientPem = self::rawPointToPem($clientPublicKey);
        $clientKeyRes = openssl_pkey_get_public($clientPem);
        if (!$clientKeyRes) {
            throw new Exception("Kunne ikke laste klientens offentlige nøkkel.");
        }

        $sharedSecret = openssl_pkey_derive($clientKeyRes, $ephemeral, 32);
        if (!$sharedSecret) {
            throw new Exception("ECDH nøkkelutveksling feilet.");
        }

        $salt = random_bytes(16);

        // HKDF derivasjon i henhold til RFC 8291
        // PRK = HKDF-Extract(auth, shared_secret)
        $prkKeyInfo = "WebPush: info\x00" . $clientPublicKey . $localPublicKey;
        $prk = hash_hkdf('sha256', $sharedSecret, 32, $prkKeyInfo, $clientAuth);

        // Content Encryption Key (16 bytes)
        $cek = hash_hkdf('sha256', $prk, 16, "Content-Encoding: aes128gcm\x00", $salt);

        // Nonce (12 bytes)
        $nonce = hash_hkdf('sha256', $prk, 12, "Content-Encoding: nonce\x00", $salt);

        // Plaintext + RFC 8291 padding delimiter (\x02 for siste/eneste record)
        $padded = $payloadText . "\x02";

        // Krypter med AES-128-GCM
        $tag = '';
        $ciphertext = openssl_encrypt($padded, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);

        // Bygg binær RFC 8291 header + payload:
        // salt (16 bytes) || record_size (4 bytes: 4096 = 0x00001000) || id_len (1 byte = 65 = 0x41) || local_public_key (65 bytes) || ciphertext || tag (16 bytes)
        $recordSize = pack('N', 4096);
        $keyIdLen = chr(strlen($localPublicKey));

        return $salt . $recordSize . $keyIdLen . $localPublicKey . $ciphertext . $tag;
    }

    /**
     * Sender en Web Push-notifikasjon til en gitt PushSubscription
     * Returnerer statuskode (201 = Sendt, 404/410 = Utløpt abonnement)
     */
    public static function sendNotification($endpoint, $p256dh, $auth, $payloadArray) {
        $keys = self::getVapidKeys();
        $jwt = self::createVapidJwt($endpoint, $keys);

        $payloadJson = json_encode($payloadArray, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $encryptedBody = self::encryptPayload($payloadJson, $p256dh, $auth);

        $headers = [
            'Authorization: vapid t=' . $jwt . ', k=' . $keys['publicKey'],
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'TTL: 86400',
            'Urgency: normal'
        ];

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $encryptedBody);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            error_log("WebPush cURL feil for endpoint $endpoint: $error");
        }

        return $httpCode;
    }

    /**
     * Sender push-varsel til alle aktive abonnenter i databasen
     */
    public static function broadcastPush($pdo, $title, $body, $url = '/medlem') {
        try {
            $stmt = $pdo->query("SELECT id, endpoint, p256dh, auth FROM push_subscriptions");
            $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($subs)) {
                return ['total' => 0, 'sent' => 0, 'expired' => 0];
            }

            $payload = [
                'title' => $title,
                'body'  => $body,
                'icon'  => '/Media/Logo/icon-192.png',
                'badge' => '/Media/Logo/icon-192.png',
                'url'   => $url,
                'tag'   => 'post-' . time()
            ];

            $sent = 0;
            $expired = 0;
            $expiredIds = [];

            foreach ($subs as $sub) {
                if (empty($sub['endpoint']) || empty($sub['p256dh']) || empty($sub['auth'])) {
                    continue;
                }

                $code = self::sendNotification($sub['endpoint'], $sub['p256dh'], $sub['auth'], $payload);

                if ($code === 201 || $code === 200 || $code === 202) {
                    $sent++;
                } elseif ($code === 404 || $code === 410) {
                    // Utløpt eller avregistrert enhet
                    $expired++;
                    $expiredIds[] = $sub['id'];
                }
            }

            // Rydd opp utløpte abonnementer
            if (!empty($expiredIds)) {
                $inQuery = implode(',', array_map('intval', $expiredIds));
                $pdo->exec("DELETE FROM push_subscriptions WHERE id IN ($inQuery)");
            }

            return ['total' => count($subs), 'sent' => $sent, 'expired' => $expired];
        } catch (Exception $e) {
            error_log("WebPush broadcast feil: " . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }
}
