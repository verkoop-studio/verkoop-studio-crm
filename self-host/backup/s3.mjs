/*
 * The small piece of S3 that a backup needs: put, get, list, delete.
 *
 * Written out rather than pulled in, because this runs in the one job whose
 * whole purpose is to still work on the day everything else does not. A
 * dependency-free signer is forty lines and never has a supply chain.
 *
 * Signature Version 4 is exact and unforgiving — a header out of order or a
 * stray slash and the only thing that comes back is 403 SignatureDoesNotMatch,
 * which says nothing about which of the twelve possible mistakes it was. What
 * is here was run against a real S3 server before it was committed.
 *
 * Works against Cloudflare R2, which is what production uses, and against any
 * other S3 — the local stack points it at MinIO so the tests are real.
 */

import { createHash, createHmac } from "node:crypto";

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();

export class S3 {
  constructor({ endpoint, bucket, accessKeyId, secretAccessKey, region = "auto" }) {
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error("S3 needs an endpoint, a bucket and a key pair.");
    }
    this.endpoint = endpoint.replace(/\/+$/, "");
    this.bucket = bucket;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
  }

  /*
   * Path style, always: https://endpoint/bucket/key.
   *
   * The alternative is the bucket as a subdomain, which R2 accepts and a
   * server on a plain hostname — MinIO in a container, say — does not. One
   * shape that works everywhere beats two that each work somewhere.
   */
  #url(key, query = "") {
    // The endpoint may carry a path of its own — Supabase's S3 lives under
    // /storage/v1/s3 — and the signature covers the whole path, not the part
    // after it. Leave the prefix out and every request is a 403 that says
    // nothing about why.
    const prefix = new URL(this.endpoint).pathname.replace(/\/+$/, "");
    const path = `${prefix}/${this.bucket}${key ? `/${key.split("/").map(encodeURIComponent).join("/")}` : ""}`;
    return {
      path,
      href: `${this.endpoint}${path.slice(prefix.length)}${query ? `?${query}` : ""}`,
    };
  }

  async #send(method, key, { body, query = "", headers = {} } = {}) {
    const { path, href } = this.#url(key, query);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = amzDate.slice(0, 8);
    const payloadHash = sha256(body ?? "");
    const host = new URL(href).host;

    const signed = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
    };
    const names = Object.keys(signed).sort();
    const canonicalHeaders = names.map((n) => `${n}:${String(signed[n]).trim()}\n`).join("");
    const signedHeaders = names.join(";");

    const canonical = [method, path, query, canonicalHeaders, signedHeaders, payloadHash].join(
      "\n",
    );

    const scope = `${date}/${this.region}/s3/aws4_request`;
    const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");

    let key4 = hmac(`AWS4${this.secretAccessKey}`, date);
    for (const part of [this.region, "s3", "aws4_request"]) key4 = hmac(key4, part);
    const signature = createHmac("sha256", key4).update(toSign).digest("hex");

    const response = await fetch(href, {
      method,
      headers: {
        ...signed,
        Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      body,
    });
    return response;
  }

  async put(key, body, contentType = "application/octet-stream") {
    const response = await this.#send("PUT", key, {
      body,
      headers: { "content-type": contentType },
    });
    if (!response.ok)
      throw new Error(`PUT ${key} answered ${response.status} ${await response.text()}`);
    // Single-part uploads return the body's MD5 as the ETag. That is what makes
    // "is what arrived what we sent" a question with an answer.
    return (response.headers.get("etag") ?? "").replaceAll('"', "");
  }

  async get(key) {
    const response = await this.#send("GET", key);
    if (!response.ok) throw new Error(`GET ${key} answered ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  async head(key) {
    const response = await this.#send("HEAD", key);
    if (!response.ok) return null;
    return {
      size: Number(response.headers.get("content-length") ?? 0),
      etag: (response.headers.get("etag") ?? "").replaceAll('"', ""),
    };
  }

  /** Keys under a prefix, oldest first by name — the names are timestamps. */
  async list(prefix) {
    const keys = [];
    let token = "";
    do {
      const query = [
        "list-type=2",
        `prefix=${encodeURIComponent(prefix)}`,
        token ? `continuation-token=${encodeURIComponent(token)}` : "",
      ]
        .filter(Boolean)
        .sort()
        .join("&");
      const response = await this.#send("GET", "", { query });
      if (!response.ok) throw new Error(`LIST answered ${response.status}`);
      const xml = await response.text();
      for (const match of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(match[1]);
      token = /<NextContinuationToken>([^<]+)</.exec(xml)?.[1] ?? "";
    } while (token);
    return keys.sort();
  }

  async delete(key) {
    const response = await this.#send("DELETE", key);
    if (!response.ok && response.status !== 404) {
      throw new Error(`DELETE ${key} answered ${response.status}`);
    }
  }
}

/** The settings both the backup and the restore read, from one place. */
export function s3FromEnv() {
  return new S3({
    endpoint: process.env["BACKUP_S3_ENDPOINT"],
    bucket: process.env["BACKUP_S3_BUCKET"],
    accessKeyId: process.env["BACKUP_S3_ACCESS_KEY_ID"],
    secretAccessKey: process.env["BACKUP_S3_SECRET_ACCESS_KEY"],
    region: process.env["BACKUP_S3_REGION"] ?? "auto",
  });
}
