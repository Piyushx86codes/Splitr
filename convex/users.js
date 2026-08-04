import { mutation, query } from "./_generated/server";

/**
 * Plain JS helper function for internal backend queries/mutations.
 * Returns the user document or `null` if unauthenticated/not found.
 */
export async function getUserHelper(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .first();

  if (!user) {
    return null;
  }

  return user;
}

// Convex Query for frontend
export const getCurrentUser = query({
  handler: async (ctx) => {
    const user = await getUserHelper(ctx);
    if (!user) {
      throw new Error("User not found or unauthenticated");
    }
    return user;
  },
});

// Convex Mutation for user sync
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    const name =
      identity.name || identity.givenName || identity.email.split("@")[0] || "Anonymous";

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user !== null) {
      const updates = {};
      if (user.name !== name) updates.name = name;
      if (identity.pictureUrl && user.imageUrl !== identity.pictureUrl) {
        updates.imageUrl = identity.pictureUrl;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
      }
      return user._id;
    }

    return await ctx.db.insert("users", {
      name: name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      imageUrl: identity.pictureUrl,
    });
  },
});


//search users//
