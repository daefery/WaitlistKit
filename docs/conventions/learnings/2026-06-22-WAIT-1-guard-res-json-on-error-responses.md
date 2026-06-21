---
ticket: WAIT-1
date: 2026-06-22
tag: CORRECTION
seen: 1
last_seen: 2026-06-22
status: active
---
A client calling `res.json()` on a non-2xx response assumes the error body is JSON — but a 4xx/5xx can arrive from a proxy/CDN/edge layer as HTML or plain text. On WAIT-1 a 400 handler parsed the body with no try/catch; a non-JSON body threw an unhandled rejection and the form silently hung with no error shown.

Lesson: always wrap error-response body parsing in try/catch (or guard on `content-type`) and fall back to a generic message when parsing fails. The fetch client must never assume the server (or an intermediary) returned well-formed JSON on the error path. Applies to every `fetch`-based form/submit handler.
