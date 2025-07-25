const supabase = require("../utils/supabaseClient");

// Create a new group
exports.createGroup = async (req, res) => {
  try {
    const { group_name, description } = req.body;
    const created_by = req.user?.user_id; // Assuming you'll add auth middleware later

    // Validate input
    if (!group_name) {
      return res.status(400).json({
        error: "Group name is required"
      });
    }

    // For now, we'll use a temporary user_id if no auth is implemented
    const temp_created_by = created_by || "temp-user-id";

    // Create group
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .insert([{
        group_name,
        description: description || null,
        created_by: temp_created_by
      }])
      .select("group_id, group_name, description, created_by, created_at");

    if (groupError) {
      return res.status(400).json({ error: groupError.message });
    }

    const group = groupData[0];

    // Add creator as the first member
    const { error: memberError } = await supabase
      .from("group_members")
      .insert([{
        group_id: group.group_id,
        user_id: temp_created_by
      }]);

    if (memberError) {
      // If adding member fails, we should ideally rollback the group creation
      console.error("Failed to add creator as member:", memberError);
    }

    res.status(201).json({
      message: "Group created successfully",
      group: group
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add user to group
exports.addUserToGroup = async (req, res) => {
  try {
    const { group_id } = req.params;
    const { user_id } = req.body;

    // Validate input
    if (!user_id) {
      return res.status(400).json({
        error: "User ID is required"
      });
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("group_id, group_name")
      .eq("group_id", group_id)
      .single();

    if (groupError || !group) {
      return res.status(404).json({
        error: "Group not found"
      });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, username, email")
      .eq("user_id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("group_member_id")
      .eq("group_id", group_id)
      .eq("user_id", user_id)
      .single();

    if (existingMember) {
      return res.status(409).json({
        error: "User is already a member of this group"
      });
    }

    // Add user to group
    const { data: memberData, error: memberError } = await supabase
      .from("group_members")
      .insert([{
        group_id,
        user_id
      }])
      .select("group_member_id, group_id, user_id, joined_at");

    if (memberError) {
      return res.status(400).json({ error: memberError.message });
    }

    res.status(201).json({
      message: "User added to group successfully",
      member: memberData[0],
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email
      },
      group: {
        group_id: group.group_id,
        group_name: group.group_name
      }
    });
  } catch (error) {
    console.error("Add user to group error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group details with members
exports.getGroupDetails = async (req, res) => {
  try {
    const { group_id } = req.params;

    // Get group information
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("group_id, group_name, description, created_by, created_at, updated_at")
      .eq("group_id", group_id)
      .single();

    if (groupError || !group) {
      return res.status(404).json({
        error: "Group not found"
      });
    }

    // Get group members with user details
    const { data: membersData, error: membersError } = await supabase
      .from("group_members")
      .select(`
        group_member_id,
        group_id,
        user_id,
        joined_at,
        users (
          user_id,
          username,
          email
        )
      `)
      .eq("group_id", group_id)
      .order("joined_at", { ascending: true });

    if (membersError) {
      return res.status(400).json({ error: membersError.message });
    }

    // Format members data
    const members = membersData.map(member => ({
      group_member_id: member.group_member_id,
      group_id: member.group_id,
      user_id: member.user_id,
      joined_at: member.joined_at,
      username: member.users.username,
      email: member.users.email
    }));

    // Get creator details
    const { data: creator, error: creatorError } = await supabase
      .from("users")
      .select("user_id, username, email")
      .eq("user_id", group.created_by)
      .single();

    res.status(200).json({
      message: "Group details retrieved successfully",
      group: {
        ...group,
        creator: creator || null
      },
      members: members,
      member_count: members.length
    });
  } catch (error) {
    console.error("Get group details error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all groups for a user
exports.getUserGroups = async (req, res) => {
  try {
    const user_id = req.user?.user_id || req.params.user_id || "temp-user-id";

    // Get groups where user is a member
    const { data: userGroups, error: groupsError } = await supabase
      .from("group_members")
      .select(`
        group_member_id,
        joined_at,
        groups (
          group_id,
          group_name,
          description,
          created_by,
          created_at
        )
      `)
      .eq("user_id", user_id)
      .order("joined_at", { ascending: false });

    if (groupsError) {
      return res.status(400).json({ error: groupsError.message });
    }

    // Format response
    const groups = userGroups.map(membership => ({
      group_id: membership.groups.group_id,
      group_name: membership.groups.group_name,
      description: membership.groups.description,
      created_by: membership.groups.created_by,
      created_at: membership.groups.created_at,
      joined_at: membership.joined_at,
      is_creator: membership.groups.created_by === user_id
    }));

    res.status(200).json({
      message: "User groups retrieved successfully",
      groups: groups,
      count: groups.length
    });
  } catch (error) {
    console.error("Get user groups error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove user from group
exports.removeUserFromGroup = async (req, res) => {
  try {
    const { group_id, user_id } = req.params;

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("group_id, group_name, created_by")
      .eq("group_id", group_id)
      .single();

    if (groupError || !group) {
      return res.status(404).json({
        error: "Group not found"
      });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, username")
      .eq("user_id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    // Don't allow removing the group creator
    if (group.created_by === user_id) {
      return res.status(400).json({
        error: "Cannot remove group creator. Delete the group instead."
      });
    }

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("group_member_id")
      .eq("group_id", group_id)
      .eq("user_id", user_id)
      .single();

    if (membershipError || !membership) {
      return res.status(404).json({
        error: "User is not a member of this group"
      });
    }

    // Remove user from group
    const { error: deleteError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", group_id)
      .eq("user_id", user_id);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    res.status(200).json({
      message: "User removed from group successfully",
      removed_user: {
        user_id: user.user_id,
        username: user.username
      },
      group: {
        group_id: group.group_id,
        group_name: group.group_name
      }
    });
  } catch (error) {
    console.error("Remove user from group error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
