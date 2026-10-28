export class NextRequest extends Request {
  get nextUrl(): URL {
    return new URL(this.url);
  }
}

export class NextResponse extends Response {
  static override json(data: unknown, init?: ResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return new NextResponse(JSON.stringify(data), { ...init, headers });
  }
}
