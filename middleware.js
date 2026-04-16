export const config = {
  matcher: ['/admin', '/dashboard', '/api/analyze', '/api/process-cv', '/api/send-invite'],
};

export default function middleware(req) {
  const AUTH_USER = process.env.ADMIN_USER || 'admin';
  const AUTH_PASS = process.env.ADMIN_PASS;

  if (!AUTH_PASS) return; // no password configured = no protection (dev mode)

  const auth = req.headers.get('authorization');

  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(':');
      if (user === AUTH_USER && pass === AUTH_PASS) return; // authenticated
    }
  }

  return new Response('Acceso restringido', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Alter5 Admin"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
