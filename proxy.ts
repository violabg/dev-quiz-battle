import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Public routes that are accessible without authentication
const isPublicRoute = createRouteMatcher([
  "/", // Home page
  "/auth(.*)", // All auth routes: /auth/login, /auth/sign-up, etc.
]);

// Protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard", // Dashboard pages
  "/game(.*)", // Game pages
  "/leaderboard(.*)", // Leaderboard page
  "/profile(.*)", // Profile page
  "/((?!auth|_next).)*", // All routes except auth and Next.js internals
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuthenticated = await convexAuth.isAuthenticated();

  // Allow public routes to be accessed without authentication
  if (isPublicRoute(request)) {
    return;
  }

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/auth/login");
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
