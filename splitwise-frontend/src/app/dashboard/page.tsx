'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  name: string
  email: string
}

interface Friend {
  id: number
  name: string
  balance: number
}

interface Group {
  id: string
  name: string
  memberCount: number
  balance: number
  createdBy: number
  isCreator: boolean
}

interface Balances {
  total: number
  youOwe: number
  youAreOwed: number
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [balances, setBalances] = useState<Balances>({
    total: 0,
    youOwe: 0,
    youAreOwed: 0
  })
  const [friends, setFriends] = useState<Friend[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [newFriendEmail, setNewFriendEmail] = useState('')
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<number | string | null>(null)
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null)
  const [showFriendDropdown, setShowFriendDropdown] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{type: 'friend' | 'group', id: number | string, name: string} | null>(null)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
      return
    }

    // Load user data (you'll implement this with your API)
    loadUserData()
  }, [router])

  const loadUserData = async () => {
    try {
      // Get user data from localStorage (stored during login/registration)
      const userDataString = localStorage.getItem('user')
      const token = localStorage.getItem('token')
      
      if (userDataString && token) {
        const userData = JSON.parse(userDataString)
        setUser({ 
          name: userData.username || userData.name || 'User', 
          email: userData.email 
        })
        
        // TODO: Load real balance data from API
        // For now, using placeholder data until backend API is ready
        setBalances({
          total: 0,
          youOwe: 0,
          youAreOwed: 0
        })
        
        // Load real friends from API
        await loadFriends(token)
        
        // Load real groups from API
        await loadGroups(token, userData.user_id || userData.id)
      } else {
        // If no user data found, redirect to login
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      router.push('/auth/login')
    }
  }

  const loadFriends = async (token: string) => {
    try {
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
          balance: 0 // TODO: Calculate actual balance from expenses
        }))
        setFriends(friendsData)
      } else {
        console.error('Failed to load friends:', await response.text())
        setFriends([])
      }
    } catch (error) {
      console.error('Error loading friends:', error)
      setFriends([])
    }
  }

  const loadGroups = async (token: string, userId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/groups/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Raw groups data from API:', result.groups) // Debug log
        const groupsData = result.groups.map((group: any) => ({
          id: group.group_id,
          name: group.group_name,
          memberCount: group.member_count || 1,
          balance: 0, // TODO: Calculate actual balance from expenses
          createdBy: group.created_by, // Include creator information
          isCreator: group.created_by === userId // Check if current user is creator
        }))
        console.log('Mapped groups data:', groupsData) // Debug log
        setGroups(groupsData)
      } else {
        console.error('Failed to load groups:', await response.text())
        setGroups([])
      }
    } catch (error) {
      console.error('Error loading groups:', error)
      setGroups([])
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const handleAddFriend = async () => {
    if (!newFriendEmail.trim()) {
      alert('Please enter a valid email address')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/contacts/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friend_email: newFriendEmail.trim() })
      })

      if (response.ok) {
        const result = await response.json()
        // Refresh the friends list to get proper usernames from backend
        const token = localStorage.getItem('token')
        if (token) {
          await loadFriends(token)
        }
        setNewFriendEmail('')
        setShowAddFriendModal(false)
        alert('Friend added successfully!')
      } else {
        const error = await response.json()
        alert(error.error || error.message || 'Failed to add friend')
      }
    } catch (error) {
      console.error('Error adding friend:', error)
      alert('Failed to add friend. Please try again.')
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Please enter a group name')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ group_name: newGroupName.trim() })
      })

      if (response.ok) {
        const result = await response.json()
        // Refresh the groups list to get proper data from backend
        const token = localStorage.getItem('token')
        const userDataString = localStorage.getItem('user')
        if (token && userDataString) {
          const userData = JSON.parse(userDataString)
          await loadGroups(token, userData.user_id || userData.id)
        }
        setNewGroupName('')
        setShowCreateGroupModal(false)
        alert('Group created successfully!')
      } else {
        const error = await response.json()
        alert(error.error || error.message || 'Failed to create group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Failed to create group. Please try again.')
    }
  }

  const handleAddMember = async () => {
    if (!selectedFriendId) {
      alert('Please select a friend to add')
      return
    }

    if (!selectedGroupId) {
      alert('No group selected')
      return
    }

    try {
      const token = localStorage.getItem('token')
      
      // Add the selected friend to the group
      const addResponse = await fetch(`http://localhost:5000/api/groups/${selectedGroupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: selectedFriendId })
      })

      if (addResponse.ok) {
        // Update the group member count
        setGroups(prev => prev.map(group => 
          group.id === selectedGroupId 
            ? { ...group, memberCount: group.memberCount + 1 }
            : group
        ))
        setSelectedFriendId(null)
        setShowAddMemberModal(false)
        setSelectedGroupId(null)
        alert('Member added successfully!')
      } else {
        const error = await addResponse.json()
        alert(error.error || error.message || 'Failed to add member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member. Please try again.')
    }
  }

  const handleDeleteFriend = async () => {
    if (!deleteTarget || deleteTarget.type !== 'friend') return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/contacts/remove/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setFriends(prev => prev.filter(friend => friend.id !== deleteTarget.id))
        setShowDeleteModal(false)
        setDeleteTarget(null)
        alert('Friend removed successfully!')
      } else {
        const error = await response.json()
        alert(error.error || error.message || 'Failed to remove friend')
      }
    } catch (error) {
      console.error('Error removing friend:', error)
      alert('Failed to remove friend. Please try again.')
    }
  }

  const handleDeleteGroup = async () => {
    if (!deleteTarget || deleteTarget.type !== 'group') return

    console.log('Attempting to delete group:', deleteTarget) // Debug log

    try {
      const token = localStorage.getItem('token')
      const url = `http://localhost:5000/api/groups/${deleteTarget.id}`
      console.log('DELETE request URL:', url) // Debug log
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Delete response status:', response.status) // Debug log
      console.log('Delete response ok:', response.ok) // Debug log

      if (response.ok) {
        const result = await response.json()
        console.log('Delete success result:', result) // Debug log
        setGroups(prev => prev.filter(group => group.id !== deleteTarget.id))
        setShowDeleteModal(false)
        setDeleteTarget(null)
        alert('Group deleted successfully!')
      } else {
        const errorText = await response.text()
        console.error('Delete error response:', errorText) // Debug log
        const error = JSON.parse(errorText)
        alert(error.error || error.message || 'Failed to delete group')
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      alert('Failed to delete group. Please try again.')
    }
  }

  const handleItemClick = (type: 'friend' | 'group', id: number | string) => {
    console.log('handleItemClick called with:', { type, id, idType: typeof id }) // Debug log
    if (type === 'friend') {
      router.push(`/friends/${id}`)
    } else {
      console.log('Navigating to group:', id) // Debug log
      router.push(`/groups/${id}`)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-emerald-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/owe-asis-logo.png" 
                alt="Owe-asis" 
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hello, {user.name}</span>
              <button
                onClick={handleLogout}
                className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Groups Section */}
              <div className="bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-100">Groups</h2>
                    <button 
                      onClick={() => setShowCreateGroupModal(true)}
                      className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                    >
                      + Create
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between group hover:bg-gray-700 p-2 rounded-md transition-colors">
                        <div 
                          className="flex items-center flex-1 cursor-pointer"
                          onClick={() => handleItemClick('group', group.id)}
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <span className="text-gray-200 block">{group.name}</span>
                            <span className="text-gray-400 text-xs">{group.memberCount} members</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {group.isCreator && (
                            <button
                              onClick={() => {
                                setDeleteTarget({ type: 'group', id: group.id, name: group.name })
                                setShowDeleteModal(true)
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                              title="Delete Group"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Friends Section */}
              <div className="bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-100">Friends</h2>
                    <button 
                      onClick={() => setShowAddFriendModal(true)}
                      className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                    >
                      + Add
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between group hover:bg-gray-700 p-2 rounded-md transition-colors">
                        <div 
                          className="flex items-center cursor-pointer flex-1"
                          onClick={() => handleItemClick('friend', friend.id)}
                        >
                          <div className="w-8 h-8 bg-emerald-700 rounded-full flex items-center justify-center">
                            <span className="text-emerald-200 font-medium text-sm">
                              {friend.name.charAt(0)}
                            </span>
                          </div>
                          <span className="ml-3 text-gray-200">{friend.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setDeleteTarget({ type: 'friend', id: friend.id, name: friend.name })
                              setShowDeleteModal(true)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                            title="Remove Friend"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Balance Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Balance */}
              <div className="bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-emerald-700 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">Total Balance</dt>
                      <dd className={`text-lg font-medium ${
                        balances.total > 0 ? 'text-green-400' : balances.total < 0 ? 'text-red-400' : 'text-gray-200'
                      }`}>
                        ${Math.abs(balances.total).toFixed(2)}
                        {balances.total !== 0 && (
                          <span className="text-sm ml-1">
                            {balances.total > 0 ? 'you are owed' : 'you owe'}
                          </span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* You Owe */}
              <div className="bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">You Owe</dt>
                      <dd className="text-lg font-medium text-red-400">
                        ${balances.youOwe.toFixed(2)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* You Are Owed */}
              <div className="bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4 6-6z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">You Are Owed</dt>
                      <dd className="text-lg font-medium text-green-400">
                        ${balances.youAreOwed.toFixed(2)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-100">Recent Activity</h2>
                  <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                    + Add Expense
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="text-center text-gray-400 py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-200">No expenses yet</h3>
                  <p className="mt-1 text-sm text-gray-400">Get started by adding your first expense.</p>
                  <div className="mt-6">
                    <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700">
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      New Expense
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-600 w-96 shadow-lg rounded-md bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-100">Add Friend</h3>
                <button
                  onClick={() => setShowAddFriendModal(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <label htmlFor="friendEmail" className="block text-sm font-medium text-gray-300 mb-2">
                  Friend's Email Address
                </label>
                <input
                  type="email"
                  id="friendEmail"
                  value={newFriendEmail}
                  onChange={(e) => setNewFriendEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter friend's email"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowAddFriendModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFriend}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                >
                  Add Friend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-600 w-96 shadow-lg rounded-md bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-100">Create Group</h3>
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <label htmlFor="groupName" className="block text-sm font-medium text-gray-300 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter group name"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-600 w-96 shadow-lg rounded-md bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-100">Add Member to Group</h3>
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setSelectedGroupId(null)
                    setSelectedFriendId(null)
                    setShowFriendDropdown(false)
                  }}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <label htmlFor="friendSelect" className="block text-sm font-medium text-gray-300 mb-2">
                  Select Friend to Add
                </label>
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 mb-2">
                    Debug: {friends.length} friends loaded
                  </div>
                )}
                {friends.length === 0 ? (
                  <div className="text-gray-400 text-sm py-4 text-center">
                    No friends available. Add some friends first to add them to groups.
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFriendDropdown(!showFriendDropdown)}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-gray-100 text-left focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 flex items-center justify-between"
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
                            {friend.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setSelectedGroupId(null)
                    setSelectedFriendId(null)
                    setShowFriendDropdown(false)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedFriendId}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    selectedFriendId 
                      ? 'text-white bg-emerald-600 hover:bg-emerald-700' 
                      : 'text-gray-400 bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to {deleteTarget.type === 'friend' ? 'remove' : 'delete'} "{deleteTarget.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteTarget(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={deleteTarget.type === 'friend' ? handleDeleteFriend : handleDeleteGroup}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                {deleteTarget.type === 'friend' ? 'Remove' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
