import { getStore } from '@netlify/blobs';
import { handle } from './lib/images-core.mjs';

export default async (req) => handle(req, getStore('fish-images'), process.env);
export const config = { path: ['/api/img', '/api/img/*'] };
