import type { VercelRequest, VercelResponse } from '@vercel/node';

import { destroySession } from '../_lib/authSession.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').json({ error: 'Method not allowed' });
    return;
  }

  await destroySession(res, req);
  res.status(200).json({ ok: true });
}
