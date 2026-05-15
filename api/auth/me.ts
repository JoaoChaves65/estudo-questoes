import type { VercelRequest, VercelResponse } from '@vercel/node';

import { findUserBySession, tryGetDbOr503 } from '../_lib/authSession.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').json({ error: 'Method not allowed' });
    return;
  }

  if (!tryGetDbOr503(res)) {
    return;
  }

  const user = await findUserBySession(req);
  if (!user) {
    res.status(200).json({ user: null });
    return;
  }

  res.status(200).json({ user: { id: user.id, email: user.email } });
}
