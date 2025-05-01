"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Event, Filter, SimplePool } from "nostr-tools";

const RELAYS = [
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.damus.io",
  "wss://nostr-pub.wellorder.net",
  "wss://nostr.oxtr.dev",
  "wss://relay.nostr.bg",
  "wss://purplepag.es",
  "wss://relay.snort.social", // Added reliable relay
  "wss://relay.nostr.info", // Added reliable relay
];

export interface UserMetrics {
  postCount: number;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  loading: boolean;
  error: Error | null;
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

export function useNostrUserMetrics(): UserMetrics {
  const [metrics, setMetrics] = useState({
    postCount: 0,
    likeCount: 0,
    retweetCount: 0,
    replyCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const poolRef = useRef<SimplePool | null>(null);
  const subIdRef = useRef<string>(`user-metrics-${Date.now()}`);
  const pubkeyRef = useRef<string | null>(null);
  const postIdsRef = useRef(new Set<string>());

  const handleEvent = useCallback(
    (event: Event) => {
      console.log("Received event for user metrics:", {
        kind: event.kind,
        id: event.id,
        pubkey: event.pubkey,
        tags: event.tags,
      });

      if (!pubkeyRef.current) return;

      if (event.kind === 30023 && event.pubkey === pubkeyRef.current) {
        console.log("Processing user post:", event.id);
        postIdsRef.current.add(event.id);
        setMetrics((prev) => ({ ...prev, postCount: prev.postCount + 1 }));
      } else if (event.kind === 7 && event.content === "+") {
        const postId = event.tags.find((t) => t[0] === "e")?.[1];
        if (postId && postIdsRef.current.has(postId)) {
          console.log("Processing like for post:", postId);
          setMetrics((prev) => ({ ...prev, likeCount: prev.likeCount + 1 }));
        }
      } else if (event.kind === 30023 || event.kind === 6) {
        // Handle both kind 30023 retweets (with retweet tag) and kind 6 retweets
        const retweetPostId = event.tags.find((t) => t[0] === "e" && (t[3] === "retweet" || !t[3]))?.[1];
        if (retweetPostId && postIdsRef.current.has(retweetPostId)) {
          console.log("Processing retweet for post:", retweetPostId);
          setMetrics((prev) => ({ ...prev, retweetCount: prev.retweetCount + 1 }));
        }
      } else if (event.kind === 30023) {
        // Handle replies
        const replyTo = event.tags.find((t) => t[0] === "e" && t[3] === "reply")?.[1];
        if (replyTo && postIdsRef.current.has(replyTo)) {
          console.log("Processing reply to post:", replyTo);
          setMetrics((prev) => ({ ...prev, replyCount: prev.replyCount + 1 }));
        }
      }
    },
    []
  );

  const handleEose = useCallback(() => {
    console.log("EOSE received for user metrics subscription");
    setLoading(false);
  }, []);

  const subscribeToRelays = useCallback(async () => {
    if (!window.nostr?.getPublicKey) {
      setError(new Error("Nostr extension not found"));
      setLoading(false);
      return;
    }

    try {
      pubkeyRef.current = await window.nostr.getPublicKey();
      console.log("User pubkey:", pubkeyRef.current);

      const results = await Promise.all(
        RELAYS.map(async (relay) => ({ relay, active: await checkRelayStatus(relay) }))
      );
      const activeRelays = results.filter((r) => r.active).map((r) => r.relay);
      console.log("Active relays for user metrics:", activeRelays);

      if (activeRelays.length === 0) {
        setError(new Error("No active relays available"));
        setLoading(false);
        return;
      }

      poolRef.current = new SimplePool();
      const pool = poolRef.current;

      const filters: Filter[] = [
        { kinds: [30023], authors: [pubkeyRef.current], limit: 200 }, // User's posts
        { kinds: [7], limit: 500 }, // Likes
        { kinds: [6, 30023], limit: 500 }, // Retweets (kind 6 and 30023)
        { kinds: [30023], limit: 500 }, // Replies
      ];

      try {
        console.log("Subscribing to relays for user metrics with filters:", filters);
        pool.subscribeMany(
          activeRelays,
          filters,
          {
            id: subIdRef.current,
            onevent: handleEvent,
            oneose: handleEose,
            onclose: (reason) => {
              console.warn("User metrics subscription closed:", reason);
              setError(new Error(`Subscription closed: ${reason}`));
              setLoading(false);
            },
          }
        );
      } catch (err) {
        console.error("Subscription error:", err);
        setError(err instanceof Error ? err : new Error("Failed to initialize subscription"));
        setLoading(false);
      }
    } catch (err) {
      console.error("Initialization error:", err);
      setError(err instanceof Error ? err : new Error("Failed to initialize"));
      setLoading(false);
    }
  }, [handleEvent, handleEose]);

  useEffect(() => {
    subscribeToRelays();

    return () => {
      if (poolRef.current) {
        poolRef.current.close([subIdRef.current]);
        poolRef.current = null;
      }
    };
  }, [subscribeToRelays]);

  return { ...metrics, loading, error };
}