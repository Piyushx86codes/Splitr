import { mutation , query } from "./_generated/server";


export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // 1. Resolve a safe name fallback
    const name =
      identity.name || identity.givenName || identity.email.split("@")[0] || "Anonymous";

    // 2. Query for existing user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user !== null) {
      // If we've seen this identity before, sync updated name or image if changed
      const updates = {};
      if (user.name !== name) {
        updates.name = name;
      }
      if (identity.pictureUrl && user.imageUrl !== identity.pictureUrl) {
        updates.imageUrl = identity.pictureUrl;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch("users", user._id, updates);
      }
      return user._id;
    }

    // 3. Create new user record
    return await ctx.db.insert("users", {
      name: name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      imageUrl: identity.pictureUrl,
    });
  },
});


export const getCurrentUser = query({
  handler:async(ctx)=>{
    const identity = await ctx.auth.getUserIdentity();
    if(!identity){
      throw new Error("Not Authenticated user");
    }

    const user = await ctx.db.query("users").withIndex("by_token",(q)=>{
        q.eq("tokenIdentifier",identity.tokenIdentifier);
    })
    .first();

    if(!user){
      throw new Error("user not Found")
    }
    return user;
  }
})