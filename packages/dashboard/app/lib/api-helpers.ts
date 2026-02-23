/**
 * API route helper utilities for authentication and response formatting
 */

/**
 * Parse and validate the arachne_auth cookie from request headers
 * @returns Password string if valid cookie exists, null otherwise
 */
export function getAuthFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const authCookie = cookies.find(c => c.startsWith('arachne_auth='));
  
  if (!authCookie) {
    return null;
  }

  const password = authCookie.split('=')[1];
  return password || null;
}

/**
 * Require authentication for a route
 * @returns Password if authenticated, or Response with 401 error
 */
export function requireAuth(request: Request): string | Response {
  const password = getAuthFromCookie(request);
  
  if (!password) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return password;
}

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Create a response that sets the auth cookie
 */
export function setAuthCookie(password: string): Response {
  return new Response(
    JSON.stringify({ ok: true }), 
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `arachne_auth=${password}; HttpOnly; Path=/; SameSite=Strict; Max-Age=2592000` // 30 days
      }
    }
  );
}

/**
 * Create a response that clears the auth cookie
 */
export function clearAuthCookie(): Response {
  return new Response(
    JSON.stringify({ ok: true }), 
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'arachne_auth=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0'
      }
    }
  );
}
