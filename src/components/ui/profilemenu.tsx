// src/components/ui/profilemenu.tsx
"use client"

import React, { useState } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { useWallet } from "@alephium/web3-react"
import { useNostr } from "~/providers/nostr-provider"
import { nip19 } from "nostr-tools"
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover"
import Image from "next/image"
import { Copy as CopyIcon, Settings, LogOut } from "lucide-react"

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-md px-3 py-2 text-white">
      <span className="text-sm font-mono truncate">
        <strong>{label}:</strong> {value}
      </span>
      <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-700 transition">
        <CopyIcon className="w-4 h-4 text-gray-400" />
      </button>
      {copied && <span className="ml-2 text-green-400 text-xs">Copied!</span>}
    </div>
  )
}

export default function ProfileMenu() {
  const { data: session, status } = useSession()
  const { account } = useWallet()
  const { publicKey, setPublicKey } = useNostr()

  const handleConnectNostr = async () => {
    if (typeof window !== "undefined" && (window as any).nostr?.getPublicKey) {
      try {
        const hex = await (window as any).nostr.getPublicKey()
        const npub = nip19.npubEncode(hex)
        localStorage.setItem("nostr:npub", npub)
        setPublicKey(hex)
      } catch (err) {
        console.error("Nostr connection failed:", err)
      }
    } else {
      alert("No Nostr extension found")
    }
  }

  const npubString = publicKey ? nip19.npubEncode(publicKey) : null

  if (status === "loading") {
    return <div className="w-8 h-8 bg-gray-700 animate-pulse rounded-full" />
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:opacity-90 transition"
      >
        Sign In
      </button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-gray-600">
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || "avatar"}
              width={32}
              height={32}
            />
          ) : (
            <span className="block w-full h-full bg-gray-700" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-72 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">{session.user?.name}</span>
          <Settings className="w-5 h-5 text-gray-400 hover:text-white transition" />
        </div>

        <p className="text-sm text-gray-400 truncate">{session.user?.email}</p>

        {account?.address && (
          <CopyField label="Wallet" value={account.address} />
        )}

        {npubString ? (
          <CopyField label="Nostr" value={npubString} />
        ) : (
          <button
            onClick={handleConnectNostr}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:opacity-90 transition"
          >
            Connect Nostr
          </button>
        )}

        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-md hover:opacity-90 transition"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </button>
      </PopoverContent>
    </Popover>
  )
}