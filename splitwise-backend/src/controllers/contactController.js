const supabase = require("../utils/supabaseClient");

// Helper functions for consistent responses
const errorResponse = (res, status, message) => {
  return res.status(status).json({ error: message });
};

const successResponse = (res, message, data = null) => {
  const response = { message };
  if (data) response.data = data;
  return res.status(200).json(response);
};

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Add friend directly by email (no requests)
exports.addFriend = async (req, res) => {
  try {
    const { friend_email } = req.body;

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const user_id = req.user.user_id;

    // Validate input
    if (!friend_email) {
      return errorResponse(res, 400, "Friend's email is required");
    }

    if (!isValidEmail(friend_email)) {
      return errorResponse(res, 400, "Please provide a valid email address");
    }

    // Find the friend by email
    const { data: friendUser, error: friendError } = await supabase
      .from("users")
      .select("user_id, username, email")
      .eq("email", friend_email.toLowerCase())
      .single();

    if (friendError || !friendUser) {
      return errorResponse(res, 404, "User not found with this email");
    }

    if (friendUser.user_id === user_id) {
      return errorResponse(res, 400, "You cannot add yourself as a friend");
    }

    // Check if friendship already exists (either direction)
    const { data: existing } = await supabase
      .from("user_contacts")
      .select("contact_id")
      .or(`and(user_id.eq.${user_id},friend_user_id.eq.${friendUser.user_id}),and(user_id.eq.${friendUser.user_id},friend_user_id.eq.${user_id})`)
      .single();

    if (existing) {
      return errorResponse(res, 409, "You are already friends with this user");
    }

    // Create friendship (both directions for easier querying)
    const { data: contacts, error: contactError } = await supabase
      .from("user_contacts")
      .insert([
        {
          user_id: user_id,
          friend_user_id: friendUser.user_id,
        },
        {
          user_id: friendUser.user_id,
          friend_user_id: user_id,
        }
      ])
      .select("contact_id, user_id, friend_user_id, created_at");

    if (contactError) {
      return errorResponse(res, 400, contactError.message);
    }

    res.status(201).json({
      message: "Friend added successfully",
      friend: {
        user_id: friendUser.user_id,
        username: friendUser.username,
        email: friendUser.email,
      },
      contacts: contacts,
    });
  } catch (error) {
    console.error("Add friend error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get all friends for a user
exports.getFriends = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const user_id = req.user.user_id;

    // Get friends with their details
    const { data: friendships, error: friendError } = await supabase
      .from("user_contacts")
      .select(`
        contact_id,
        friend_user_id,
        created_at,
        users!user_contacts_friend_user_id_fkey (
          user_id,
          username,
          email
        )
      `)
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (friendError) {
      return errorResponse(res, 400, friendError.message);
    }

    // Format friends list
    const friends = friendships.map((friendship) => ({
      contact_id: friendship.contact_id,
      user_id: friendship.users.user_id,
      username: friendship.users.username,
      email: friendship.users.email,
      friends_since: friendship.created_at,
    }));

    res.status(200).json({
      message: "Friends retrieved successfully",
      friends: friends,
      count: friends.length,
    });
  } catch (error) {
    console.error("Get friends error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Search for users to add as friends
exports.searchUsers = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const { search } = req.query;
    const user_id = req.user.user_id;

    if (!search || search.trim() === "") {
      return errorResponse(res, 400, "Search query is required");
    }

    // Search for users by username or email
    const { data: users, error: searchError } = await supabase
      .from("users")
      .select("user_id, username, email, created_at")
      .or(`username.ilike.%${search}%,email.ilike.%${search}%`)
      .neq("user_id", user_id) // Exclude current user
      .limit(20);

    if (searchError) {
      return errorResponse(res, 400, searchError.message);
    }

    // Get current user's friends to mark them in results
    const { data: friendships } = await supabase
      .from("user_contacts")
      .select("friend_user_id")
      .eq("user_id", user_id);

    const friendIds = friendships?.map(f => f.friend_user_id) || [];

    // Add friendship status to search results
    const searchResults = users.map(user => ({
      ...user,
      is_friend: friendIds.includes(user.user_id)
    }));

    res.status(200).json({
      message: "User search completed",
      users: searchResults,
      count: searchResults.length,
    });
  } catch (error) {
    console.error("Search users error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Remove a friend
exports.removeFriend = async (req, res) => {
  try {
    const { friend_user_id } = req.params;

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const user_id = req.user.user_id;

    if (friend_user_id === user_id) {
      return errorResponse(res, 400, "You cannot remove yourself");
    }

    // Get friend details before removing
    const { data: friendUser, error: friendError } = await supabase
      .from("users")
      .select("user_id, username, email")
      .eq("user_id", friend_user_id)
      .single();

    if (friendError || !friendUser) {
      return errorResponse(res, 404, "Friend not found");
    }

    // Check if friendship exists
    const { data: friendship } = await supabase
      .from("user_contacts")
      .select("contact_id")
      .eq("user_id", user_id)
      .eq("friend_user_id", friend_user_id)
      .single();

    if (!friendship) {
      return errorResponse(res, 404, "You are not friends with this user");
    }

    // Remove friendship (both directions)
    const { error: removeError } = await supabase
      .from("user_contacts")
      .delete()
      .or(`and(user_id.eq.${user_id},friend_user_id.eq.${friend_user_id}),and(user_id.eq.${friend_user_id},friend_user_id.eq.${user_id})`);

    if (removeError) {
      return errorResponse(res, 400, removeError.message);
    }

    res.status(200).json({
      message: "Friend removed successfully",
      removed_friend: {
        user_id: friendUser.user_id,
        username: friendUser.username,
        email: friendUser.email,
      },
    });
  } catch (error) {
    console.error("Remove friend error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get friend details
exports.getFriendDetails = async (req, res) => {
  try {
    const { friend_user_id } = req.params;

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const user_id = req.user.user_id;

    // Check if they are friends
    const { data: friendship, error: friendshipError } = await supabase
      .from("user_contacts")
      .select(`
        contact_id,
        created_at,
        users!user_contacts_friend_user_id_fkey (
          user_id,
          username,
          email,
          created_at
        )
      `)
      .eq("user_id", user_id)
      .eq("friend_user_id", friend_user_id)
      .single();

    if (friendshipError || !friendship) {
      return errorResponse(res, 404, "Friend not found or you are not friends");
    }

    res.status(200).json({
      message: "Friend details retrieved successfully",
      friend: {
        user_id: friendship.users.user_id,
        username: friendship.users.username,
        email: friendship.users.email,
        member_since: friendship.users.created_at,
        friends_since: friendship.created_at,
      },
    });
  } catch (error) {
    console.error("Get friend details error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};
