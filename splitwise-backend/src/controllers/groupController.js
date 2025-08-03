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

// Create a new group
exports.createGroup = async (req, res) => {
  try {
    const { group_name, description } = req.body;
    
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const created_by = req.user.user_id;

    // Validate input
    if (!group_name || group_name.trim() === "") {
      return errorResponse(res, 400, "Group name is required");
    }

    // Create group
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .insert([
        {
          group_name: group_name.trim(),
          description: description?.trim() || null,
          created_by: created_by,
        },
      ])
      .select("group_id, group_name, description, created_by, created_at");

    if (groupError) {
      return errorResponse(res, 400, groupError.message);
    }

    const group = groupData[0];

    // Add creator as the first member
    const { error: memberError } = await supabase
      .from("group_members")
      .insert([
        {
          group_id: group.group_id,
          user_id: created_by,
        },
      ]);

    if (memberError) {
      // Rollback group creation if adding member fails
      await supabase.from("groups").delete().eq("group_id", group.group_id);
      return errorResponse(res, 500, "Failed to create group properly");
    }

    res.status(201).json({
      message: "Group created successfully",
      group: group,
    });
  } catch (error) {
    console.error("Create group error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Add user to group
exports.addUserToGroup = async (req, res) => {
  try {
    const { group_id } = req.params;
    const { user_id } = req.body;

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    // Validate input
    if (!user_id) {
      return errorResponse(res, 400, "User ID is required");
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("group_id, group_name, created_by")
      .eq("group_id", group_id)
      .single();

    if (groupError || !group) {
      return errorResponse(res, 404, "Group not found");
    }

    // Check if the requesting user is the group creator or already a member
    const requestingUserId = req.user.user_id;
    const isCreator = group.created_by === requestingUserId;
    
    if (!isCreator) {
      const { data: membership } = await supabase
        .from("group_members")
        .select("group_member_id")
        .eq("group_id", group_id)
        .eq("user_id", requestingUserId)
        .single();

      if (!membership) {
        return errorResponse(res, 403, "You must be a group member to add users");
      }
    }

    // Check if user to be added exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, username, email")
      .eq("user_id", user_id)
      .single();

    if (userError || !user) {
      return errorResponse(res, 404, "User not found");
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("group_member_id")
      .eq("group_id", group_id)
      .eq("user_id", user_id)
      .single();

    if (existingMember) {
      return errorResponse(res, 409, "User is already a member of this group");
    }

    // Add user to group
    const { data: memberData, error: memberError } = await supabase
      .from("group_members")
      .insert([
        {
          group_id,
          user_id,
        },
      ])
      .select("group_member_id, group_id, user_id, joined_at");

    if (memberError) {
      return errorResponse(res, 400, memberError.message);
    }

    res.status(201).json({
      message: "User added to group successfully",
      member: memberData[0],
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
      },
      group: {
        group_id: group.group_id,
        group_name: group.group_name,
      },
    });
  } catch (error) {
    console.error("Add user to group error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get group details with members
exports.getGroupDetails = async (req, res) => {
  try {
    const { group_id } = req.params;

    console.log('getGroupDetails called with params:', req.params); // Debug log
    console.log('Raw group_id:', group_id, 'Type:', typeof group_id); // Debug log

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const user_id = req.user.user_id;

    // Validate group_id format (should be a UUID or integer)
    console.log('Raw group_id:', group_id, 'Type:', typeof group_id); // Debug log
    console.log('User ID from token:', user_id, 'Type:', typeof user_id); // Debug log
    
    if (!group_id || group_id.trim() === '') {
      console.log('Empty group ID detected'); // Debug log
      return errorResponse(res, 400, "Invalid group ID");
    }

    console.log('Looking for group with ID:', group_id); // Debug log

    // First check if user is a member of this group and get group info through the join
    const { data: membershipWithGroup, error: membershipError } = await supabase
      .from("group_members")
      .select(`
        group_member_id,
        user_id,
        groups (
          group_id,
          group_name,
          description,
          created_by,
          created_at
        )
      `)
      .eq("group_id", group_id)
      .eq("user_id", user_id)
      .single();

    console.log('Membership query:', { group_id, user_id }); // Debug log
    console.log('Membership with group result:', { membershipWithGroup, error: membershipError }); // Debug log

    // If no membership found, let's check what memberships exist for this group
    if (membershipError || !membershipWithGroup) {
      const { data: allMemberships, error: allMembersError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", group_id);
      
      console.log('All memberships for this group:', { allMemberships, error: allMembersError }); // Debug log
      return errorResponse(res, 403, "You must be a group member to view group details");
    }

    if (!membershipWithGroup.groups) {
      return errorResponse(res, 404, "Group not found");
    }

    const group = membershipWithGroup.groups;

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
      return errorResponse(res, 400, membersError.message);
    }

    // Format members data
    const members = membersData.map((member) => ({
      group_member_id: member.group_member_id,
      group_id: member.group_id,
      user_id: member.user_id,
      joined_at: member.joined_at,
      username: member.users.username,
      email: member.users.email,
      is_creator: member.user_id === group.created_by,
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
        creator: creator || null,
      },
      members: members,
      member_count: members.length,
    });
  } catch (error) {
    console.error("Get group details error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get all groups for a user
exports.getUserGroups = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const user_id = req.user.user_id;

    // Get groups where user is a member with member counts
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
      return errorResponse(res, 400, groupsError.message);
    }

    // Get member counts for each group
    const groupIds = userGroups.map(membership => membership.groups.group_id);
    
    const memberCounts = {};
    if (groupIds.length > 0) {
      const { data: memberCountData, error: countError } = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", groupIds);

      if (!countError && memberCountData) {
        // Count members for each group
        memberCountData.forEach(member => {
          memberCounts[member.group_id] = (memberCounts[member.group_id] || 0) + 1;
        });
      }
    }

    // Format response
    const groups = userGroups.map((membership) => ({
      group_id: membership.groups.group_id,
      group_name: membership.groups.group_name,
      description: membership.groups.description,
      created_by: membership.groups.created_by,
      created_at: membership.groups.created_at,
      joined_at: membership.joined_at,
      is_creator: membership.groups.created_by === user_id,
      member_count: memberCounts[membership.groups.group_id] || 0,
    }));

    res.status(200).json({
      message: "User groups retrieved successfully",
      groups: groups,
      count: groups.length,
    });
  } catch (error) {
    console.error("Get user groups error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Remove user from group
exports.removeUserFromGroup = async (req, res) => {
  try {
    const { group_id, user_id } = req.params;

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const requestingUserId = req.user.user_id;

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("group_id, group_name, created_by")
      .eq("group_id", group_id)
      .single();

    if (groupError || !group) {
      return errorResponse(res, 404, "Group not found");
    }

    // Check if user to be removed exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, username")
      .eq("user_id", user_id)
      .single();

    if (userError || !user) {
      return errorResponse(res, 404, "User not found");
    }

    // Don't allow removing the group creator
    if (group.created_by === user_id) {
      return errorResponse(res, 400, "Cannot remove group creator. Delete the group instead.");
    }

    // Check authorization: only group creator or the user themselves can remove
    const canRemove = requestingUserId === group.created_by || requestingUserId === user_id;
    
    if (!canRemove) {
      return errorResponse(res, 403, "You can only remove yourself or be the group creator");
    }

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("group_member_id")
      .eq("group_id", group_id)
      .eq("user_id", user_id)
      .single();

    if (membershipError || !membership) {
      return errorResponse(res, 404, "User is not a member of this group");
    }

    // Remove user from group
    const { error: deleteError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", group_id)
      .eq("user_id", user_id);

    if (deleteError) {
      return errorResponse(res, 400, deleteError.message);
    }

    const action = requestingUserId === user_id ? "left" : "removed from";

    res.status(200).json({
      message: `User ${action} group successfully`,
      removed_user: {
        user_id: user.user_id,
        username: user.username,
      },
      group: {
        group_id: group.group_id,
        group_name: group.group_name,
      },
    });
  } catch (error) {
    console.error("Remove user from group error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Update group details
exports.updateGroup = async (req, res) => {
  try {
    const { group_id } = req.params;
    const { group_name, description } = req.body;

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    // Check if group exists and user is the creator
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("group_id, group_name, created_by")
      .eq("group_id", group_id)
      .single();

    if (groupError || !group) {
      return errorResponse(res, 404, "Group not found");
    }

    // Only group creator can update group details
    if (group.created_by !== req.user.user_id) {
      return errorResponse(res, 403, "Only group creator can update group details");
    }

    const updateData = {};
    if (group_name && group_name.trim()) updateData.group_name = group_name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    
    if (Object.keys(updateData).length === 0) {
      return errorResponse(res, 400, "No valid data provided for update");
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("groups")
      .update(updateData)
      .eq("group_id", group_id)
      .select("group_id, group_name, description, created_by, created_at, updated_at");

    if (error || !data || data.length === 0) {
      return errorResponse(res, 404, "Group not found or update failed");
    }

    res.status(200).json({ 
      message: "Group updated successfully", 
      group: data[0] 
    });
  } catch (error) {
    console.error("Update group error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Delete group entirely
exports.deleteGroup = async (req, res) => {
  try {
    const { group_id } = req.params;

    console.log('deleteGroup called with group_id:', group_id); // Debug log

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    console.log('User attempting delete:', req.user.user_id); // Debug log

    // Check if group exists and user is the creator
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("group_id, group_name, created_by")
      .eq("group_id", group_id)
      .single();

    console.log('Group lookup result:', { group, error: groupError }); // Debug log

    if (groupError || !group) {
      return errorResponse(res, 404, "Group not found");
    }

    console.log('Group creator:', group.created_by, 'Current user:', req.user.user_id); // Debug log

    // Only group creator can delete the group
    if (group.created_by !== req.user.user_id) {
      return errorResponse(res, 403, "Only group creator can delete the group");
    }

    console.log('Starting delete process for group:', group_id); // Debug log

    try {
      // Delete related data first (to maintain referential integrity)
      
      // First, get all expenses for this group
      const { data: groupExpenses, error: expensesError } = await supabase
        .from("expenses")
        .select("expense_id")
        .eq("group_id", group_id);

      console.log('Group expenses found:', groupExpenses); // Debug log

      if (expensesError) {
        console.error('Error finding group expenses:', expensesError);
      }

      // Delete expense participants for these expenses
      if (groupExpenses && groupExpenses.length > 0) {
        const expenseIds = groupExpenses.map(exp => exp.expense_id);
        
        const { error: participantsError } = await supabase
          .from("expense_participants")
          .delete()
          .in("expense_id", expenseIds);

        if (participantsError) {
          console.error('Error deleting expense participants:', participantsError);
        }

        console.log('Deleted expense participants for expenses:', expenseIds); // Debug log
      }

      // Delete expenses related to this group
      const { error: expensesDeleteError } = await supabase
        .from("expenses")
        .delete()
        .eq("group_id", group_id);

      if (expensesDeleteError) {
        console.error('Error deleting expenses:', expensesDeleteError);
      }

      console.log('Deleted expenses for group:', group_id); // Debug log

      // Delete group members
      const { error: membersError } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", group_id);

      if (membersError) {
        console.error('Error deleting group members:', membersError);
      }

      console.log('Deleted group members for group:', group_id); // Debug log

      // Delete the group itself
      const { error: groupDeleteError } = await supabase
        .from("groups")
        .delete()
        .eq("group_id", group_id);

      if (groupDeleteError) {
        console.error('Error deleting group:', groupDeleteError);
        return errorResponse(res, 500, "Failed to delete group");
      }

      console.log('Successfully deleted group:', group_id); // Debug log

      res.status(200).json({ 
        message: "Group deleted successfully",
        deleted_group: {
          group_id: group.group_id,
          group_name: group.group_name
        }
      });
    } catch (deleteError) {
      console.error('Error during group deletion:', deleteError);
      return errorResponse(res, 500, "Failed to delete group and related data");
    }
  } catch (error) {
    console.error("Delete group error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};
