"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

interface SupabaseProviderProps {
  children: React.ReactNode;
}

const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  // const [supabaseClient] = useState(() => createClientComponentClient<Database>());
  const [supabaseClient] = useState(() =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  );

  return <SessionContextProvider supabaseClient={supabaseClient}>{children}</SessionContextProvider>;
};

export default SupabaseProvider;
