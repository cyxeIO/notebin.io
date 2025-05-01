"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useBlockNostrFeed, Post } from "../../hooks/useBlockNostrFeed";
import { SimplePool, getEventHash, Event } from "nostr-tools";

const RELAYS = [
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.damus.io",
  "wss://nostr-pub.wellorder.net",
  "wss://nostr.oxtr.dev",
  "wss://purplepag.es",
];

interface FeedContextProps {
  posts: Post[];
  loading: boolean;
  error: Error | null;
  addPost: (content: string) => Promise<void>;
  retweetPost: (postId: string, content: string, handle: string) => Promise<void>; // Added for retweeting
  newPostsAvailable: boolean;
  setNewPostsAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  refreshFeed: () => void;
}

export const FeedContext = createContext<FeedContextProps | undefined>(undefined);

interface FeedProviderProps {
  children: ReactNode;
  limit?: number;
}

export function FeedProvider({ children, limit = 50 }: FeedProviderProps) {
  const { posts: nostrPosts, loading, error, refreshFeed, trackRecentPost } = useBlockNostrFeed(limit);
  const [posts, setPosts] = useState<Post[]>(nostrPosts);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);

  useEffect(() => {
    console.log("Updating posts in FeedContext:", nostrPosts);
    setPosts((prevPosts) => {
      const tempPosts = prevPosts.filter((p) => p.id.toString().startsWith("temp-"));
      const mergedPosts = [...tempPosts, ...nostrPosts].sort((a, b) => {
        if (a.hasBlocknostrTag && !b.hasBlocknostrTag) return -1;
        if (!a.hasBlocknostrTag && b.hasBlocknostrTag) return 1;
        return b.created_at - a.created_at;
      });
      return mergedPosts.slice(0, limit);
    });
  }, [nostrPosts, limit]);

  const addPost = async (content: string) => {
    if (!window.nostr?.getPublicKey || !window.nostr?.signEvent) {
      throw new Error("Nostr extension (e.g., Alby, nos2x) not found.");
    }

    if (!content.trim()) {
      throw new Error("Post content cannot be empty");
    }

    const pubkey = await window.nostr.getPublicKey();
    const tempId = `temp-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    const optimisticPost: Post = {
      id: tempId,
      avatar: "/avatars/default.png",
      name: `User_${pubkey.slice(0, 8)}`,
      handle: `@${pubkey.slice(0, 8)}`,
      time: "now",
      content,
      likes: 0,
      created_at: now + 1,
      language: "eng",
      hasBlocknostrTag: true,
    };

    setPosts((prevPosts) => {
      const newPosts = [optimisticPost, ...prevPosts].sort((a, b) => {
        if (a.hasBlocknostrTag && !b.hasBlocknostrTag) return -1;
        if (!a.hasBlocknostrTag && b.hasBlocknostrTag) return 1;
        return b.created_at - a.created_at;
      });
      return newPosts.slice(0, limit);
    });

    const unsignedEvent = {
      kind: 30023,
      pubkey,
      created_at: now,
      tags: [["t", "blocknostr"]],
      content: content.trim(),
    };
    const eventId = getEventHash(unsignedEvent);
    const eventToSign = { ...unsignedEvent, id: eventId };

    let signedEvent: Event;
    try {
      signedEvent = (await window.nostr.signEvent(eventToSign)) as Event;
      console.log("Signed event:", signedEvent);
    } catch (err) {
      console.error("Failed to sign post:", err);
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== tempId));
      throw new Error("Failed to sign post.");
    }

    const pool = new SimplePool();
    const maxRetries = 3;
    let retries = 0;

    try {
      while (retries < maxRetries) {
        try {
          await pool.publish(RELAYS, signedEvent);
          trackRecentPost(signedEvent.id);
          setPosts((prevPosts) => {
            const updatedPosts = prevPosts.map((p) =>
              p.id === tempId
                ? {
                    ...p,
                    id: signedEvent.id,
                    created_at: signedEvent.created_at,
                    time: getRelativeTime(signedEvent.created_at),
                  }
                : p
            );
            return updatedPosts.sort((a, b) => {
              if (a.hasBlocknostrTag && !b.hasBlocknostrTag) return -1;
              if (!a.hasBlocknostrTag && b.hasBlocknostrTag) return 1;
              return b.created_at - a.created_at;
            }).slice(0, limit);
          });
          setNewPostsAvailable(true);
          break;
        } catch (err) {
          console.error("Publish attempt failed:", err);
          retries++;
          if (retries === maxRetries) {
            throw new Error("Failed to publish post after retries.");
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } catch (err) {
      console.error("Failed to publish post:", err);
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== tempId));
      throw err;
    } finally {
      pool.close(RELAYS);
    }
  };

  const retweetPost = async (postId: string, content: string, handle: string) => {
    if (!window.nostr?.getPublicKey || !window.nostr?.signEvent) {
      throw new Error("Nostr extension (e.g., Alby, nos2x) not found.");
    }

    const pubkey = await window.nostr.getPublicKey();
    const tempId = `temp-retweet-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    const retweetContent = `RT ${handle}: ${content}`;
    const optimisticPost: Post = {
      id: tempId,
      avatar: "/avatars/default.png",
      name: `User_${pubkey.slice(0, 8)}`,
      handle: `@${pubkey.slice(0, 8)}`,
      time: "now",
      content: retweetContent,
      likes: 0,
      created_at: now + 1,
      language: "eng",
      hasBlocknostrTag: true,
    };

    setPosts((prevPosts) => {
      const newPosts = [optimisticPost, ...prevPosts].sort((a, b) => {
        if (a.hasBlocknostrTag && !b.hasBlocknostrTag) return -1;
        if (!a.hasBlocknostrTag && b.hasBlocknostrTag) return 1;
        return b.created_at - a.created_at;
      });
      return newPosts.slice(0, limit);
    });

    const unsignedEvent = {
      kind: 30023,
      pubkey,
      created_at: now,
      tags: [
        ["t", "blocknostr"],
        ["e", postId, "", "retweet"], // Reference original post
      ],
      content: retweetContent,
    };
    const eventId = getEventHash(unsignedEvent);
    const eventToSign = { ...unsignedEvent, id: eventId };

    let signedEvent: Event;
    try {
      signedEvent = (await window.nostr.signEvent(eventToSign)) as Event;
      console.log("Signed retweet event:", signedEvent);
    } catch (err) {
      console.error("Failed to sign retweet:", err);
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== tempId));
      throw new Error("Failed to sign retweet.");
    }

    const pool = new SimplePool();
    const maxRetries = 3;
    let retries = 0;

    try {
      while (retries < maxRetries) {
        try {
          await pool.publish(RELAYS, signedEvent);
          trackRecentPost(signedEvent.id);
          setPosts((prevPosts) => {
            const updatedPosts = prevPosts.map((p) =>
              p.id === tempId
                ? {
                    ...p,
                    id: signedEvent.id,
                    created_at: signedEvent.created_at,
                    time: getRelativeTime(signedEvent.created_at),
                  }
                : p
            );
            return updatedPosts.sort((a, b) => {
              if (a.hasBlocknostrTag && !b.hasBlocknostrTag) return -1;
              if (!a.hasBlocknostrTag && b.hasBlocknostrTag) return 1;
              return b.created_at - a.created_at;
            }).slice(0, limit);
          });
          setNewPostsAvailable(true);
          break;
        } catch (err) {
          console.error("Publish attempt failed:", err);
          retries++;
          if (retries === maxRetries) {
            throw new Error("Failed to publish retweet after retries.");
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } catch (err) {
      console.error("Failed to publish retweet:", err);
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== tempId));
      throw err;
    } finally {
      pool.close(RELAYS);
    }
  };

  return (
    <FeedContext.Provider
      value={{ posts, loading, error, addPost, retweetPost, newPostsAvailable, setNewPostsAvailable, refreshFeed }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export function useFeedContext(): FeedContextProps {
  const context = useContext(FeedContext);
  if (context === undefined) {
    throw new Error("useFeedContext must be used within a FeedProvider");
  }
  return context;
}

function getRelativeTime(createdAt: number): string {
  const now = Date.now() / 1000;
  const diff = now - createdAt;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}