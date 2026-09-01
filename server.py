#!/usr/bin/env python3
"""Local web server with a live CAG procurement synchronizer (stdlib only)."""
from __future__ import annotations

import json
import base64
import hashlib
import hmac
import os
import re
import smtplib
import threading
import time
from datetime import datetime
from email.message import EmailMessage
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
CAG_URL = "https://sesami.online/cag/businessOpportunities.jsp"
DATA_DIR = ROOT / "work"
SUBSCRIPTION_FILE = DATA_DIR / "subscription.json"


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_row = False
        self.in_cell = False
        self.cell = []
        self.row = []
        self.rows = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "tr":
            self.in_row, self.row = True, []
        elif self.in_row and tag in {"td", "th"}:
            self.in_cell, self.cell = True, []
        elif self.in_cell and tag == "br":
            self.cell.append(" ")

    def handle_data(self, data):
        if self.in_cell:
            self.cell.append(data)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if self.in_cell and tag in {"td", "th"}:
            value = re.sub(r"\s+", " ", "".join(self.cell)).strip()
            self.row.append(value)
            self.in_cell = False
        elif self.in_row and tag == "tr":
            if self.row:
                self.rows.append(self.row)
            self.in_row = False


def parse_cag() -> list[dict]:
    req = Request(CAG_URL, headers={"User-Agent": "TenderRadar/1.0 (+local dashboard)"})
    with urlopen(req, timeout=20) as response:
        html = response.read().decode("utf-8", "replace")
    parser = TableParser()
    parser.feed(html)
    result = []
    for cells in parser.rows:
        # S/No, Ref, Document Type, Category, Description, Starting, Closing, Action
        if len(cells) < 7 or not re.fullmatch(r"\d{4}/\d+", cells[1] if len(cells) > 1 else ""):
            continue
        try:
            closing = datetime.strptime(cells[6], "%d %b %Y %H:%M").strftime("%Y-%m-%d")
            starting = datetime.strptime(cells[5], "%d %b %Y %H:%M").strftime("%Y-%m-%d")
        except ValueError:
            continue
        result.append({
            "id": "CAG-" + cells[1].split("/")[-1], "source": "cag", "currency": "SGD",
            "region": "Singapore", "agency": "Changi Airport Group", "code": cells[1],
            "docType": cells[2], "category": cells[3], "title": cells[4],
            "date": starting, "deadline": closing, "budget": None, "match": 75, "status": "open",
            "sourceUrl": CAG_URL,
        })
    return result


def read_subscription() -> dict:
    try:
        return json.loads(SUBSCRIPTION_FILE.read_text("utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def write_subscription(data: dict) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    # Access tokens and SMTP passwords are environment variables and are never stored here.
    allowed = {k: data.get(k) for k in (
        "enabled", "emailEnabled", "lineEnabled", "email", "lineUserId", "time",
        "timezone", "limit", "includePrep", "includeOutline", "includeDeadlines",
        "onlyHighMatch", "lineLinked", "lastSentDate"
    )}
    SUBSCRIPTION_FILE.write_text(json.dumps(allowed, ensure_ascii=False, indent=2), "utf-8")


def prep_items(item: dict) -> list[str]:
    text = " ".join(str(item.get(k, "")) for k in ("title", "category", "agency")).lower()
    result = ["確認投標資格、採購方式與應備證明", "下載完整標書並建立疑義與送件時程"]
    if any(k in text for k in ("airport", "airfield", "terminal", "changi")):
        result.append("確認機場通行證、保安規範、禁區作業與保險要求")
    if any(k in text for k in ("cleaning", "housekeeping", "waste", "清潔")):
        result.append("盤點清潔頻率、人力班表、機具耗材及廢棄物處理")
    if any(k in text for k in ("system", "cloud", "software", "系統")):
        result.append("準備技術架構、資安、SLA、導入與維運計畫")
    return result[:3]


def build_server_digest(limit: int = 5) -> str:
    try:
        items = parse_cag()[:max(1, min(limit, 10))]
    except Exception:
        items = []
    lines = [f"標案雷達每日精選｜{datetime.now().strftime('%Y-%m-%d')}", ""]
    if not items:
        lines.append("今日暫無可同步的建議標案，請登入標案雷達查看最新狀態。")
    for idx, item in enumerate(items, 1):
        lines += [f"{idx}. {item['title']}", f"{item['agency']}｜截止 {item['deadline']}", "建議準備：" + "；".join(prep_items(item)), ""]
    lines.append("辨識結果僅供快速閱讀，投標內容請以原始招標文件為準。")
    return "\n".join(lines)


def send_email(recipient: str, subject: str, message: str) -> bool:
    host = os.getenv("SMTP_HOST")
    if not host or not recipient:
        return False
    port = int(os.getenv("SMTP_PORT", "587"))
    user, password = os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD")
    mail = EmailMessage()
    mail["Subject"], mail["From"], mail["To"] = subject, os.getenv("SMTP_FROM", user or "tender-radar@localhost"), recipient
    mail.set_content(message)
    with smtplib.SMTP(host, port, timeout=20) as smtp:
        if os.getenv("SMTP_TLS", "1") == "1":
            smtp.starttls()
        if user and password:
            smtp.login(user, password)
        smtp.send_message(mail)
    return True


def send_line(user_id: str, message: str) -> bool:
    token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
    if not token or not user_id:
        return False
    payload = json.dumps({"to": user_id, "messages": [{"type": "text", "text": message[:5000]}]}).encode()
    req = Request("https://api.line.me/v2/bot/message/push", data=payload, method="POST", headers={
        "Content-Type": "application/json", "Authorization": f"Bearer {token}"
    })
    with urlopen(req, timeout=20) as response:
        return response.status == 200


def dispatch(data: dict, message: str | None = None) -> list[str]:
    message = message or build_server_digest(int(data.get("limit", 5)))
    sent = []
    if data.get("emailEnabled") and send_email(str(data.get("email", "")), "標案雷達｜每日建議標案", message):
        sent.append("電子信箱")
    if data.get("lineEnabled") and send_line(str(data.get("lineUserId", "")), message):
        sent.append("LINE")
    return sent


def scheduler_loop() -> None:
    while True:
        try:
            data = read_subscription()
            if data.get("enabled"):
                now = datetime.now(ZoneInfo(data.get("timezone") or "Asia/Taipei"))
                today, current = now.strftime("%Y-%m-%d"), now.strftime("%H:%M")
                if current == data.get("time") and data.get("lastSentDate") != today:
                    if dispatch(data):
                        data["lastSentDate"] = today
                        write_subscription(data)
        except Exception as exc:
            print(f"Subscription scheduler: {exc}")
        time.sleep(30)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/subscriptions/status":
            data = read_subscription()
            user_id = str(data.get("lineUserId", ""))
            return self.send_json(200, {"ok": True, "lineLinked": bool(user_id), "maskedLineUserId": (user_id[:4] + "…" + user_id[-4:]) if len(user_id) > 10 else "", "enabled": bool(data.get("enabled"))})
        if path == "/api/sync/cag":
            try:
                data = parse_cag()
                body = json.dumps({"ok": True, "source": "cag", "count": len(data), "items": data}, ensure_ascii=False).encode()
                self.send_response(200)
            except Exception as exc:
                body = json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False).encode()
                self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 100_000:
                return self.send_json(400, {"ok": False, "error": "Invalid request body"})
            raw = self.rfile.read(length)
            if path == "/api/line/webhook":
                secret = os.getenv("LINE_CHANNEL_SECRET", "")
                signature = self.headers.get("x-line-signature", "")
                expected = base64.b64encode(hmac.new(secret.encode(), raw, hashlib.sha256).digest()).decode() if secret else ""
                if not secret:
                    return self.send_json(503, {"ok": False, "error": "LINE_CHANNEL_SECRET is not configured"})
                if not hmac.compare_digest(signature, expected):
                    return self.send_json(401, {"ok": False, "error": "Invalid LINE signature"})
                payload = json.loads(raw.decode("utf-8"))
                linked = []
                for event in payload.get("events", []):
                    user_id = (event.get("source") or {}).get("userId")
                    if user_id and event.get("type") in {"follow", "message", "postback"}:
                        config = read_subscription()
                        config.update({"lineUserId": user_id, "lineEnabled": True, "lineLinked": True})
                        write_subscription(config)
                        linked.append(user_id)
                return self.send_json(200, {"ok": True, "linked": len(linked)})
            data = json.loads(raw.decode("utf-8"))
            if path == "/api/subscriptions":
                existing = read_subscription()
                if not data.get("lineUserId") and existing.get("lineUserId"):
                    data["lineUserId"] = existing["lineUserId"]
                    data["lineLinked"] = True
                write_subscription(data)
                return self.send_json(200, {"ok": True, "saved": True})
            if path == "/api/subscriptions/test":
                config = data.get("subscription") or {}
                channels = dispatch(config, str(data.get("message") or build_server_digest(int(config.get("limit", 5)))))
                return self.send_json(200, {"ok": True, "sent": bool(channels), "channels": channels, "previewOnly": not bool(channels)})
            return self.send_json(404, {"ok": False, "error": "Not found"})
        except Exception as exc:
            return self.send_json(500, {"ok": False, "error": str(exc)})


if __name__ == "__main__":
    print("Tender Radar: http://localhost:8080")
    threading.Thread(target=scheduler_loop, daemon=True).start()
    ThreadingHTTPServer(("127.0.0.1", 8080), Handler).serve_forever()
