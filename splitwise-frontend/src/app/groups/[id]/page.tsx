'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, Plus, Trash2, DollarSign } from 'lucide-react'

interface GroupDetails {
  group_id: string
  group_name: string
  description: string
  member_count: number
}

interface Member {
  group_member_id: number
  group_id: string
  user_id: string
  joined_at: string
  username: string
  email: string
  is_creator: boolean
}

interface User {
  user_id: number
  username: string
  email: string
}

interface Expense {
  expense_id: number
  paid_by: number
  amount: number
  description: string
  created_at: string
  users: User
  participants: {
    participant_id: number
    user_id: number
    share: number
    users: User
  }[]
}

interface Friend {
  id: number
  name: string
  email: string
}

export default function GroupPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null)
  const [showFriendDropdown, setShowFriendDropdown] = useState(false)
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      // Get current user ID
      const userDataString = localStorage.getItem('user')
      if (userDataString) {
        const userData = JSON.parse(userDataString)
        const userId = userData.user_id || userData.id
        console.log('Setting currentUserId to:', userId, 'Type:', typeof userId)
        setCurrentUserId(userId)
      }
      
      await loadGroupDetails()
      await loadGroupExpenses()
    }
    loadData()
  }, [groupId])

  useEffect(() => {
    if (members.length > 0) {
      console.log('Members loaded:', members)
      console.log('Current user ID:', currentUserId)
      loadFriends()
    }
  }, [members])

  const loadGroupDetails = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No authentication token found')
        return
      }
      
      console.log('Raw groupId from params:', groupId) // Debug log
      console.log('Type of groupId:', typeof groupId) // Debug log
      console.log('Parsed groupId:', parseInt(groupId)) // Debug log
      console.log('Is groupId a valid number?', !isNaN(parseInt(groupId))) // Debug log
      
      const url = `http://localhost:5000/api/groups/${groupId}`
      console.log('Fetching URL:', url) // Debug log
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', response.status) // Debug log
      console.log('Response ok:', response.ok) // Debug log

      if (response.ok) {
        const result = await response.json()
        console.log('Group data received:', result) // Debug log
        
        if (result.group) {
          const groupData: GroupDetails = {
            group_id: result.group.group_id,
            group_name: result.group.group_name,
            description: result.group.description || '',
            member_count: result.member_count || 0
          }
          setGroup(groupData)
          setMembers(result.members || [])
        } else {
          console.error('No group data in response:', result)
          setError('Invalid group data received')
        }
      } else {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        setError(`Failed to load group details: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Error loading group:', error)
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const loadGroupExpenses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/expenses/group/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setExpenses(result.expenses || [])
      } else {
        console.error('Failed to load expenses')
      }
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  const loadFriends = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('http://localhost:5000/api/contacts/friends', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        const friendsData = result.friends.map((friend: any) => ({
          id: friend.user_id,
          name: friend.username || friend.email?.split('@')[0] || 'Unknown',
          email: friend.email
        }))
        
        // Filter out friends who are already members of this group
        const memberUserIds = members.map(member => parseInt(member.user_id))
        const availableFriends = friendsData.filter((friend: Friend) => 
          !memberUserIds.includes(friend.id)
        )
        setFriends(availableFriends)
      } else {
        console.error('Failed to load friends')
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  const handleAddMember = async () => {
    if (!selectedFriendId) {
      alert('Please select a friend to add')
      return
    }

    try {
      const token = localStorage.getItem('token')
      
      const addResponse = await fetch(`http://localhost:5000/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: selectedFriendId })
      })

      if (addResponse.ok) {
        // Reload group details to get updated member list
        await loadGroupDetails()
        await loadFriends() // Refresh available friends list
        setSelectedFriendId(null)
        setShowAddMemberModal(false)
        alert('Member added successfully!')
      } else {
        const error = await addResponse.json()
        let errorMessage = 'Failed to add member'
        
        if (addResponse.status === 403) {
          errorMessage = 'You must be a group member to add users to this group'
        } else if (addResponse.status === 409) {
          errorMessage = 'This user is already a member of the group'
        } else if (error.error || error.message) {
          errorMessage = error.error || error.message
        }
        
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member. Please check your connection and try again.')
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    try {
      const token = localStorage.getItem('token')
      
      const removeResponse = await fetch(`http://localhost:5000/api/groups/${groupId}/members/${memberToRemove.user_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (removeResponse.ok) {
        // Reload group details to get updated member list
        await loadGroupDetails()
        await loadFriends() // Refresh available friends list
        setMemberToRemove(null)
        setShowRemoveMemberModal(false)
        alert('Member removed successfully!')
      } else {
        const error = await removeResponse.json()
        alert(error.error || error.message || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member. Please try again.')
    }
  }

  const isCurrentUserCreator = () => {
    const isCreator = members.some(member => 
      member.user_id === String(currentUserId) && member.is_creator
    )
    // Debug logs to understand the issue
    console.log('isCurrentUserCreator Debug:', {
      currentUserId,
      currentUserIdAsString: String(currentUserId),
      members: members.map(m => ({ 
        user_id: m.user_id, 
        is_creator: m.is_creator,
        matches_current: m.user_id === String(currentUserId)
      })),
      isCreator
    })
    return isCreator
  }

  const isCurrentUserMember = () => {
    return members.some(member => 
      member.user_id === String(currentUserId)
    )
  }

  const handleLeaveGroup = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const leaveResponse = await fetch(`http://localhost:5000/api/groups/${groupId}/members/${currentUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (leaveResponse.ok) {
        alert('You have left the group successfully!')
        // Redirect back to dashboard
        router.push('/dashboard')
      } else {
        const error = await leaveResponse.json()
        alert(error.error || error.message || 'Failed to leave group')
      }
    } catch (error) {
      console.error('Error leaving group:', error)
      alert('Failed to leave group. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error || 'Group not found'}</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-emerald-400 hover:text-emerald-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-white mr-4"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">{group.group_name}</h1>
                  <p className="text-sm text-gray-400">{group.member_count} members</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {(currentUserId && members.length > 0) && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Add Member
                </button>
              )}
              {isCurrentUserMember() && !isCurrentUserCreator() && (
                <button
                  onClick={() => {
                    // Handle leave group functionality
                    if (confirm('Are you sure you want to leave this group?')) {
                      handleLeaveGroup()
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Leave Group
                </button>
              )}
              <button
                onClick={() => {/* TODO: Add expense functionality */}}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Group Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Group Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Group Name</label>
                  <p className="text-white">{group.group_name}</p>
                </div>
                {group.description && (
                  <div>
                    <label className="text-sm text-gray-400">Description</label>
                    <p className="text-white">{group.description}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-400">Members ({members.length})</label>
                  <div className="mt-2 space-y-2">
                    {members.map((member) => (
                      <div 
                        key={member.user_id} 
                        className="flex items-center justify-between group hover:bg-gray-700 p-2 rounded-md transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {member.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{member.username}</p>
                            <p className="text-gray-400 text-xs">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {member.is_creator && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                              Creator
                            </span>
                          )}
                          {isCurrentUserCreator() && !member.is_creator && (
                            <button
                              onClick={() => {
                                setMemberToRemove(member)
                                setShowRemoveMemberModal(true)
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">Recent Expenses</h2>
              </div>
              
              {expenses.length === 0 ? (
                <div className="p-8 text-center">
                  <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No expenses yet</p>
                  <p className="text-sm text-gray-500 mt-2">Add your first expense to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {expenses.map((expense) => (
                    <div key={expense.expense_id} className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium">{expense.description}</h3>
                        <span className="text-lg font-semibold text-emerald-400">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>Paid by {expense.users.username}</span>
                        <span>{formatDate(expense.created_at)}</span>
                      </div>
                      {expense.participants.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-2">Split between:</p>
                          <div className="flex flex-wrap gap-2">
                            {expense.participants.map((participant) => (
                              <span
                                key={participant.participant_id}
                                className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs"
                              >
                                {participant.users.username} ({formatCurrency(participant.share)})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Add Member to Group</h3>
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setSelectedFriendId(null)
                    setShowFriendDropdown(false)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              {friends.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-4">No friends available to add to this group!</p>
                  <p className="text-sm text-gray-500">All your friends are already members of this group, or you haven't added any friends yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select a friend to add:
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowFriendDropdown(!showFriendDropdown)}
                        className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-gray-100 text-left focus:outline-none focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                      >
                        <span>
                          {selectedFriendId 
                            ? friends.find(f => f.id === selectedFriendId)?.name || 'Select a friend...'
                            : 'Select a friend...'
                          }
                        </span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {showFriendDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {friends.map((friend) => (
                            <button
                              key={friend.id}
                              type="button"
                              onClick={() => {
                                setSelectedFriendId(friend.id)
                                setShowFriendDropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left text-gray-100 hover:bg-gray-600 focus:bg-gray-600 focus:outline-none"
                            >
                              {friend.name} ({friend.email})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setSelectedFriendId(null)
                    setShowFriendDropdown(false)
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                {friends.length > 0 && (
                  <button
                    onClick={handleAddMember}
                    disabled={!selectedFriendId}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md"
                  >
                    Add Member
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Modal */}
      {showRemoveMemberModal && memberToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Remove Member</h3>
                <button
                  onClick={() => {
                    setShowRemoveMemberModal(false)
                    setMemberToRemove(null)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Are you sure you want to remove <strong>{memberToRemove.username}</strong> from this group?
                </p>
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm">
                    ⚠️ This action cannot be undone. The member will lose access to this group and all its expenses.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRemoveMemberModal(false)
                    setMemberToRemove(null)
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveMember}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
                >
                  Remove Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
