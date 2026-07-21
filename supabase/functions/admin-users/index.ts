import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

type Payload = {
  action?: string;
  email?: string;
  password?: string;
  displayName?: string;
  initials?: string;
  roleId?: string | null;
  targetUserId?: string;
  isOwner?: boolean;
  sourceEmail?: string;
  targetEmail?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Méthode refusée" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !secretKey) throw new Error("Configuration serveur incomplète");

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Session requise" }, 401);

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const service = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) return json({ error: "Session invalide" }, 401);

    const payload = (await request.json()) as Payload;
    const requirePermission = async (permission: string) => {
      const { data, error } = await caller.rpc("has_permission", { requested_permission: permission });
      if (error || data !== true) throw new Error("Accès refusé");
    };
    const cleanEmail = payload.email?.trim().toLowerCase();

    switch (payload.action) {
      case "invite": {
        await requirePermission("admin.users.invite");
        if (!cleanEmail) throw new Error("Adresse e-mail obligatoire");
        const { data, error } = await service.auth.admin.inviteUserByEmail(cleanEmail, {
          data: { display_name: payload.displayName?.trim() || cleanEmail.split("@")[0] },
          redirectTo: Deno.env.get("INVITE_REDIRECT_URL") || undefined,
        });
        if (error) throw error;
        const { error: profileError } = await service.from("profiles").update({
          display_name: payload.displayName?.trim() || null,
          initials: payload.initials?.trim().toUpperCase() || null,
          custom_role_id: payload.roleId || null,
          status: "pending",
        }).eq("id", data.user.id);
        if (profileError) throw profileError;
        return json({ userId: data.user.id });
      }

      case "create": {
        await requirePermission("admin.users.invite");
        if (!cleanEmail) throw new Error("Adresse e-mail obligatoire");
        if (!payload.password || payload.password.length < 12) {
          throw new Error("Le mot de passe temporaire doit contenir au moins 12 caractères");
        }
        const { data, error } = await service.auth.admin.createUser({
          email: cleanEmail,
          password: payload.password,
          email_confirm: true,
          user_metadata: { display_name: payload.displayName?.trim() || cleanEmail.split("@")[0] },
        });
        if (error) throw error;
        const { error: profileError } = await service.from("profiles").update({
          display_name: payload.displayName?.trim() || null,
          initials: payload.initials?.trim().toUpperCase() || null,
          custom_role_id: payload.roleId || null,
          status: "active",
        }).eq("id", data.user.id);
        if (profileError) {
          await service.auth.admin.deleteUser(data.user.id);
          throw profileError;
        }
        return json({ userId: data.user.id });
      }

      case "update": {
        await requirePermission("admin.users.manage");
        if (!payload.targetUserId) throw new Error("Utilisateur cible obligatoire");
        const { data: callerProfile } = await service.from("profiles")
          .select("is_owner").eq("id", userData.user.id).single();
        const profilePatch: Record<string, unknown> = {
          display_name: payload.displayName?.trim() || null,
          initials: payload.initials?.trim().toUpperCase() || null,
          custom_role_id: payload.roleId || null,
        };
        if (typeof payload.isOwner === "boolean") {
          if (!callerProfile?.is_owner) throw new Error("Seul un propriétaire peut nommer un autre propriétaire");
          profilePatch.is_owner = payload.isOwner;
        }
        const { error } = await service.from("profiles").update(profilePatch)
          .eq("id", payload.targetUserId);
        if (error) throw error;
        return json({ userId: payload.targetUserId });
      }

      case "suspend": {
        await requirePermission("admin.users.suspend");
        if (!payload.targetUserId) throw new Error("Utilisateur cible obligatoire");
        if (payload.targetUserId === userData.user.id) throw new Error("Vous ne pouvez pas suspendre votre propre compte");
        const { error: profileError } = await service.from("profiles")
          .update({ status: "suspended" }).eq("id", payload.targetUserId);
        if (profileError) throw profileError;
        const { error } = await service.auth.admin.updateUserById(payload.targetUserId, {
          ban_duration: "876000h",
        });
        if (error) {
          await service.from("profiles").update({ status: "active" }).eq("id", payload.targetUserId);
          throw error;
        }
        return json({ userId: payload.targetUserId });
      }

      case "reactivate": {
        await requirePermission("admin.users.suspend");
        if (!payload.targetUserId) throw new Error("Utilisateur cible obligatoire");
        const { error: profileError } = await service.from("profiles")
          .update({ status: "active" }).eq("id", payload.targetUserId);
        if (profileError) throw profileError;
        const { error } = await service.auth.admin.updateUserById(payload.targetUserId, {
          ban_duration: "none",
        });
        if (error) {
          await service.from("profiles").update({ status: "suspended" }).eq("id", payload.targetUserId);
          throw error;
        }
        return json({ userId: payload.targetUserId });
      }

      case "transfer-demo": {
        await requirePermission("admin.demo_transfer");
        const sourceEmail = payload.sourceEmail?.trim().toLowerCase() || "demo@papa-immo.fr";
        const targetEmail = payload.targetEmail?.trim().toLowerCase() || "sd@familleducastel.com";
        const { data: transferId, error } = await caller.rpc("transfer_account_data", {
          source_email: sourceEmail,
          target_email: targetEmail,
          target_initials: payload.initials?.trim().toUpperCase() || "SD",
        });
        if (error) throw error;
        const { data: transfer, error: journalError } = await service.from("account_data_transfers")
          .select("source_user_id").eq("id", transferId).single();
        if (journalError) throw journalError;
        if (transfer?.source_user_id) {
          const { error: profileError } = await service.from("profiles")
            .update({ status: "suspended" }).eq("id", transfer.source_user_id);
          if (profileError) throw profileError;
          const { error: banError } = await service.auth.admin.updateUserById(transfer.source_user_id, {
            ban_duration: "876000h",
          });
          if (banError) throw banError;
        }
        return json({ transferId });
      }

      default:
        return json({ error: "Action inconnue" }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Accès refusé" ? 403 : 400;
    return json({ error: message }, status);
  }
});
