import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Protect /teacher routes
  if (pathname.startsWith("/teacher")) {
    if (!token) {
      return NextResponse.redirect(new URL("/api/auth/signin", req.url));
    }
    if (token.role !== "TEACHER" && token.role !== "ADMIN") {
      if (token.role === "STUDENT") {
        return NextResponse.redirect(new URL("/student", req.url));
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/teacher/:path*", "/student/:path*"],
};
