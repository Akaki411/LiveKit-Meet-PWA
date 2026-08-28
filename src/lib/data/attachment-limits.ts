// Shared between the room-files API route (server) and the chat upload UI (client),
// so both enforce the exact same caps without duplicating magic numbers.
//
// Two independent, closed-source rari (0.15.13) runtime limitations shape this:
//
//  1. rari's Rust HTTP layer hard-caps a single request body at ~10 MiB (axum's
//     DefaultBodyLimit) with no exposed config knob — confirmed empirically.
//  2. The Rust↔JS body bridge corrupts any request body containing bytes that
//     aren't valid UTF-8 (binary files, essentially always) — it appears to run
//     every incoming body through a lossy UTF-8 decode/re-encode before *any* JS
//     API (formData(), arrayBuffer(), even the raw ReadableStream reader) sees it.
//     Base64-encoding the file into a JSON body sidesteps this, since base64 output
//     is pure ASCII and therefore always valid UTF-8 (nothing to mangle).
//
// Together this means uploads must go out as base64-encoded JSON chunks, each well
// under the ~10 MiB body cap (base64 adds ~33% overhead on top of the cap). Total
// file size is only limited by how many chunks the client is willing to send.
export const MAX_FILE_BYTES = 256 * 1024 * 1024;

// 7 MB raw -> ~9.34 MB base64, leaving comfortable headroom under the ~10 MiB cap.
export const CHUNK_BYTES = 7 * 1024 * 1024;
