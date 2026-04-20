from __future__ import annotations

import socket
import struct

from app.settings import (
    CLAMAV_HOST,
    CLAMAV_PORT,
    CLAMAV_TIMEOUT_SECONDS,
    MALWARE_SCAN_FAIL_CLOSED,
    MALWARE_SCAN_MODE,
)


class MalwareScanError(RuntimeError):
    pass


class MalwareDetectedError(MalwareScanError):
    pass


_EICAR_SIGNATURE = (
    b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$"
    b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
)


def _scan_eicar(file_bytes: bytes) -> None:
    if _EICAR_SIGNATURE in file_bytes:
        raise MalwareDetectedError("Malware signature detected (EICAR test string)")


def _scan_clamav(file_bytes: bytes) -> None:
    try:
        with socket.create_connection((CLAMAV_HOST, CLAMAV_PORT), timeout=CLAMAV_TIMEOUT_SECONDS) as sock:
            sock.sendall(b"zINSTREAM\0")
            chunk_size = 8192
            offset = 0
            while offset < len(file_bytes):
                chunk = file_bytes[offset : offset + chunk_size]
                sock.sendall(struct.pack(">I", len(chunk)))
                sock.sendall(chunk)
                offset += len(chunk)
            sock.sendall(struct.pack(">I", 0))
            response = sock.recv(4096)
    except OSError as exc:
        raise MalwareScanError(f"ClamAV scan failed: {exc}") from exc

    response_text = response.decode("utf-8", errors="ignore")
    if "FOUND" in response_text.upper():
        raise MalwareDetectedError(response_text.strip())


def scan_upload_for_malware(file_bytes: bytes) -> None:
    if MALWARE_SCAN_MODE == "off":
        return

    _scan_eicar(file_bytes)

    if MALWARE_SCAN_MODE == "clamav":
        try:
            _scan_clamav(file_bytes)
        except MalwareDetectedError:
            raise
        except MalwareScanError:
            if MALWARE_SCAN_FAIL_CLOSED:
                raise
