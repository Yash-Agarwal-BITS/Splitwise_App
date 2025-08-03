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

export default function GroupPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadGroupDetails()
    loadGroupExpenses()
  }, [groupId])

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
                      <div key={member.user_id} className="flex items-center justify-between">
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
                        {member.is_creator && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                            Creator
                          </span>
                        )}
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
    </div>
  )
}
