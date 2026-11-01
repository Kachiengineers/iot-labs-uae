"""The four HTTP calls the room node makes, and nothing else.

This module knows about the network and nothing about hardware. room_node.py
calls these functions; devices/ never imports this file.

Two kinds of failure are distinguished:
  ServerUnreachable - connection refused, timeout, DNS/network error, or a 5xx.
                      The node treats this as "offline".
  ApiError          - the server answered but rejected the request (4xx).
                      The server is up, so this is NOT offline; it is a bug
                      or bad data, and gets logged.
"""

import requests

import config


class ServerUnreachable(Exception):
    """The server could not be reached or failed internally (5xx)."""


class ApiError(Exception):
    """The server rejected the request (4xx)."""

    def __init__(self, status, message):
        super().__init__(f"HTTP {status}: {message}")
        self.status = status


_session = requests.Session()
_room_url = f"{config.API_BASE_URL}/rooms/{config.ROOM_ID}"


def _request(method, url, json=None):
    try:
        response = _session.request(method, url, json=json, timeout=config.REQUEST_TIMEOUT_S)
    except requests.RequestException as exc:
        # ConnectionError, Timeout, etc. Reduce to a short reason for the log.
        raise ServerUnreachable(type(exc).__name__) from exc

    if response.status_code >= 500:
        raise ServerUnreachable(f"HTTP {response.status_code}")
    if response.status_code >= 400:
        try:
            message = response.json().get("error", response.text)
        except ValueError:
            message = response.text
        raise ApiError(response.status_code, message)
    return response.json()


def post_reading(temperature, humidity):
    """POST /api/rooms/:id/readings"""
    return _request("POST", f"{_room_url}/readings",
                    {"temperature": round(temperature, 1), "humidity": round(humidity, 1)})


def set_occupancy(occupied):
    """PATCH /api/rooms/:id/occupancy"""
    return _request("PATCH", f"{_room_url}/occupancy", {"occupied": bool(occupied)})


def set_light(on):
    """PATCH /api/rooms/:id/light"""
    return _request("PATCH", f"{_room_url}/light", {"light": bool(on)})


def get_room():
    """GET /api/rooms/:id  -> dict with at least 'light' and 'occupied'."""
    return _request("GET", _room_url)
