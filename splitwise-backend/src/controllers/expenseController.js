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

// Create a new expense (both group and personal)
exports.createExpense = async (req, res) => {
  try {
    const {
      group_id,
      amount,
      description,
      expense_type,
      participants, // Array of {user_id, share}
    } = req.body;

    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const paid_by = req.user.user_id;

    // Validate input
    if (!amount || amount <= 0) {
      return errorResponse(res, 400, "Amount must be greater than 0");
    }

    if (!participants || participants.length === 0) {
      return errorResponse(res, 400, "At least one participant is required");
    }

    // Validate expense type
    const validTypes = ["group", "personal"];
    if (!expense_type || !validTypes.includes(expense_type)) {
      return errorResponse(res, 400, "expense_type must be 'group' or 'personal'");
    }

    // For group expenses, validate group exists and user is member
    if (expense_type === "group") {
      if (!group_id) {
        return errorResponse(res, 400, "group_id is required for group expenses");
      }

      // Check if group exists
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("group_id")
        .eq("group_id", group_id)
        .single();

      if (groupError || !group) {
        return errorResponse(res, 404, "Group not found");
      }

      // Check if user is group member
      const { data: membership, error: memberError } = await supabase
        .from("group_members")
        .select("group_member_id")
        .eq("group_id", group_id)
        .eq("user_id", paid_by)
        .single();

      if (memberError || !membership) {
        return errorResponse(res, 403, "You must be a group member to add group expenses");
      }
    }

    // For personal expenses, group_id should be null
    const finalGroupId = expense_type === "personal" ? null : group_id;

    // Validate participants total shares
    const totalShares = participants.reduce((sum, p) => sum + (p.share || 0), 0);
    if (Math.abs(totalShares - amount) > 0.01) {
      return errorResponse(res, 400, "Total participant shares must equal the expense amount");
    }

    // Create expense
    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert([
        {
          group_id: finalGroupId,
          paid_by: paid_by,
          amount: amount,
          description: description?.trim() || null,
          expense_type: expense_type,
        },
      ])
      .select("expense_id, group_id, paid_by, amount, description, expense_type, created_at");

    if (expenseError) {
      return errorResponse(res, 400, expenseError.message);
    }

    const expense = expenseData[0];

    // Add participants
    const participantInserts = participants.map((participant) => ({
      expense_id: expense.expense_id,
      user_id: participant.user_id,
      share: participant.share,
    }));

    const { data: participantsData, error: participantsError } = await supabase
      .from("expense_participants")
      .insert(participantInserts)
      .select("participant_id, user_id, share");

    if (participantsError) {
      // Rollback expense if participants insert fails
      await supabase.from("expenses").delete().eq("expense_id", expense.expense_id);
      return errorResponse(res, 400, participantsError.message);
    }

    res.status(201).json({
      message: "Expense created successfully",
      expense: expense,
      participants: participantsData,
    });
  } catch (error) {
    console.error("Create expense error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get expenses for a user (both personal and group)
exports.getUserExpenses = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const user_id = req.user.user_id;
    const { expense_type, group_id, limit } = req.query;

    let query = supabase.from("expenses").select(`
        expense_id,
        group_id,
        paid_by,
        amount,
        description,
        expense_type,
        created_at,
        groups (
          group_id,
          group_name
        ),
        users!expenses_paid_by_fkey (
          user_id,
          username,
          email
        )
      `);

    // Filter by expense type if specified
    if (expense_type) {
      query = query.eq("expense_type", expense_type);
    }

    // Filter by group if specified
    if (group_id) {
      query = query.eq("group_id", group_id);
    }

    // Only get expenses where user is either the payer or a participant
    let finalQuery = query.order("created_at", { ascending: false });
    
    // Apply limit if specified
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        finalQuery = finalQuery.limit(limitNum);
      }
    }
    
    const { data: allExpenses, error: expenseError } = await finalQuery;

    if (expenseError) {
      return errorResponse(res, 400, expenseError.message);
    }

    // Get expense IDs where user is a participant
    const { data: participations, error: participationError } = await supabase
      .from("expense_participants")
      .select("expense_id")
      .eq("user_id", user_id);

    const userExpenseIds = participations?.map(p => p.expense_id) || [];

    // Filter expenses where user is involved (paid or participating)
    const userExpenses = allExpenses.filter(
      (expense) => expense.paid_by === user_id || userExpenseIds.includes(expense.expense_id)
    );

    // Get participants for each expense
    const expensesWithParticipants = await Promise.all(
      userExpenses.map(async (expense) => {
        const { data: participants, error: partError } = await supabase
          .from("expense_participants")
          .select(`
            participant_id,
            user_id,
            share,
            users (
              user_id,
              username,
              email
            )
          `)
          .eq("expense_id", expense.expense_id);

        return {
          ...expense,
          participants: participants || [],
        };
      })
    );

    res.status(200).json({
      message: "User expenses retrieved successfully",
      expenses: expensesWithParticipants,
      count: expensesWithParticipants.length,
    });
  } catch (error) {
    console.error("Get user expenses error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get expenses for a specific group
exports.getGroupExpenses = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const { group_id } = req.params;
    const user_id = req.user.user_id;

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("group_id, group_name, description")
      .eq("group_id", group_id)
      .single();

    if (groupError || !group) {
      return errorResponse(res, 404, "Group not found");
    }

    // Check if user is a member of this group
    const { data: membership, error: memberError } = await supabase
      .from("group_members")
      .select("group_member_id")
      .eq("group_id", group_id)
      .eq("user_id", user_id)
      .single();

    if (memberError || !membership) {
      return errorResponse(res, 403, "You must be a group member to view group expenses");
    }

    // Get group expenses
    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select(`
        expense_id,
        group_id,
        paid_by,
        amount,
        description,
        expense_type,
        created_at,
        users!expenses_paid_by_fkey (
          user_id,
          username,
          email
        )
      `)
      .eq("group_id", group_id)
      .eq("expense_type", "group")
      .order("created_at", { ascending: false });

    if (expenseError) {
      return errorResponse(res, 400, expenseError.message);
    }

    // Get participants for each expense
    const expensesWithParticipants = await Promise.all(
      expenses.map(async (expense) => {
        const { data: participants, error: partError } = await supabase
          .from("expense_participants")
          .select(`
            participant_id,
            user_id,
            share,
            users (
              user_id,
              username,
              email
            )
          `)
          .eq("expense_id", expense.expense_id);

        return {
          ...expense,
          participants: participants || [],
        };
      })
    );

    res.status(200).json({
      message: "Group expenses retrieved successfully",
      group: group,
      expenses: expensesWithParticipants,
      count: expensesWithParticipants.length,
    });
  } catch (error) {
    console.error("Get group expenses error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get expenses between the current user and a specific friend
exports.getFriendExpenses = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const { friend_id } = req.params;
    const user_id = req.user.user_id;
    
    console.log('getFriendExpenses called with:', { friend_id, user_id });
    console.log('Type of friend_id:', typeof friend_id, 'Type of user_id:', typeof user_id);

    // Check if friendship exists (either direction)
    const { data: friendship1, error: friendError1 } = await supabase
      .from("user_contacts")
      .select("contact_id")
      .eq("user_id", user_id)
      .eq("friend_user_id", friend_id)
      .single();

    const { data: friendship2, error: friendError2 } = await supabase
      .from("user_contacts")
      .select("contact_id")
      .eq("user_id", friend_id)
      .eq("friend_user_id", user_id)
      .single();

    const friendship = friendship1 || friendship2;
    const friendError = friendError1 && friendError2;

    if (friendError || !friendship) {
      console.log('Friendship check failed:', { friendError1, friendError2, friendship1, friendship2 });
      return errorResponse(res, 404, "Friendship not found");
    }
    
    console.log('Friendship found:', friendship);

    // Get expenses between these two users (personal expenses only)
    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select(`
        expense_id,
        paid_by,
        amount,
        description,
        expense_type,
        created_at,
        users!expenses_paid_by_fkey (
          user_id,
          username,
          email
        )
      `)
      .eq("expense_type", "personal")
      .order("created_at", { ascending: false });

    console.log('Personal expenses found:', expenses?.length || 0);
    if (expenses) {
      expenses.forEach(exp => {
        console.log('Expense:', exp.expense_id, exp.description, 'paid by:', exp.paid_by);
      });
    }

    if (expenseError) {
      return errorResponse(res, 400, expenseError.message);
    }

    // Filter expenses that involve both users
    const friendExpenses = [];
    
    console.log('Total personal expenses found:', expenses.length);
    
    for (const expense of expenses) {
      const { data: participants, error: partError } = await supabase
        .from("expense_participants")
        .select(`
          participant_id,
          user_id,
          share,
          users (
            user_id,
            username,
            email
          )
        `)
        .eq("expense_id", expense.expense_id);

      if (partError) continue;

      const participantIds = participants.map(p => p.user_id);
      
      // Check if both users are participants in this expense
      console.log('Checking expense:', expense.expense_id, 'participants:', participantIds);
      console.log('Looking for user_id:', user_id, 'friend_id:', friend_id);
      console.log('user_id in participants:', participantIds.includes(user_id));
      console.log('friend_id in participants:', participantIds.includes(friend_id));
      if (participantIds.includes(user_id) && participantIds.includes(friend_id)) {
        console.log('Found matching expense:', expense.expense_id);
        friendExpenses.push({
          ...expense,
          participants: participants,
        });
      }
    }

    console.log('Final result - friendExpenses count:', friendExpenses.length);
    console.log('Final result - friendExpenses:', friendExpenses);
    
    res.status(200).json({
      message: "Friend expenses retrieved successfully",
      expenses: friendExpenses,
      count: friendExpenses.length,
    });
  } catch (error) {
    console.error("Get friend expenses error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Get expense details by ID
exports.getExpenseDetails = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const { expense_id } = req.params;
    const user_id = req.user.user_id;

    // Get expense details
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select(`
        expense_id,
        group_id,
        paid_by,
        amount,
        description,
        expense_type,
        created_at,
        groups (
          group_id,
          group_name,
          description
        ),
        users!expenses_paid_by_fkey (
          user_id,
          username,
          email
        )
      `)
      .eq("expense_id", expense_id)
      .single();

    if (expenseError || !expense) {
      return errorResponse(res, 404, "Expense not found");
    }

    // Check if user has access to this expense (either paid by them or they're a participant)
    let hasAccess = expense.paid_by === user_id;

    if (!hasAccess) {
      // Check if user is a participant
      const { data: participation, error: participationError } = await supabase
        .from("expense_participants")
        .select("participant_id")
        .eq("expense_id", expense_id)
        .eq("user_id", user_id)
        .single();

      hasAccess = !participationError && participation;
    }

    if (!hasAccess) {
      return errorResponse(res, 403, "You don't have access to this expense");
    }

    // Get participants
    const { data: participants, error: participantsError } = await supabase
      .from("expense_participants")
      .select(`
        participant_id,
        user_id,
        share,
        users (
          user_id,
          username,
          email
        )
      `)
      .eq("expense_id", expense_id);

    if (participantsError) {
      return errorResponse(res, 400, participantsError.message);
    }

    res.status(200).json({
      message: "Expense details retrieved successfully",
      expense: {
        ...expense,
        participants: participants || [],
      },
    });
  } catch (error) {
    console.error("Get expense details error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// SUPER SIMPLE balance calculation
exports.calculateUserBalances = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const user_id = req.user.user_id;
    const { balance_type, group_id } = req.query;

    let allBalances = [];

    // Step 1: Find all expenses where I participated
    const { data: myParticipations, error: participationError } = await supabase
      .from("expense_participants")
      .select(`
        share,
        expenses (
          expense_id,
          paid_by,
          amount,
          description,
          expense_type,
          group_id,
          groups (group_name),
          users (username)
        )
      `)
      .eq("user_id", user_id);

    if (participationError) {
      return errorResponse(res, 400, participationError.message);
    }

    // Step 2: For each expense, calculate what I owe
    myParticipations?.forEach(participation => {
      const expense = participation.expenses;
      const paidBy = expense.paid_by;
      const myShare = participation.share;

      // If someone else paid, I owe them money
      if (paidBy !== user_id) {
        allBalances.push({
          expense_id: expense.expense_id,
          description: expense.description,
          other_user: expense.users.username,
          other_user_id: paidBy,
          amount: myShare,
          type: "I_OWE", // I owe this person
          expense_type: expense.expense_type,
          group_id: expense.group_id,
          group_name: expense.groups?.group_name || null
        });
      }
    });

    // Step 3: Find all expenses I paid for others
    const { data: myExpenses, error: expenseError } = await supabase
      .from("expenses")
      .select(`
        expense_id,
        description,
        amount,
        expense_type,
        group_id,
        groups (group_name),
        expense_participants (
          user_id,
          share,
          users (username)
        )
      `)
      .eq("paid_by", user_id);

    if (expenseError) {
      return errorResponse(res, 400, expenseError.message);
    }

    // Step 4: For each expense I paid, see who owes me
    myExpenses?.forEach(expense => {
      expense.expense_participants.forEach(participant => {
        // Skip myself
        if (participant.user_id !== user_id) {
          allBalances.push({
            expense_id: expense.expense_id,
            description: expense.description,
            other_user: participant.users.username,
            other_user_id: participant.user_id,
            amount: participant.share,
            type: "THEY_OWE", // They owe me
            expense_type: expense.expense_type,
            group_id: expense.group_id,
            group_name: expense.groups?.group_name || null
          });
        }
      });
    });

    // Step 5: Filter by balance_type if specified
    let filteredBalances = allBalances;
    if (balance_type === "personal") {
      filteredBalances = allBalances.filter(b => b.expense_type === "personal");
    } else if (balance_type === "group") {
      filteredBalances = allBalances.filter(b => b.expense_type === "group");
      
      // If specific group_id is provided, filter further
      if (group_id) {
        filteredBalances = filteredBalances.filter(b => b.group_id === group_id);
      }
    }

    // Step 6: Group by person and calculate net balance
    const netBalances = {};
    
    filteredBalances.forEach(balance => {
      const otherUserId = balance.other_user_id;
      
      if (!netBalances[otherUserId]) {
        netBalances[otherUserId] = {
          user_id: otherUserId,
          username: balance.other_user,
          total_they_owe_me: 0,
          total_i_owe_them: 0,
          net_balance: 0,
          expense_type: balance.expense_type,
          group_id: balance.group_id,
          group_name: balance.group_name
        };
      }

      if (balance.type === "I_OWE") {
        netBalances[otherUserId].total_i_owe_them += balance.amount;
      } else {
        netBalances[otherUserId].total_they_owe_me += balance.amount;
      }
    });

    // Calculate final net balances
    Object.values(netBalances).forEach(balance => {
      balance.net_balance = balance.total_they_owe_me - balance.total_i_owe_them;
    });

    // Only return balances that aren't zero
    const finalBalances = Object.values(netBalances).filter(
      balance => Math.abs(balance.net_balance) > 0.01
    );

    // Step 7: Format response based on balance_type
    let responseData;
    
    if (balance_type === "personal") {
      responseData = {
        type: "personal",
        balances: finalBalances.filter(b => b.expense_type === "personal")
      };
    } else if (balance_type === "group") {
      // Group balances by group
      const groupedBalances = {};
      finalBalances.filter(b => b.expense_type === "group").forEach(balance => {
        const groupId = balance.group_id;
        if (!groupedBalances[groupId]) {
          groupedBalances[groupId] = {
            group_id: groupId,
            group_name: balance.group_name,
            balances: []
          };
        }
        groupedBalances[groupId].balances.push({
          user_id: balance.user_id,
          username: balance.username,
          net_balance: balance.net_balance,
          total_they_owe_me: balance.total_they_owe_me,
          total_i_owe_them: balance.total_i_owe_them
        });
      });
      
      responseData = {
        type: "group",
        balances: Object.values(groupedBalances)
      };
    } else {
      // Return both types
      const personalBalances = finalBalances.filter(b => b.expense_type === "personal");
      const groupBalances = finalBalances.filter(b => b.expense_type === "group");
      
      // Group the group balances
      const groupedBalances = {};
      groupBalances.forEach(balance => {
        const groupId = balance.group_id;
        if (!groupedBalances[groupId]) {
          groupedBalances[groupId] = {
            group_id: groupId,
            group_name: balance.group_name,
            balances: []
          };
        }
        groupedBalances[groupId].balances.push({
          user_id: balance.user_id,
          username: balance.username,
          net_balance: balance.net_balance,
          total_they_owe_me: balance.total_they_owe_me,
          total_i_owe_them: balance.total_i_owe_them
        });
      });

      responseData = [
        {
          type: "personal",
          balances: personalBalances
        },
        {
          type: "group", 
          balances: Object.values(groupedBalances)
        }
      ];
    }

    res.status(200).json({
      message: "User balances calculated successfully",
      user_id: user_id,
      balances: Array.isArray(responseData) ? responseData : [responseData],
      total_balances: finalBalances.length
    });

  } catch (error) {
    console.error("Calculate balances error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Update an expense
exports.updateExpense = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const { expense_id } = req.params;
    const { amount, description } = req.body;
    const user_id = req.user.user_id;

    // First, check if the expense exists and user owns it
    const { data: existingExpense, error: fetchError } = await supabase
      .from("expenses")
      .select("expense_id, paid_by")
      .eq("expense_id", expense_id)
      .single();

    if (fetchError || !existingExpense) {
      return errorResponse(res, 404, "Expense not found");
    }

    if (existingExpense.paid_by !== user_id) {
      return errorResponse(res, 403, "You can only update expenses you created");
    }

    const updateData = {};
    if (amount && amount > 0) updateData.amount = amount;
    if (description !== undefined) updateData.description = description?.trim() || null;
    
    if (Object.keys(updateData).length === 0) {
      return errorResponse(res, 400, "No valid data provided for update");
    }
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("expenses")
      .update(updateData)
      .eq("expense_id", expense_id)
      .select("expense_id, group_id, paid_by, amount, description, expense_type, created_at, updated_at");

    if (error || !data || data.length === 0) {
      return errorResponse(res, 404, "Expense not found or update failed");
    }

    res.status(200).json({ 
      message: "Expense updated successfully", 
      expense: data[0] 
    });
  } catch (error) {
    console.error("Update expense error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user?.user_id) {
      return errorResponse(res, 401, "Authentication required");
    }

    const { expense_id } = req.params;
    const user_id = req.user.user_id;

    // First, check if the expense exists and user owns it
    const { data: existingExpense, error: fetchError } = await supabase
      .from("expenses")
      .select("expense_id, paid_by, description")
      .eq("expense_id", expense_id)
      .single();

    if (fetchError || !existingExpense) {
      return errorResponse(res, 404, "Expense not found");
    }

    if (existingExpense.paid_by !== user_id) {
      return errorResponse(res, 403, "You can only delete expenses you created");
    }

    // Delete expense_participants related to this expense first
    await supabase.from("expense_participants").delete().eq("expense_id", expense_id);
    
    // Delete the expense itself
    const { error } = await supabase.from("expenses").delete().eq("expense_id", expense_id);
    
    if (error) {
      return errorResponse(res, 404, "Expense not found or delete failed");
    }
    
    res.status(200).json({ 
      message: "Expense deleted successfully",
      deleted_expense: {
        expense_id: existingExpense.expense_id,
        description: existingExpense.description
      }
    });
  } catch (error) {
    console.error("Delete expense error:", error);
    return errorResponse(res, 500, "Internal server error");
  }
};
