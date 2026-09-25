const crypto = require('crypto');

function verifySalesIqSignature(rawBody, signature, publicKeyPem) {
  if (!publicKeyPem) {
    throw new Error('SALESIQ_PUBLIC_KEY is missing');
  }
  if (!signature) return false;
  const verifier = crypto.createVerify('SHA256');
  verifier.update(rawBody);
  verifier.end();
  try {
    return verifier.verify(publicKeyPem, signature, 'base64');
  } catch {
    return false;
  }
}

function requireSalesIqSignature({ enabled, publicKeyPem }) {
  return (req, res, next) => {
    if (req.method === 'HEAD' || req.method === 'GET') return next();
    if (!enabled) return next();
    const signature = req.headers['x-siqsignature'];
    const raw = req.rawBody;
    if (!raw || !verifySalesIqSignature(raw, signature, publicKeyPem)) {
      return res.status(401).json({ error: 'invalid SalesIQ signature' });
    }
    return next();
  };
}

module.exports = { verifySalesIqSignature, requireSalesIqSignature };
