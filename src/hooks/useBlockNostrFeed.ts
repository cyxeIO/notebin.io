"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Event, Filter, SimplePool } from "nostr-tools";
import debounce from "lodash/debounce";
import { franc } from "franc";

const RELAYS = [
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.nostr.wirednet.jp",
  "wss://nostr-pub.wellorder.net",
  "wss://nostr.oxtr.dev",
  "wss://relay.nostr.bg",
  "wss://purplepag.es",
];

const DEFAULT_LIMIT = 50;

export interface Post {
  id: number | string;
  avatar: string;
  name: string;
  handle: string;
  time: string;
  content: string;
  likes: number;
  created_at: number;
  language?: string;
  hasBlocknostrTag?: boolean;
}

export interface NostrFeedResult {
  posts: Post[];
  loading: boolean;
  error: Error | null;
  refreshFeed: () => void;
  trackRecentPost: (postId: string) => void; // Added to support recent post tracking
}

function getRelativeTime(createdAt: number): string {
  const now = Date.now() / 1000;
  const diff = now - createdAt;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const checkRelayStatus = async (relay: string): Promise<boolean> => {
  try {
    const ws = new WebSocket(relay);
    await new Promise((resolve, reject) => {
      ws.onopen = () => resolve(true);
      ws.onerror = () => reject(false);
      setTimeout(() => reject(false), 5000);
    });
    ws.close();
    return true;
  } catch {
    return false;
  }
};

export function useBlockNostrFeed(limit: number = DEFAULT_LIMIT): NostrFeedResult {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const poolRef = useRef<SimplePool | null>(null);
  const seenIds = useRef(new Set<string>());
  const subIdRef = useRef<string>(`blocknostr-feed-${Date.now()}`);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const metadataCache = useRef(new Map<string, { name?: string; picture?: string }>());
  const likeCounts = useRef(new Map<string, number>());
  const recentPosts = useRef(new Map<string, number>()); // Track recently published posts

  const loadMore = useCallback(() => {
    console.log("Loading more posts...");
  }, []);

  const debounceUpdate = useCallback(
    debounce((newPost: Post) => {
      setPosts((prev) => {
        const newPosts = [newPost, ...prev].sort((a, b) => {
          if (a.hasBlocknostrTag && !b.hasBlocknostrTag) return -1;
          if (!a.hasBlocknostrTag && b.hasBlocknostrTag) return 1;
          return b.created_at - a.created_at;
        });
        return newPosts.slice(0, limit);
      });
    }, 100),
    [limit]
  );

  const handleEvent = useCallback(
    (event: Event) => {
      console.log("Received Nostr event:", event);
      if (event.kind === 0) {
        try {
          const meta = JSON.parse(event.content);
          metadataCache.current.set(event.pubkey, {
            name: meta.name || meta.display_name || `User_${event.pubkey.slice(0, 8)}`,
            picture: meta.picture || "/avatars/default.png",
          });
          setPosts((prev) =>
            prev.map((p) =>
              p.handle === `@${event.pubkey.slice(0, 8)}`
                ? {
                    ...p,
                    name: meta.name || meta.display_name || p.name,
                    avatar: meta.picture || p.avatar,
                  }
                : p
            )
          );
        } catch (err) {
          console.error("Failed to parse metadata:", err);
        }
      } else if (event.kind === 7 && event.content === "+") {
        const postId = event.tags.find((t) => t[0] === "e")?.[1];
        if (postId) {
          const newCount = (likeCounts.current.get(postId) || 0) + 1;
          likeCounts.current.set(postId, newCount);
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, likes: newCount } : p
            )
          );
        }
      } else if (event.kind === 30023) {
        const isRecent =
          recentPosts.current.has(event.id) &&
          Date.now() / 1000 - recentPosts.current.get(event.id)! < 60; // 60 seconds window
        if (!seenIds.current.has(event.id) || isRecent) {
          seenIds.current.add(event.id);
          const meta = metadataCache.current.get(event.pubkey) || {};
          console.log(`Processing kind 30023 event: ${event.id}, isRecent: ${isRecent}`);
          const language = franc(event.content, { minLength: 10 }) || "und";
          const hasBlocknostrTag = event.tags.some((tag) => tag[0] === "t" && tag[1] === "blocknostr");
          const post: Post = {
            id: event.id,
            avatar: meta.picture || "/avatars/default.png",
            name: meta.name || `User_${event.pubkey.slice(0, 8)}`,
            handle: `@${event.pubkey.slice(0, 8)}`,
            time: getRelativeTime(event.created_at),
            content: event.content || "",
            likes: likeCounts.current.get(event.id) || 0,
            created_at: event.created_at,
            language,
            hasBlocknostrTag,
          };
          debounceUpdate(post);
        }
      }
    },
    [debounceUpdate]
  );

  const handleEose = useCallback(() => {
    console.log("EOSE received for subscription:", subIdRef.current);
    setLoading(false);
  }, []);

  const subscribeToRelays = useCallback(async () => {
    const results = await Promise.all(
      RELAYS.map(async (relay) => ({ relay, active: await checkRelayStatus(relay) }))
    );
    const activeRelays = results.filter((r) => r.active).map((r) => r.relay);
    console.log("Active relays:", activeRelays);
    if (activeRelays.length === 0) {
      setError(new Error("No active relays available"));
      setLoading(false);
      return;
    }

    poolRef.current = new SimplePool();
    const pool = poolRef.current;

    const filters: Filter[] = [
      { kinds: [30023], limit },
      { kinds: [0] },
      { kinds: [7] },
    ];

    setLoading(true);
    setError(null);

    try {
      console.log("Subscribing to relays with filters:", filters);
      pool.subscribeMany(
        activeRelays,
        filters,
        {
          id: subIdRef.current,
          onevent: handleEvent,
          oneose: handleEose,
          onclose: (reason) => {
            console.warn("Subscription closed:", reason);
            if (retryCount.current < maxRetries) {
              console.log(`Retrying subscription (attempt ${retryCount.current + 1}/${maxRetries})`);
              retryCount.current += 1;
              setTimeout(subscribeToRelays, 5000);
            } else {
              setError(new Error("Failed to fetch posts after retries"));
              setLoading(false);
            }
          },
        }
      );

      pool.subscribeMany(
        activeRelays,
        [{ kinds: [30023] }],
        {
          id: `realtime-${subIdRef.current}`,
          onevent: handleEvent,
        }
      );
    } catch (err) {
      console.error("Subscription error:", err);
      setError(err instanceof Error ? err : new Error("Failed to initialize subscription"));
      setLoading(false);
    }
  }, [handleEvent, handleEose, limit]);

  const refreshFeed = useCallback(() => {
    console.log("Refreshing feed...");
    setPosts([]);
    seenIds.current.clear();
    recentPosts.current.clear();
    retryCount.current = 0;
    if (poolRef.current) {
      poolRef.current.close([subIdRef.current, `realtime-${subIdRef.current}`]);
      poolRef.current = null;
    }
    subscribeToRelays();
  }, [subscribeToRelays]);

  const trackRecentPost = useCallback((postId: string) => {
    console.log("Tracking recent post:", postId);
    recentPosts.current.set(postId, Date.now() / 1000);
    setTimeout(() => {
      recentPosts.current.delete(postId);
    }, 60 * 1000);
  }, []);

  useEffect(() => {
    subscribeToRelays();

    const cleanupInterval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setPosts((current) =>
        current.filter((p) => {
          const createdAt = p.created_at || now;
          return now - createdAt < 7 * 24 * 60 * 60;
        })
      );
    }, 60 * 60 * 1000);

    const cleanupSeenIds = setInterval(() => {
      seenIds.current.clear();
      recentPosts.current.clear();
    }, 24 * 60 * 60 * 1000);

    return () => {
      clearInterval(cleanupInterval);
      clearInterval(cleanupSeenIds);
      if (poolRef.current) {
        poolRef.current.close([subIdRef.current, `realtime-${subIdRef.current}`]);
        poolRef.current = null;
      }
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [subscribeToRelays]);

  useEffect(() => {
    const lastPost = document.querySelector(".post:last-child");
    if (lastPost && !loading) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMore();
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(lastPost);
    }
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [posts, loading, loadMore]);

  return { posts, loading, error, refreshFeed, trackRecentPost };
}