const supabase = require("../utils/supabaseClient");

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

    const paid_by = req.user?.user_id || "temp-user-id"; // Will be replaced with actual auth

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Amount must be greater than 0",
      });
    }

    if (!participants || participants.length === 0) {
      return res.status(400).json({
        error: "At least one participant is required",
      });
    }

    // Validate expense type
    const validTypes = ["group", "personal"];
    if (!expense_type || !validTypes.includes(expense_type)) {
      return res.status(400).json({
        error: "expense_type must be 'group' or 'personal'",
      });
    }

    // For group expenses, validate group exists and user is member
    if (expense_type === "group") {
      if (!group_id) {
        return res.status(400).json({
          error: "group_id is required for group expenses",
        });
      }

      // Check if group exists
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("group_id")
        .eq("group_id", group_id)
        .single();

      if (groupError || !group) {
        return res.status(404).json({
          error: "Group not found",
        });
      }

      // Check if user is group member
      const { data: membership, error: memberError } = await supabase
        .from("group_members")
        .select("group_member_id")
        .eq("group_id", group_id)
        .eq("user_id", paid_by)
        .single();

      if (memberError || !membership) {
        return res.status(403).json({
          error: "You must be a group member to add group expenses",
        });
      }
    }

    // For personal expenses, group_id should be null
    const finalGroupId = expense_type === "personal" ? null : group_id;

    // Validate participants total shares
    const totalShares = participants.reduce(
      (sum, p) => sum + (p.share || 0),
      0
    );
    if (Math.abs(totalShares - amount) > 0.01) {
      return res.status(400).json({
        error: "Total participant shares must equal the expense amount",
      });
    }

    // Create expense
    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .insert([
        {
          group_id: finalGroupId,
          paid_by: paid_by,
          amount: amount,
          description: description || null,
          expense_type: expense_type,
        },
      ])
      .select(
        "expense_id, group_id, paid_by, amount, description, expense_type, created_at"
      );

    if (expenseError) {
      return res.status(400).json({ error: expenseError.message });
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
      await supabase
        .from("expenses")
        .delete()
        .eq("expense_id", expense.expense_id);

      return res.status(400).json({ error: participantsError.message });
    }

    res.status(201).json({
      message: "Expense created successfully",
      expense: expense,
      participants: participantsData,
    });
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get expenses for a user (both personal and group)
exports.getUserExpenses = async (req, res) => {
  try {
    const user_id = req.user?.user_id || req.params.user_id || "temp-user-id";
    const { expense_type, group_id } = req.query;

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
    const { data: allExpenses, error: expenseError } = await query.order(
      "created_at",
      { ascending: false }
    );

    if (expenseError) {
      return res.status(400).json({ error: expenseError.message });
    }

    // Filter expenses where user is involved (paid or participating)
    const userExpenseIds = [];

    // Get expense IDs where user is a participant
    const { data: participations, error: participationError } = await supabase
      .from("expense_participants")
      .select("expense_id")
      .eq("user_id", user_id);

    if (!participationError && participations) {
      participations.forEach((p) => userExpenseIds.push(p.expense_id));
    }

    // Filter expenses
    const userExpenses = allExpenses.filter(
      (expense) =>
        expense.paid_by === user_id ||
        userExpenseIds.includes(expense.expense_id)
    );

    // Get participants for each expense
    const expensesWithParticipants = await Promise.all(
      userExpenses.map(async (expense) => {
        const { data: participants, error: partError } = await supabase
          .from("expense_participants")
          .select(
            `
            participant_id,
            user_id,
            share,
            users (
              user_id,
              username,
              email
            )
          `
          )
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
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get expenses for a specific group
exports.getGroupExpenses = async (req, res) => {
  try {
    const { group_id } = req.params;

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("group_id, group_name, description")
      .eq("group_id", group_id)
      .single();

    if (groupError || !group) {
      return res.status(404).json({
        error: "Group not found",
      });
    }

    // Get group expenses
    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select(
        `
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
      `
      )
      .eq("group_id", group_id)
      .eq("expense_type", "group")
      .order("created_at", { ascending: false });

    if (expenseError) {
      return res.status(400).json({ error: expenseError.message });
    }

    // Get participants for each expense
    const expensesWithParticipants = await Promise.all(
      expenses.map(async (expense) => {
        const { data: participants, error: partError } = await supabase
          .from("expense_participants")
          .select(
            `
            participant_id,
            user_id,
            share,
            users (
              user_id,
              username,
              email
            )
          `
          )
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
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get expense details by ID
exports.getExpenseDetails = async (req, res) => {
  try {
    const { expense_id } = req.params;

    // Get expense details
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select(
        `
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
      `
      )
      .eq("expense_id", expense_id)
      .single();

    if (expenseError || !expense) {
      return res.status(404).json({
        error: "Expense not found",
      });
    }

    // Get participants
    const { data: participants, error: participantsError } = await supabase
      .from("expense_participants")
      .select(
        `
        participant_id,
        user_id,
        share,
        users (
          user_id,
          username,
          email
        )
      `
      )
      .eq("expense_id", expense_id);

    if (participantsError) {
      return res.status(400).json({ error: participantsError.message });
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
    res.status(500).json({ error: "Internal server error" });
  }
};

// Calculate balances for a user
exports.calculateUserBalances = async (req, res) => {
  try {
    const user_id = req.user?.user_id || req.params.user_id || "temp-user-id";
    const { balance_type, group_id } = req.query;

    let balances = [];

    if (!balance_type || balance_type === "personal") {
      // Calculate personal balances
      const { data: personalExpenses, error: personalError } = await supabase
        .from("expenses")
        .select(
          `
          expense_id,
          paid_by,
          amount,
          expense_participants!inner (
            user_id,
            share
          )
        `
        )
        .eq("expense_type", "personal")
        .is("group_id", null);

      if (!personalError && personalExpenses) {
        const personalBalances = calculateBalancesFromExpenses(
          personalExpenses,
          user_id
        );
        balances.push({
          type: "personal",
          balances: personalBalances,
        });
      }
    }

    if (!balance_type || balance_type === "group") {
      // Calculate group balances
      let groupQuery = supabase
        .from("expenses")
        .select(
          `
          expense_id,
          paid_by,
          amount,
          group_id,
          groups (
            group_id,
            group_name
          ),
          expense_participants!inner (
            user_id,
            share
          )
        `
        )
        .eq("expense_type", "group");

      if (group_id) {
        groupQuery = groupQuery.eq("group_id", group_id);
      }

      const { data: groupExpenses, error: groupError } = await groupQuery;

      if (!groupError && groupExpenses) {
        const groupBalances = calculateGroupBalancesFromExpenses(
          groupExpenses,
          user_id
        );
        balances.push({
          type: "group",
          balances: groupBalances,
        });
      }
    }

    res.status(200).json({
      message: "User balances calculated successfully",
      user_id: user_id,
      balances: balances,
    });
  } catch (error) {
    console.error("Calculate balances error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update an expense
exports.updateExpense = async (req, res) => {
  try {
    const { expense_id } = req.params;
    const { amount, description } = req.body;
    const updateData = {};
    if (amount !== undefined) updateData.amount = amount;
    if (description !== undefined) updateData.description = description;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No data provided for update" });
    }
    updateData.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("expenses")
      .update(updateData)
      .eq("expense_id", expense_id)
      .select(
        "expense_id, group_id, paid_by, amount, description, expense_type, created_at, updated_at"
      );
    if (error || !data || data.length === 0) {
      return res
        .status(404)
        .json({ error: "Expense not found or update failed" });
    }
    res
      .status(200)
      .json({ message: "Expense updated successfully", expense: data[0] });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
  try {
    const { expense_id } = req.params;
    // Optionally, delete expense_participants related to this expense as well
    await supabase
      .from("expense_participants")
      .delete()
      .eq("expense_id", expense_id);
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("expense_id", expense_id);
    if (error) {
      return res
        .status(404)
        .json({ error: "Expense not found or delete failed" });
    }
    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to calculate balances from expenses
function calculateBalancesFromExpenses(expenses, userId) {
  const balances = {};

  expenses.forEach((expense) => {
    const paidBy = expense.paid_by;
    const amount = expense.amount;

    expense.expense_participants.forEach((participant) => {
      const participantId = participant.user_id;
      const share = participant.share;

      if (participantId === userId && paidBy !== userId) {
        // User owes money to the person who paid
        if (!balances[paidBy]) {
          balances[paidBy] = { owes: 0, owed: 0 };
        }
        balances[paidBy].owes += share;
      } else if (paidBy === userId && participantId !== userId) {
        // User is owed money by the participant
        if (!balances[participantId]) {
          balances[participantId] = { owes: 0, owed: 0 };
        }
        balances[participantId].owed += share;
      }
    });
  });

  // Calculate net balances
  const netBalances = [];
  Object.keys(balances).forEach((otherUserId) => {
    const balance = balances[otherUserId];
    const netAmount = balance.owed - balance.owes;

    if (Math.abs(netAmount) > 0.01) {
      // Only include non-zero balances
      netBalances.push({
        other_user_id: otherUserId,
        net_balance: netAmount, // Positive = they owe you, Negative = you owe them
        you_owe: balance.owes,
        they_owe: balance.owed,
      });
    }
  });

  return netBalances;
}

// Helper function to calculate group balances
function calculateGroupBalancesFromExpenses(expenses, userId) {
  const groupBalances = {};

  expenses.forEach((expense) => {
    const groupId = expense.group_id;
    const groupName = expense.groups?.group_name || "Unknown Group";

    if (!groupBalances[groupId]) {
      groupBalances[groupId] = {
        group_id: groupId,
        group_name: groupName,
        balances: {},
      };
    }

    const paidBy = expense.paid_by;
    const amount = expense.amount;

    expense.expense_participants.forEach((participant) => {
      const participantId = participant.user_id;
      const share = participant.share;

      if (participantId === userId && paidBy !== userId) {
        // User owes money to the person who paid
        if (!groupBalances[groupId].balances[paidBy]) {
          groupBalances[groupId].balances[paidBy] = { owes: 0, owed: 0 };
        }
        groupBalances[groupId].balances[paidBy].owes += share;
      } else if (paidBy === userId && participantId !== userId) {
        // User is owed money by the participant
        if (!groupBalances[groupId].balances[participantId]) {
          groupBalances[groupId].balances[participantId] = { owes: 0, owed: 0 };
        }
        groupBalances[groupId].balances[participantId].owed += share;
      }
    });
  });

  // Format group balances
  const formattedGroupBalances = [];
  Object.keys(groupBalances).forEach((groupId) => {
    const group = groupBalances[groupId];
    const netBalances = [];

    Object.keys(group.balances).forEach((otherUserId) => {
      const balance = group.balances[otherUserId];
      const netAmount = balance.owed - balance.owes;

      if (Math.abs(netAmount) > 0.01) {
        netBalances.push({
          other_user_id: otherUserId,
          net_balance: netAmount,
          you_owe: balance.owes,
          they_owe: balance.owed,
        });
      }
    });

    if (netBalances.length > 0) {
      formattedGroupBalances.push({
        group_id: groupId,
        group_name: group.group_name,
        balances: netBalances,
      });
    }
  });

  return formattedGroupBalances;
}
