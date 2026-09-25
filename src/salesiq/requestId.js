function salesIqRequestId(payload) {
  const request = payload?.request || {};
  const id = request.id || payload.request_id || payload.requestId;
  return id != null && String(id).trim() ? String(id).trim() : null;
}

module.exports = { salesIqRequestId };
