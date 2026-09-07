import { GoogleAuth } from 'google-auth-library';

const API = 'https://language.googleapis.com/v1/documents:analyzeEntities';
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

export async function analyzeEntities(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    const error = new Error('text_required');
    error.status = 400;
    throw error;
  }

  if (text.length > 20000) {
    const error = new Error('text_too_large');
    error.status = 413;
    throw error;
  }

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const response = await fetch(API, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token.token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      document: { type: 'PLAIN_TEXT', content: text },
      encodingType: 'UTF8'
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error('google_language_api_error');
    error.status = response.status >= 500 ? 502 : 400;
    error.details = payload?.error?.message ?? 'Google Natural Language API request failed';
    throw error;
  }

  return payload;
}
