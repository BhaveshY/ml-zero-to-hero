"use strict";
(() => {
  const SALT = "oRjcRhah3fqWl9x205ZZVg==", ITER = 600000, KATEX = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.js";
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  const enc = new TextEncoder();
  let encKey = null, nameKey = null; const cache = new Map();
  async function derive(pw) { const base = await crypto.subtle.importKey("raw", enc.encode(pw.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({name: "PBKDF2", hash: "SHA-256", salt: b64(SALT), iterations: ITER}, base, 512)); }
  async function useMaster(m) { encKey = await crypto.subtle.importKey("raw", m.slice(0, 32), "AES-GCM", false, ["decrypt"]);
    nameKey = await crypto.subtle.importKey("raw", m.slice(32), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]); }
  async function get(p) { if (cache.has(p)) return cache.get(p);
    const pr = (async () => { const name = hex(await crypto.subtle.sign("HMAC", nameKey, enc.encode(p))).slice(0, 40);
      const r = await fetch("v/" + name, {cache: "force-cache"}); if (!r.ok) throw new Error("missing " + r.status);
      const buf = new Uint8Array(await r.arrayBuffer());
      return crypto.subtle.decrypt({name: "AES-GCM", iv: buf.slice(0, 12), additionalData: enc.encode(p)}, encKey, buf.slice(12)); })();
    cache.set(p, pr); pr.catch(() => cache.delete(p)); return pr; }
  const KEY = "mlz2h-vault";
  const saved = () => { try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY); } catch (e) { return null; } };
  function lock() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) {} location.reload(); }
  function script(src, text) { return new Promise((res, rej) => { const s = document.createElement("script");
      if (text != null) { s.src = URL.createObjectURL(new Blob([text], {type: "text/javascript"})); } else { s.src = src; s.integrity = "sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg"; s.crossOrigin = "anonymous"; }
      s.onload = res; s.onerror = () => rej(new Error("script")); document.body.append(s); }); }
  async function boot() { const dec = new TextDecoder();
    const [html, js] = await Promise.all([get("app.html"), get("app.js")]);
    document.getElementById("gate").remove(); document.getElementById("gatecss").remove();
    document.body.insertAdjacentHTML("beforeend", dec.decode(html));
    window.__VAULT = Object.freeze({get, lock});
    await script(KATEX); await script(null, dec.decode(js)); }
  async function tryMaster(m) { await useMaster(m); const r = await fetch("v/check"); if (!r.ok) throw new Error("missing " + r.status); const buf = new Uint8Array(await r.arrayBuffer());
    await crypto.subtle.decrypt({name: "AES-GCM", iv: buf.slice(0, 12), additionalData: enc.encode("check")}, encKey, buf.slice(12)); }
  const form = document.getElementById("gateform"), msg = document.getElementById("gatemsg"), btn = document.getElementById("gatebtn"), inp = document.getElementById("gatepw");
  let fails = 0;
  form.addEventListener("submit", async e => { e.preventDefault(); const pw = inp.value.trim(); if (!pw) return; btn.disabled = true; msg.textContent = "Unlocking…"; msg.className = "";
    try { await new Promise(r => setTimeout(r, Math.min(8000, 400 * 2 ** fails) - 400));
      const m = await derive(pw); await tryMaster(m);
      const keep = btoa(String.fromCharCode(...m)); try { (document.getElementById("gatekeep").checked ? localStorage : sessionStorage).setItem(KEY, keep); } catch (x) {}
      inp.value = ""; await boot(); }
    catch (err) { fails++; cache.clear(); btn.disabled = false; msg.className = "err"; msg.textContent = err && /missing|script|Failed to fetch/.test(String(err.message)) ? "Could not load the site. Check your connection and try again." : "That password is not right. Check for typos and try again."; inp.select(); } });
  (async () => { const s = saved(); if (!s) { inp.focus(); return; }
    try { msg.textContent = "Unlocking…"; await tryMaster(b64(s)); await boot(); } catch (e) { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (x) {} cache.clear(); msg.textContent = ""; inp.focus(); } })();
})();
