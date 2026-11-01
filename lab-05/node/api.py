"""The four HTTP requests the room node makes, and nothing else.

This module talks to the server and knows nothing about hardware.
room_node.py calls it; devices/ never imports it.

Every request has a timeout (config.REQUEST_TIMEOUT), so a missing server can
never hang the main loop. Failures are raised as one of two exceptions:

    ServerUnreachable  connection refused, timeout, no network, or a 5xx reply.
                       The node treats this as "offline".
    ApiError           the server answered but rejected the request (4xx), e.g.
                       a wrong ROOM_ID. The server is up, so this is not offline.
"""
import requests

import config


class ServerUnreachable(Exception):
    """The server could not be reached, or failed internally (5xx)."""


class ApiError(Exception):
    """The server rejected the request (4xx)."""


_session = requests.Session()   # reuses the TCP connection between requests
_ROOM_URL = f"{config.API_BASE_URL}/rooms/{config.ROOM_ID}"


def _request(method, url, body=None):
    try:
        response = _session.request(method, url, json=body, timeout=config.REQUEST_TIMEOUT)
    except requests.RequestException as err:
        # ConnectionError, Timeout, ... : reduce to a short name for the log.
        raise ServerUnreachable(type(err).__name__) from err

    if response.status_code >= 500:
        raise ServerUnreachable(f"HTTP {response.status_code}")
    if response.status_code >= 400:
        try:
            message = response.json().get("message", response.text)
        except ValueError:
            message = response.text
        raise ApiError(f"HTTP {response.status_code}: {message}")
    return response.json()


def post_reading(temperature, humidity):
    """POST /api/rooms/:id/readings"""
    return _request("POST", f"{_ROOM_URL}/readings",
                    {"temperature": round(temperature, 1), "humidity": round(humidity, 1)})


def set_occupancy(occupied):
    """PATCH /api/rooms/:id/occupancy"""
    return _request("PATCH", f"{_ROOM_URL}/occupancy", {"occupied": bool(occupied)})


def set_light(light):
    """PATCH /api/rooms/:id/light"""
    return _request("PATCH", f"{_ROOM_URL}/light", {"light": bool(light)})


def get_room():
    """GET /api/rooms/:id  ->  {"id", "name", "light", "occupied"}"""
    return _request("GET", _ROOM_URL)
