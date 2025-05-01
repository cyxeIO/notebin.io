// src/app/profile/page.tsx
import React from "react";
import ProfileMenu from "~/components/ui/profilemenu"

export const metadata = {
  title: "BlockNostr — Profile",
  description: "Your BlockNostr profile and settings",
};

export default function ProfilePage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Your Profile</h1>
      <ProfileMenu />

      <section>
        <h2 className="text-xl font-semibold text-foreground">About You</h2>
        <p className="text-muted-fg">
          Add your bio, links, or other personal info here.
        </p>
      </section>
    </div>
  );
}