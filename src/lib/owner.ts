type RoleClient = {
  rpc: (fn: "has_role", args: { _user_id: string; _role: "owner" | "user" }) => PromiseLike<{ data: boolean | null; error: unknown }>;
};

/** Checks the owner role using the caller's own (RLS-bound) client. */
export async function isOwner(supabase: RoleClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "owner" });
  return !error && data === true;
}

export const NOT_OWNER = "Only the account owner can manage email alerts";
