"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useFeedContext } from "./FeedContext";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SimplePool, getEventHash, Event } from "nostr-tools";
import { Post } from "../../hooks/useBlockNostrFeed";
import { useTheme } from "next-themes";

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: any;
}

const RELAYS = [
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.damus.io",
  "wss://nostr-pub.wellorder.net",
  "wss://nostr.oxtr.dev",
  "wss://purplepag.es",
];

const containerVariants = {
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

const likeVariants = {
  initial: { scale: 1 },
  liked: { scale: 1.3, rotate: 10, transition: { duration: 0.2, yoyo: 2 } },
};

const retweetVariants = {
  initial: { scale: 1 },
  retweeted: { scale: 1.3, rotate: 10, transition: { duration: 0.2, yoyo: 2 } },
};

const SkeletonPost = () => (
  <div className="bg-gray-800 dark:bg-gray-700 rounded-2xl p-6 mb-6 animate-pulse">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 rounded-full bg-gray-600 dark:bg-gray-600" />
      <div className="flex-1">
        <div className="h-4 bg-gray-600 dark:bg-gray-600 rounded w-1/3 mb-2" />
        <div className="h-3 bg-gray-600 dark:bg-gray-600 rounded w-1/4" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-600 dark:bg-gray-600 rounded w-full" />
      <div className="h-4 bg-gray-600 dark:bg-gray-600 rounded w-5/6" />
    </div>
  </div>
);

const PostContent = ({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);
  const maxLength = 200;

  return (
    <div className="relative">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => (
            <p className="text-base text-gray-200 dark:text-gray-300 leading-7" {...props} />
          ),
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold text-white dark:text-gray-100" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-semibold text-white dark:text-gray-100" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ inline, className, children, ...props }: CodeProps) => (
            inline ? (
              <code className={`bg-gray-700 dark:bg-gray-800 px-1 rounded ${className || ""}`} {...props}>
                {children || ""}
              </code>
            ) : (
              <pre className="bg-gray-700 dark:bg-gray-800 p-3 rounded-lg overflow-auto">
                <code className={className} {...props}>
                  {children || ""}
                </code>
              </pre>
            )
          ),
          img: ({ node, ...props }) => (
            <img className="max-w-full rounded-lg my-2" {...props} alt={props.alt || "Post image"} />
          ),
        }}
      >
        {expanded ? content : content.slice(0, maxLength) + (content.length > maxLength ? "..." : "")}
      </ReactMarkdown>
      {content.length > maxLength && !expanded && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-800 dark:from-gray-700 to-transparent" />
          <button
            onClick={() => setExpanded(true)}
            className="text-blue-400 text-sm hover:underline mt-2 relative z-10"
          >
            Read more
          </button>
        </>
      )}
    </div>
  );
};

const PostItem = React.memo(({ post, level = 0 }: { post: Post; level?: number }) => {
  const { retweetPost } = useFeedContext();
  const [isLiking, setIsLiking] = useState(false);
  const [isRetweeting, setIsRetweeting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  console.log(`Rendering PostItem: ${post.id}, content: ${post.content}`);

  const likePost = async () => {
    if (!window.nostr?.signEvent) return;
    setIsLiking(true);
    try {
      const event = {
        kind: 7,
        pubkey: await window.nostr.getPublicKey(),
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["e", post.id.toString()],
          ["t", "blocknostr"],
        ],
        content: "+",
      };
      const eventId = getEventHash(event);
      const signedEvent = (await window.nostr.signEvent({ ...event, id: eventId })) as Event;
      const pool = new SimplePool();
      await pool.publish(RELAYS, signedEvent);
      pool.close(RELAYS);
    } catch (err) {
      console.error("Failed to like post:", err);
    } finally {
      setTimeout(() => setIsLiking(false), 200);
    }
  };

  const handleRetweet = async () => {
    setIsRetweeting(true);
    try {
      await retweetPost(post.id.toString(), post.content, post.handle);
    } catch (err) {
      console.error("Failed to retweet post:", err);
    } finally {
      setTimeout(() => setIsRetweeting(false), 200);
    }
  };

  const handleReply = async () => {
    if (!window.nostr?.signEvent || !replyContent.trim()) return;
    try {
      const event = {
        kind: 30023,
        pubkey: await window.nostr.getPublicKey(),
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["e", post.id.toString(), "", "reply"],
          ["t", "blocknostr"],
        ],
        content: replyContent.trim(),
      };
      const eventId = getEventHash(event);
      const signedEvent = (await window.nostr.signEvent({ ...event, id: eventId })) as Event;
      const pool = new SimplePool();
      await pool.publish(RELAYS, signedEvent);
      pool.close(RELAYS);
      setReplyContent("");
      setShowReplyForm(false);
    } catch (err) {
      console.error("Failed to post reply:", err);
    }
  };

  return (
    <motion.div variants={itemVariants} className="post" style={{ marginLeft: `${level * 20}px` }}>
      <div className="bg-gray-800 dark:bg-gray-700 rounded-2xl p-6 mb-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <img
            src={post.avatar}
            alt={post.name}
            className="w-12 h-12 rounded-full border-2 border-blue-600 dark:border-blue-500 transition-transform hover:scale-105"
            onError={(e) => (e.currentTarget.src = "/avatars/fallback.png")}
          />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <span className="font-bold text-lg text-white dark:text-gray-100">{post.name}</span>
                <span className="text-sm text-gray-400 dark:text-gray-500">{post.handle}</span>
              </div>
              <span className="text-sm text-gray-400 dark:text-gray-500">{post.time}</span>
            </div>
          </div>
        </div>
        <PostContent content={post.content} />
        <div className="flex gap-4 mt-4">
          <motion.button
            onClick={likePost}
            className="flex items-center gap-2 text-gray-300 dark:text-gray-400 hover:text-red-400 dark:hover:text-red-300 hover:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1 rounded-full transition-colors"
            variants={likeVariants}
            initial="initial"
            animate={isLiking ? "liked" : "initial"}
          >
            <span>❤️</span>
            <span>{post.likes || 0}</span>
          </motion.button>
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="flex items-center gap-2 text-gray-300 dark:text-gray-400 hover:text-blue-400 dark:hover:text-blue-300 hover:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1 rounded-full transition-colors"
          >
            <span>💬</span>
            <span>Reply</span>
          </button>
          <motion.button
            onClick={handleRetweet}
            className="flex items-center gap-2 text-gray-300 dark:text-gray-400 hover:text-green-400 dark:hover:text-green-300 hover:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1 rounded-full transition-colors"
            variants={retweetVariants}
            initial="initial"
            animate={isRetweeting ? "retweeted" : "initial"}
          >
            <span>🔄</span>
            <span>Retweet</span>
          </motion.button>
        </div>
        {showReplyForm && (
          <div className="mt-4">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="w-full p-3 bg-gray-700 dark:bg-gray-600 text-white dark:text-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleReply}
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
              >
                Post Reply
              </button>
              <button
                onClick={() => setShowReplyForm(false)}
                className="px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default function Feed() {
  const { posts, loading, error, addPost, newPostsAvailable, setNewPostsAvailable, refreshFeed } = useFeedContext();
  const { theme, setTheme } = useTheme();
  const [status, setStatus] = useState<"idle" | "posting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [englishOnly, setEnglishOnly] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    console.log("Feed rendering with posts:", posts);
  }, [posts]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const content = (form.elements.namedItem("content") as HTMLInputElement).value;
      if (content) {
        setStatus("posting");
        setErrorMsg(null);
        try {
          await addPost(content);
          form.reset();
          setStatus("done");
          setTimeout(() => setStatus("idle"), 2000);
        } catch (err) {
          console.error("Error posting:", err);
          setStatus("error");
          setErrorMsg(err instanceof Error ? err.message : "Failed to post");
        }
      }
    },
    [addPost]
  );

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.content.toLowerCase().includes(search.toLowerCase()) ||
      post.name.toLowerCase().includes(search.toLowerCase()) ||
      post.handle.toLowerCase().includes(search.toLowerCase());
    const matchesLanguage = englishOnly ? post.language === "eng" : true;
    return matchesSearch && matchesLanguage;
  });

  return (
    <section className="flex flex-col w-full max-w-3xl mx-auto p-8 rounded-2xl shadow-xl space-y-8 bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-200">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Blocknostr Feed</h2>
        <div className="flex gap-2">
          <button
            onClick={refreshFeed}
            className="p-2 rounded-full bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-800 hover:bg-gray-600 dark:hover:bg-gray-300 transition-colors"
          >
            🔄 Refresh
          </button>
          {isMounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-800 hover:bg-gray-600 dark:hover:bg-gray-300 transition-colors"
            >
              {theme === "dark" ? "🌞 Light" : "🌙 Dark"}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="Search posts or handles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-3 w-full bg-gray-700 dark:bg-gray-600 text-white dark:text-gray-200 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        <label className="flex items-center gap-2 text-gray-300 dark:text-gray-400">
          <input
            type="checkbox"
            checked={englishOnly}
            onChange={(e) => setEnglishOnly(e.target.checked)}
            className="h-5 w-5 text-blue-500 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          English Only
        </label>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          name="content"
          placeholder="Share something..."
          className="w-full p-3 bg-gray-700 dark:bg-gray-600 text-white dark:text-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          rows={4}
        />
        <button
          type="submit"
          className="w-full p-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={status === "posting"}
        >
          {status === "posting" ? "Posting..." : "Post"}
        </button>
        {status === "done" && <p className="text-green-400 text-sm">Posted successfully!</p>}
        {status === "error" && (
          <div className="text-red-400 text-sm">
            Error: {errorMsg}
            {errorMsg?.includes("Nostr extension") && (
              <a
                href="https://getalby.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-400 hover:underline"
              >
                Install Alby
              </a>
            )}
          </div>
        )}
      </form>

      {newPostsAvailable && (
        <button
          onClick={() => setNewPostsAvailable(false)}
          className="p-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        >
          Load New Posts
        </button>
      )}

      {loading && (
        <div className="space-y-4">
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </div>
      )}
      {error && (
        <div className="text-center text-red-400 dark:text-red-300">
          Error: {error.message}
          <button
            onClick={refreshFeed}
            className="ml-2 text-blue-400 dark:text-blue-300 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !error && filteredPosts.length === 0 && (
        <div className="text-center text-gray-300 dark:text-gray-400">
          No posts found. Try posting or check your Nostr relays.
        </div>
      )}

      <motion.div
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredPosts.map((post) => (
          <PostItem key={post.id} post={post} />
        ))}
      </motion.div>
    </section>
  );
}