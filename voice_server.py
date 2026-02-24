#!/usr/bin/env python3
"""Piper TTS + Oura API proxy + AI chat proxy for Claw Command Center."""

import json
import subprocess
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse

HOST = "0.0.0.0"
PORT = 5111
VOICE_MODEL = Path(__file__).resolve().parent / "voice" / "en_GB-alan-medium.onnx"

OURA_TOKEN = "4O6YTLVG2ATT6EN72QHRQM6P7SFD5VTI"
OURA_BASE = "https://api.ouraring.com/v2/usercollection"
OURA_ROUTES = {
    "/oura/sleep": "/daily_sleep",
    "/oura/readiness": "/daily_readiness",
    "/oura/activity": "/daily_activity",
    "/oura/heartrate": "/heartrate",
}

ANTHROPIC_KEY = "sk-ant-api03-UXNfSHnAU_LbtJyz7FsEmcX4suPakQ712P-czJWS5Z0XiVB53MjZQlc0W7xKE8DlcuHWZHOoR_SA4viTVd6j6Q-EP7LWwA"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


class Handler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    # ─── Oura proxy (GET) ─────────────────────────────────────
    def do_GET(self):
        parsed = urlparse(self.path)
        oura_path = OURA_ROUTES.get(parsed.path)

        if oura_path is None:
            self.send_response(404)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(b"Not found")
            return

        query = parsed.query
        url = f"{OURA_BASE}{oura_path}"
        if query:
            url += f"?{query}"

        req = Request(url, headers={"Authorization": f"Bearer {OURA_TOKEN}"})
        try:
            resp = urlopen(req)
            data = resp.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    # ─── POST routing ─────────────────────────────────────────
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/ai/chat":
            self._handle_ai_chat()
        else:
            self._handle_tts()

    # ─── AI Chat proxy ────────────────────────────────────────
    def _handle_ai_chat(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, ValueError):
            self.send_response(400)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(b"Invalid JSON")
            return

        payload_dict = {
            "model": body.get("model", "claude-sonnet-4-20250514"),
            "max_tokens": body.get("max_tokens", 1024),
            "system": body.get("system", ""),
            "messages": body.get("messages", []),
        }
        # Remove empty system to avoid API errors
        if not payload_dict["system"]:
            del payload_dict["system"]
        payload = json.dumps(payload_dict).encode()

        req = Request(
            ANTHROPIC_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
            },
        )
        try:
            resp = urlopen(req)
            data = resp.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            error_msg = str(e)
            # Try to read the error body if available
            if hasattr(e, "read"):
                try:
                    error_msg = e.read().decode()
                except Exception:
                    pass
            self.send_response(502)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": error_msg}).encode())

    # ─── TTS (POST /) ────────────────────────────────────────
    def _handle_tts(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            text = body.get("text", "").strip()
        except (json.JSONDecodeError, ValueError):
            self.send_response(400)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(b"Invalid JSON")
            return

        if not text:
            self.send_response(400)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(b"Missing text field")
            return

        if not VOICE_MODEL.exists():
            self.send_response(500)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(f"Voice model not found: {VOICE_MODEL}".encode())
            return

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            out_path = tmp.name

        try:
            subprocess.run(
                ["piper", "--model", str(VOICE_MODEL), "--output_file", out_path],
                input=text,
                text=True,
                check=True,
                capture_output=True,
            )
            wav_data = Path(out_path).read_bytes()
        except FileNotFoundError:
            self.send_response(500)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(b"piper binary not found in PATH")
            return
        except subprocess.CalledProcessError as e:
            self.send_response(500)
            self._cors_headers()
            self.end_headers()
            self.wfile.write(f"Piper error: {e.stderr}".encode())
            return
        finally:
            Path(out_path).unlink(missing_ok=True)

        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(wav_data)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(wav_data)

    def log_message(self, fmt, *args):
        print(f"[CCC] {args[0]}")


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), Handler)
    print(f"[CCC] Voice + Oura + AI server on http://{HOST}:{PORT}")
    print(f"[CCC] POST /            -> Piper TTS")
    print(f"[CCC] POST /ai/chat     -> Claude API proxy")
    print(f"[CCC] GET  /oura/sleep     -> Oura daily sleep")
    print(f"[CCC] GET  /oura/readiness -> Oura daily readiness")
    print(f"[CCC] GET  /oura/activity  -> Oura daily activity")
    print(f"[CCC] GET  /oura/heartrate -> Oura heart rate")
    print(f"[CCC] Voice model: {VOICE_MODEL}")
    server.serve_forever()
