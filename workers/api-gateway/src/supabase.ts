/**
 * Lightweight Supabase REST client for Cloudflare Workers.
 * Uses PostgREST HTTP API directly — no SDK dependency.
 */

export class SupabaseClient {
  private baseUrl: string;
  private key: string;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.baseUrl = `${supabaseUrl}/rest/v1`;
    this.key = serviceRoleKey;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Accept-Profile': 'public',
      'Content-Profile': 'public',
      ...extra,
    };
  }

  /** SELECT rows. `query` is PostgREST query string, e.g. "key=eq.foo&select=value" */
  async select<T = Record<string, unknown>>(
    table: string,
    query: string
  ): Promise<T[]> {
    const res = await fetch(`${this.baseUrl}/${table}?${query}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase SELECT ${table} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  /** SELECT a single row. Returns null when no match. */
  async selectOne<T = Record<string, unknown>>(
    table: string,
    query: string
  ): Promise<T | null> {
    const rows = await this.select<T>(table, `${query}&limit=1`);
    return rows[0] ?? null;
  }

  /** INSERT a row. Returns the created row. */
  async insert<T = Record<string, unknown>>(
    table: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${table}`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase INSERT ${table} failed (${res.status}): ${text}`);
    }
    const rows: T[] = await res.json();
    return rows[0] as T;
  }

  /** UPSERT a row (insert or update on conflict). */
  async upsert<T = Record<string, unknown>>(
    table: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${table}`, {
      method: 'POST',
      headers: this.headers({
        Prefer: 'return=representation,resolution=merge-duplicates',
      }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase UPSERT ${table} failed (${res.status}): ${text}`);
    }
    const rows: T[] = await res.json();
    return rows[0] as T;
  }

  /** UPDATE rows matching PostgREST query. Returns updated rows. */
  async update<T = Record<string, unknown>>(
    table: string,
    query: string,
    data: Record<string, unknown>
  ): Promise<T[]> {
    const res = await fetch(`${this.baseUrl}/${table}?${query}`, {
      method: 'PATCH',
      headers: this.headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase UPDATE ${table} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  /** DELETE rows matching PostgREST query. Returns deleted rows. */
  async delete<T = Record<string, unknown>>(
    table: string,
    query: string
  ): Promise<T[]> {
    const res = await fetch(`${this.baseUrl}/${table}?${query}`, {
      method: 'DELETE',
      headers: this.headers({ Prefer: 'return=representation' }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase DELETE ${table} failed (${res.status}): ${text}`);
    }
    return res.json();
  }
}
