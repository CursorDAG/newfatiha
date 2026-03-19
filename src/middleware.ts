import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Protect /teacher routes
  if (pathname.startsWith("/teacher")) {
    // Allow access to pending-approval page
    if (pathname === "/teacher/pending-approval") {
      if (!token) {
        return NextResponse.redirect(new URL("/api/auth/signin", req.url));
      }
      if (token.role !== "TEACHER" && token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL("/api/auth/signin", req.url));
    }
    if (token.role !== "TEACHER" && token.role !== "ADMIN") {
      if (token.role === "STUDENT") {
        return NextResponse.redirect(new URL("/student", req.url));
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Block teachers with PENDING_APPROVAL or PENDING_VERIFICATION status
    if (token.role === "TEACHER" && token.status) {
      const status = token.status as string;
      if (status === "PENDING_APPROVAL" || status === "PENDING_VERIFICATION") {
        return NextResponse.redirect(new URL("/teacher/pending-approval", req.url));
      }
      if (status === "REJECTED") {
        return NextResponse.redirect(new URL("/auth/register/teacher", req.url));
      }
    }
  }

  // Protect /student routes
  if (pathname.startsWith("/student")) {
    if (!token) {
      return NextResponse.redirect(new URL("/api/auth/signin", req.url));
    }
    if (token.role !== "STUDENT" && token.role !== "ADMIN") {
      if (token.role === "TEACHER") {
        return NextResponse.redirect(new URL("/teacher", req.url));
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/api/auth/signin", req.url));
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Protect /moderator routes
  if (pathname.startsWith("/moderator")) {
    if (!token) {
      return NextResponse.redirect(new URL("/api/auth/signin", req.url));
    }
    if (token.role !== "MODERATOR" && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/teacher/:path*", "/student/:path*", "/admin/:path*", "/moderator/:path*"],
};
