import { mutation, query } from "./_generated/server";
import { v } from "convex/values"; // Fixed: Added v import

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

// Search users
export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    // Fixed: Replaced invalid ctx.runQuery with local helper function
    const currentUser = await getUserHelper(ctx);

    // Don't search if query is empty
    if (args.query.length === 0) {
      return [];
    }

    // Search by name using search index
    const nameResults = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .collect();

    // Search by emails using search index
    const emailResults = await ctx.db
      .query("users")
      .withSearchIndex("search_email", (q) => q.search("email", args.query))
      .collect();

    // Combine results removing duplicates
    const users = [
      ...nameResults,
      ...emailResults.filter(
        (email) => !nameResults.some((name) => name._id === email._id)
      ),
    ];

    // Exclude current user from results (if authenticated)
    return users
      .filter((user) => currentUser ? user._id !== currentUser._id : true)
      .map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
      }));
  },
});
