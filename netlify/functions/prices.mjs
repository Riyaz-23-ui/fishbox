/* GET  /api/prices -> today's rates (public)
   POST /api/prices -> save rates (needs ADMIN_PASSWORD) */
import { getStore } from '@netlify/blobs';
import { handle } from './lib/prices-core.mjs';

export default async (req) => handle(req, getStore('fish-shop'), process.env);
export const config = { path: '/api/prices' };
