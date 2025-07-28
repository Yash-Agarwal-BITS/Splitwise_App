const supabase = require("../utils/supabaseClient");

// Add friend directly by email (no requests)
exports.addFriend = async (req, res) => {
  try {
    const { friend_email } = req.body;
    const user_id = req.user?.user_id || "temp-user-id";

    // Find the friend by email
    const { data: friendUser, error: friendError } = await supabase
      .from("users")
      .select("user_id, username, email")
      .eq("email", friend_email)
      .single();

    if (friendError || !friendUser) {
      return res.status(404).json({
        error: "User not found with this email"
      });
    }

    if (friendUser.user_id === user_id) {
      return res.status(400).json({
        error: "You cannot add yourself as a friend"
      });
    }

    // Check if friendship already exists (either direction)
    const { data: existing, error: existingError } = await supabase
      .from("user_contacts")
      .select("contact_id")
      .or(`and(user_id.eq.${user_id},friend_user_id.eq.${friendUser.user_id}),and(user_id.eq.${friendUser.user_id},friend_user_id.eq.${user_id})`)
      .single();

    if (existing) {
      return res.status(400).json({
        error: "You are already friends with this user"
      });
    }

    // Create friendship (both directions for easier querying)
    const { data: contacts, error: contactError } = await supabase
      .from("user_contacts")
      .insert([
        {
          user_id: user_id,
          friend_user_id: friendUser.user_id
        },
        {
          user_id: friendUser.user_id,
          friend_user_id: user_id
        }
      ])
      .select("contact_id, user_id, friend_user_id, created_at");

    if (contactError) {
      return res.status(400).json({ error: contactError.message });
    }

    res.status(201).json({
      message: "Friend added successfully",
      friend: {
        user_id: friendUser.user_id,
        username: friendUser.username,
        email: friendUser.email,
        added_at: contacts[0].created_at
      }
    });
  } catch (error) {
    console.error("Add friend error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove friend
exports.removeFriend = async (req, res) => {
  try {
    const { friend_user_id } = req.params;
    const user_id = req.user?.user_id || "temp-user-id";

    // Delete both directions of the friendship
    const { error: deleteError } = await supabase
      .from("user_contacts")
      .delete()
      .or(`and(user_id.eq.${user_id},friend_user_id.eq.${friend_user_id}),and(user_id.eq.${friend_user_id},friend_user_id.eq.${user_id})`);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    res.status(200).json({
      message: "Friend removed successfully"
    });
  } catch (error) {
    console.error("Remove friend error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user's friends list
exports.getFriendsList = async (req, res) => {
  try {
    const user_id = req.user?.user_id || req.params.user_id || "temp-user-id";

    // Get friends (since we store both directions, we can just query one way)
    const { data: contacts, error: contactsError } = await supabase
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
      .eq("user_id", user_id);

    if (contactsError) {
      return res.status(400).json({ error: contactsError.message });
    }

    // Format friends list
    const friendsList = contacts.map(contact => ({
      contact_id: contact.contact_id,
      user_id: contact.friend_user_id,
      username: contact.users.username,
      email: contact.users.email,
      friends_since: contact.created_at
    }));

    res.status(200).json({
      message: "Friends list retrieved successfully",
      friends: friendsList,
      count: friendsList.length
    });
  } catch (error) {
    console.error("Get friends list error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get unified contact list (friends + all group members)
exports.getUnifiedContactList = async (req, res) => {
  try {
    const user_id = req.user?.user_id || req.params.user_id || "temp-user-id";

    let allContacts = [];

    // Get all friends
    const { data: friends, error: friendsError } = await supabase
      .from("user_contacts")
      .select(`
        friend_user_id,
        users!user_contacts_friend_user_id_fkey (
          user_id,
          username,
          email
        )
      `)
      .eq("user_id", user_id);

    if (!friendsError && friends) {
      const friendsFormatted = friends.map(contact => ({
        user_id: contact.friend_user_id,
        username: contact.users.username,
        email: contact.users.email
      }));
      allContacts.push(...friendsFormatted);
    }

    // Get all group members from all groups user is in
    const { data: userGroups, error: userGroupsError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user_id);

    if (!userGroupsError && userGroups && userGroups.length > 0) {
      const groupIds = userGroups.map(g => g.group_id);
      
      const { data: allGroupMembers, error: groupMembersError } = await supabase
        .from("group_members")
        .select(`
          user_id,
          users (
            user_id,
            username,
            email
          )
        `)
        .in("group_id", groupIds)
        .neq("user_id", user_id); // Exclude current user

      if (!groupMembersError && allGroupMembers) {
        const groupMembersFormatted = allGroupMembers.map(member => ({
          user_id: member.user_id,
          username: member.users.username,
          email: member.users.email
        }));
        allContacts.push(...groupMembersFormatted);
      }
    }

    // Remove duplicates - keep unique users only
    const uniqueContacts = allContacts.filter((contact, index, self) =>
      index === self.findIndex(c => c.user_id === contact.user_id)
    );

    // Sort alphabetically by username
    uniqueContacts.sort((a, b) => a.username.localeCompare(b.username));

    res.status(200).json({
      message: "Unified contact list retrieved successfully",
      contacts: uniqueContacts,
      count: uniqueContacts.length
    });
  } catch (error) {
    console.error("Get unified contact list error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
