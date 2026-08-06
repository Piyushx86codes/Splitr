// convex/users.js
import { mutation, query, internalQuery } from "./_generated/server"; // Added internalQuery
import { v } from "convex/values";

/**
 * Helper function for internal backend usage
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

  return user ?? null;
}

// 1. Internal query used by dashbord.js (ctx.runQuery(internal.users.getCurrentUsers))
export const getCurrentUsers = internalQuery({
  handler: async (ctx) => {
    return await getUserHelper(ctx);
  },
});

// 2. Public query used by the frontend
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
    const currentUser = await getUserHelper(ctx);

    if (args.query.length === 0) {
      return [];
    }

    const nameResults = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .collect();

    const emailResults = await ctx.db
      .query("users")
      .withSearchIndex("search_email", (q) => q.search("email", args.query))
      .collect();

    const users = [
      ...nameResults,
      ...emailResults.filter(
        (email) => !nameResults.some((name) => name._id === email._id)
      ),
    ];

    return users
      .filter((user) => (currentUser ? user._id !== currentUser._id : true))
      .map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
      }));
  },
});