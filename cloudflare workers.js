/**
 * GPL Mods DNS & Signing - Cloudflare Worker
 * High-performance edge caching proxy for Render API (https://gplmods.webredirect.org/api/ios-store)
 * Features:
 *  - Instant Cache Purge API (called from AdminJS / main site)
 *  - Edge Caching with Stale-While-Revalidate (0ms latency for visitors)
 *  - Full CORS Support
 *  - Health & Diagnostics endpoint
 */

export default {
    async fetch(request, env, ctx) {
        // Shared secret to authorize purge requests (can be set in Cloudflare Worker Environment Variables)
        const PURGE_SECRET = env?.PURGE_SECRET || 'gplmods-dns-secret';
        const RENDER_API_URL = env?.RENDER_API_URL || 'https://gplmods.webredirect.org/api/ios-store';

        const url = new URL(request.url);

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Purge-Key',
            'Access-Control-Max-Age': '86400',
        };

        // 1. Handle Preflight OPTIONS requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            });
        }

        // 2. Health check endpoint
        if (url.pathname === '/health' || url.pathname === '/ping') {
            return new Response(JSON.stringify({
                status: 'online',
                worker: 'GPL Mods DNS Edge Cache',
                target: RENDER_API_URL,
                timestamp: new Date().toISOString()
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const cache = caches.default;
        // Standardize primary cache key so all client query parameters (except purge) share the same cache entry
        const primaryCacheKey = new Request(new URL('/api/ios-store', url.origin).toString(), {
            method: 'GET'
        });

        // 3. Instant Cache Purge Endpoint (Invoked from AdminJS on main site)
        const isPurgeRequest = url.pathname === '/purge' || 
                               url.searchParams.get('purge') === '1' || 
                               url.searchParams.get('purge') === 'true';

        if (isPurgeRequest) {
            // Verify authorization key if provided in query or header
            const incomingKey = url.searchParams.get('key') || 
                                request.headers.get('X-Purge-Key');

            // If a secret is required and incoming key does not match
            if (env?.PURGE_SECRET && incomingKey !== PURGE_SECRET) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'Unauthorized: Invalid purge key' 
                }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            console.log('Purge requested! Clearing Cloudflare Edge Cache...');
            await cache.delete(primaryCacheKey);

            // Fetch fresh data from Render to immediately re-warm the cache
            let freshData = null;
            let fetchError = null;
            try {
                const freshUrl = `${RENDER_API_URL}?_cb=${Date.now()}`;
                const upstreamRes = await fetch(freshUrl, {
                    headers: { 'User-Agent': 'GPL-Mods-DNS-Worker-Revalidator/1.0' }
                });

                if (upstreamRes.ok) {
                    freshData = await upstreamRes.json();
                    
                    // Re-populate cache with fresh data
                    const newCachedResponse = new Response(JSON.stringify(freshData), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
                            'X-GPL-Cache': 'RE-WARMED',
                            ...corsHeaders
                        }
                    });

                    ctx.waitUntil(cache.put(primaryCacheKey, newCachedResponse.clone()));
                } else {
                    fetchError = `Upstream returned status ${upstreamRes.status}`;
                }
            } catch (err) {
                fetchError = err.message;
            }

            return new Response(JSON.stringify({
                success: true,
                message: 'Cloudflare cache purged successfully',
                rewarmed: !!freshData,
                fetchError: fetchError,
                timestamp: new Date().toISOString()
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 4. Client Request: Serve from Cloudflare Cache or fetch from Render
        let cachedResponse = await cache.match(primaryCacheKey);

        if (cachedResponse) {
            console.log('Cache hit! Serving instantly from Cloudflare Edge.');
            const response = new Response(cachedResponse.body, cachedResponse);
            for (const [k, v] of Object.entries(corsHeaders)) {
                response.headers.set(k, v);
            }
            response.headers.set('X-GPL-Cache', 'HIT');
            return response;
        }

        console.log('Cache miss. Fetching from Render API:', RENDER_API_URL);

        try {
            const upstreamRes = await fetch(RENDER_API_URL, {
                headers: {
                    'User-Agent': 'GPL-Mods-DNS-Worker/1.0',
                    'Accept': 'application/json'
                }
            });

            if (!upstreamRes.ok) {
                const errText = await upstreamRes.text();
                return new Response(errText, {
                    status: upstreamRes.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const rawBody = await upstreamRes.text();

            // Store in Cloudflare Cache:
            // s-maxage=300 (5 min edge cache), stale-while-revalidate=86400 (instant serve while background refresh)
            const cacheableResponse = new Response(rawBody, {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
                    'X-GPL-Cache': 'EDGE-SAVED',
                    ...corsHeaders
                }
            });

            ctx.waitUntil(cache.put(primaryCacheKey, cacheableResponse.clone()));

            return new Response(rawBody, {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-GPL-Cache': 'MISS',
                    ...corsHeaders
                }
            });

        } catch (fetchErr) {
            console.error('Failed to fetch from Render API:', fetchErr);
            return new Response(JSON.stringify({
                error: 'Failed to communicate with upstream server',
                details: fetchErr.message
            }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    },
};
