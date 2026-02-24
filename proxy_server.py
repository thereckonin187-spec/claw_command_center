#!/usr/bin/env python3
"""Oura API proxy server for Claw Command Center (standalone, port 5112)."""

from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import json

HOST = "0.0.0.0"
PORT = 5112
OURA_TOKEN = "4O6YTLVG2ATT6EN72QHRQM6P7SFD5VTI"
OURA_BASE = "https://api.ouraring.com/v2/usercollection"

ROUTES = {
    "/oura/sleep": "/daily_sleep",
    "/oura/readiness": "/daily_readiness",
    "/oura/activity": "/daily_activity",
    "/oura/heartrate": "/heartrate",
}


class OuraProxyHandler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        oura_path = ROUTES.get(parsed.path)

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

    def log_message(self, fmt, *args):
        print(f"[OURA] {args[0]}")


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), OuraProxyHandler)
    print(f"[OURA] Proxy server running on http://{HOST}:{PORT}")
    print(f"[OURA] Routes: {', '.join(ROUTES.keys())}")
    server.serve_forever()
