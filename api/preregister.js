/** Vercel Serverless Function — Neon PostgreSQL via DATABASE_URL (server-side only). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PAYLOAD = 6000;

function respond(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(data);
}

/** Dependency injection permits tests without connecting to a real database. */
export function createHandler(getDb = async () => {
  const { neon } = await import('@neondatabase/serverless');
  return neon(process.env.DATABASE_URL);
}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return respond(res, 405, { ok: false, error: 'Méthode non autorisée.' });
    }
    if ((req.headers?.['content-type'] || 'application/json').split(';')[0] !== 'application/json') {
      return respond(res, 415, { ok: false, error: 'Format invalide.' });
    }
    const contentLength = Number(req.headers?.['content-length'] || 0);
    if (contentLength > MAX_PAYLOAD) return respond(res, 413, { ok: false, error: 'Contenu trop volumineux.' });
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return respond(res, 400, { ok: false, error: 'Données invalides.' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return respond(res, 400, { ok: false, error: 'Données invalides.' });
    }
    // Hidden honeypot input catches some bots. Real users never fill this field.
    if (body.website) return respond(res, 200, { ok: true });

    const fullName = typeof body.full_name === 'string' ? body.full_name.trim().replace(/\s+/g, ' ') : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const normalizedPhone = phone.replace(/[\s().-]/g, '');
    if (fullName.length < 2 || fullName.length > 80 || /[\u0000-\u001f]/.test(fullName)) {
      return respond(res, 400, { ok: false, error: 'Nom invalide.' });
    }
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return respond(res, 400, { ok: false, error: 'Adresse e-mail invalide.' });
    }
    if (!/^\+?\d{8,15}$/.test(normalizedPhone)) {
      return respond(res, 400, { ok: false, error: 'Numéro de téléphone invalide.' });
    }
    if (body.consent !== true) {
      return respond(res, 400, { ok: false, error: 'Le consentement est requis.' });
    }
    if (!process.env.DATABASE_URL) {
      console.error('Missing DATABASE_URL');
      return respond(res, 503, { ok: false, error: 'Le formulaire n’est pas encore activé. Contacte l’organisateur.' });
    }

    try {
      const sql = await getDb();
      const inserted = await sql`
        INSERT INTO public.anc_preregistrations
          (full_name, email, phone, consent_email, source)
        VALUES (${fullName}, ${email}, ${normalizedPhone}, ${true}, ${'anc-priority-landing'})
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `;
      return respond(res, inserted.length > 0 ? 201 : 200, {
        ok: true,
        already_registered: inserted.length === 0,
      });
    } catch (error) {
      console.error('Neon preregistration failed:', error?.code || error?.message || 'unknown');
      return respond(res, 502, { ok: false, error: 'Enregistrement impossible pour le moment. Réessaie plus tard.' });
    }
  };
}

export default createHandler();
