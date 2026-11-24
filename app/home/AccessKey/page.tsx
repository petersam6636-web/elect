"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { supabase } from "@/lib/supabase-client";
import AccessKeyPage from "./AccessKeyPage";

export default function AccessKeyRoute() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        if (!data.user) {
          router.replace("/");
          return;
        }

        if (active) setUserId(data.user.id);
      } catch (loadError: unknown) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to verify your account."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadCurrentUser();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center gap-3 text-white">
        <LoaderCircle className="animate-spin text-blue-300" size={20} />
        <span className="text-sm text-white/55">Loading private access…</span>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 text-center text-sm text-red-200">
        {error || "Sign in to manage private election access."}
      </main>
    );
  }

  return <AccessKeyPage userId={userId} />;
}
