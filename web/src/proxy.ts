import { NextResponse, type NextRequest } from "next/server";

// Быстрый отсев: без cookie в админку не пускаем. Сессия проверяется в requireAdmin().
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (!request.cookies.has("bp_admin")) {
    // clone() сохраняет basePath демо-сборки
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
