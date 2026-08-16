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
  args: {
    query: v.optional(v.string()), // <-- Change v.string() to v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const searchQuery = args.query?.trim().toLowerCase() || "";

    // If no search query provided, return an empty list (or recent contacts)
    if (!searchQuery) {
      return [];
    }

    // Fetch all users and filter by name or email
    const users = await ctx.db.query("users").collect();

    return users
      .filter((user) => {
        const matchesName = user.name?.toLowerCase().includes(searchQuery);
        const matchesEmail = user.email?.toLowerCase().includes(searchQuery);
        const isNotCurrent = user.tokenIdentifier !== identity.tokenIdentifier;

        return (matchesName || matchesEmail) && isNotCurrent;
      })
      .slice(0, 10); // Limit to top 10 results
  },
});