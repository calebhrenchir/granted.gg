import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lightweight session check - only checks for session cookie presence
// Full auth verification is done in route handlers to avoid Edge bundle size limits
function hasSessionCookie(request: NextRequest): boolean {
  const sessionToken = request.cookies.get('next-auth.session-token') || 
                       request.cookies.get('__Secure-next-auth.session-token');
  return !!sessionToken;
}

// Extract subdomain from hostname
function getSubdomain(hostname: string): 'app' | null {
  // Handle Vercel dev (uses localhost with port or vercel.app subdomains)
  // Handle production (granted.gg and subdomains)
  // Handle local development (app.localhost)
  
  // Normalize hostname (remove port if present)
  const hostWithoutPort = hostname.split(':')[0];
  
  // Check for app subdomain
  if (hostWithoutPort.startsWith('app.') || hostWithoutPort === 'app.localhost') {
    return 'app';
  }
  
  return null;
}

export default async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const forwardedHost = request.headers.get('x-forwarded-host') || '';
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http';
  
  // For Vercel dev and production, prefer x-forwarded-host if available
  // Otherwise use the host header directly
  // The host header should contain the subdomain when accessed via app.localhost:3000
  let effectiveHost = forwardedHost || hostname;
  
  // Extract subdomain from the effective host
  const subdomain = getSubdomain(effectiveHost);
  const isAppSubdomain = subdomain === 'app';
  
  // Get the pathname
  const pathname = url.pathname;
  
  if (isAppSubdomain) {
    const isLoginPage = pathname === '/login' || pathname === '/app/login';
    const isApiRoute = pathname.startsWith('/api');
    const hasSession = hasSessionCookie(request);
    
    // On app subdomain, only allow routes from (main) and (admin) route groups
    // Block access to (marketing) and (link) routes
    
    // Define allowed routes from (main) route group
    const allowedMainRoutes = [
      '/login',
      '/home',
      '/links',
      '/link',
      '/profile',
      '/wallet',
      '/onboarding',
    ];
    
    // Check if this is an allowed (main) route
    const isAllowedMainRoute = allowedMainRoutes.some(route => 
      pathname === route || pathname.startsWith(`${route}/`)
    );
    
    // Check if this is an admin route
    const isAdminRoute = pathname.startsWith('/admin');
    
    // Check if this is a marketing route (should be blocked on app subdomain)
    const isMarketingRoute = pathname === '/' || 
      pathname.startsWith('/privacy') || 
      pathname.startsWith('/terms') || 
      pathname.startsWith('/removal');
    
    // Block routes that are not in (main) or (admin) groups
    // Allow API routes, admin routes, and allowed main routes
    if (!isApiRoute && !isAdminRoute && !isAllowedMainRoute && !isLoginPage) {
      // This is likely a marketing route or public link route - block it
      if (isMarketingRoute || pathname.match(/^\/[^\/]+$/)) {
        // Redirect to home page on app subdomain
        url.pathname = '/home';
        return NextResponse.redirect(url);
      }
    }
    
    // Check if this is an authenticated route (home, links, link/[id], profile, etc.)
    // but not login, admin, or API routes
    // Admin routes are accessible on app subdomain but require admin check in route handler
    const isAuthenticatedRoute = !isLoginPage && !isApiRoute && !isAdminRoute && (
      pathname === '/home' ||
      pathname.startsWith('/links') ||
      pathname.startsWith('/link/') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/wallet') ||
      pathname.startsWith('/onboarding')
    );
    
    // If accessing authenticated route without session cookie, redirect to login
    // Full auth verification is done in route handlers
    if (isAuthenticatedRoute && !hasSession) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    
    // If already on login page and has session, redirect to home
    // Full auth check is done in route handler
    if (isLoginPage && hasSession) {
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
    
    // If accessing /admin route, allow it (admin check happens in route handler)
    if (isAdminRoute) {
      // Admin routes are accessible on app subdomain
      // The route handler will verify admin status
      return NextResponse.rewrite(url);
    }
    
    // If accessing app subdomain, rewrite to /app/* routes
    // This will be handled by the (main) route group at app/(main)/app/*
    if (pathname.startsWith('/app')) {
      // Already has /app prefix, rewrite to same path (routes are at /app/*)
      return NextResponse.rewrite(url);
    } else {
      // No /app prefix, add it for internal routing but keep URL clean
      url.pathname = `/app${pathname === '/' ? '/home' : pathname}`;
      return NextResponse.rewrite(url);
    }
  } else {
    // If accessing main domain (marketing site), block access to /app/* routes
    // Redirect to home page if trying to access app routes
    if (pathname.startsWith('/app')) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    // Otherwise, let it pass through to (marketing) and (link) routes
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
