// src/app/nevent/[eventId]/page.tsx
import { getServerSession } from "next-auth";
import { nip19 } from "nostr-tools";
import { authOptions } from "~/auth";
import { Description, Filename, CopyButton } from "~/features/editor";
import { ReadEditor } from "~/features/editor";
import { TagList } from "~/features/editor/components/TagList";
import { ZapButton } from "~/features/zap";
import type { UserWithKeys } from "~/types";

export const metadata = {
  title: "BlockNostr — Event",
  description: "View a Nostr event on BlockNostr",
};

export default async function EventPage({
  params,
}: {
  params: { eventId: string };
}) {
  const { eventId } = params;

  // 1) Normalize & decode
  let decoded;
  try {
    decoded = nip19.decode(eventId.toLowerCase());
  } catch {
    return (
      <div className="p-6 text-center text-muted">
        Invalid Nostr event tag.
      </div>
    );
  }

  // 2) Only handle nevent types
  if (decoded.type !== "nevent") {
    return (
      <div className="p-6 text-center text-muted">
        This tag is not a Nostr event.
      </div>
    );
  }

  // 3) Pull out the actual fields (nip19 calls it `pubkey`, not `author`)
  const {
    id,
    pubkey: author,
    relays,
    // kind may not be included in nip19 data; if you get it elsewhere, pull it here
  } = decoded.data as {
    id: string;
    pubkey: string;
    relays?: string[];
    kind?: number;
  };

  // 4) Fetch your session so you know who can zap
  const session = await getServerSession(authOptions);
  const user = session?.user as UserWithKeys | undefined;

  // 5) Render the full event UI
  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <Description eventId={id} author={author} relays={relays} />

      <div className="overflow-hidden rounded-md border border-border bg-background">
        <div className="flex items-center justify-between gap-4 border-b bg-muted/50 px-4 py-3 dark:bg-muted/30">
          <Filename eventId={id} author={author} relays={relays} />
          <div className="flex items-center gap-2">
            <CopyButton eventId={id} author={author} relays={relays} />
            {user?.publicKey && (
              <ZapButton
                eventId={id}
                author={author}
                senderPubkey={user.publicKey}
              />
            )}
          </div>
        </div>

        <ReadEditor eventId={id} author={author} relays={relays} />
      </div>

      <TagList eventId={id} author={author} relays={relays} />
    </div>
  );
}