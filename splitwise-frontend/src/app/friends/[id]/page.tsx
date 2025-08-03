'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, Plus, DollarSign } from 'lucide-react'
import AddExpenseModal from '@/components/AddExpenseModal'

interface Friend {
  id: string
  name: string
  email: string
  balance: number
}

interface User {
  user_id: string
  username: string
  email: string
}

interface Expense {
  expense_id: string
  paid_by: string
  amount: number
  description: string
  created_at: string
  users: User
  participants: {
    participant_id: string
    user_id: string
    share: number
    users: User
  }[]
}

export default function FriendPage() {
  const params = useParams()
  const router = useRouter()
  const friendId = params.id as string

  const [friend, setFriend] = useState<Friend | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState<number>(0)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadCurrentUser()
    loadFriendDetails()
    loadFriendExpenses()
    loadFriendBalance()
  }, [friendId])

  const loadFriendDetails = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/contacts/friends', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Friends data:', result.friends) // Debug log
        console.log('Looking for friend ID:', friendId) // Debug log
        
        // The API returns user_id, but we need to match against the ID we're passing from dashboard
        const friendData = result.friends.find((f: any) => f.user_id.toString() === friendId.toString())
        if (friendData) {
          const mappedFriend: Friend = {
            id: friendData.user_id,
            name: friendData.username || friendData.email?.split('@')[0] || 'Unknown',
            email: friendData.email,
            balance: 0 // TODO: Calculate actual balance from expenses
          }
          setFriend(mappedFriend)
        } else {
          console.error('Friend not found in data. Available friends:', result.friends.map((f: any) => ({ id: f.user_id, name: f.username })))
          setError('Friend not found')
        }
      } else {
        setError('Failed to load friend details')
      }
    } catch (error) {
      console.error('Error loading friend:', error)
      setError('Failed to load friend details')
    }
  }

  const loadFriendExpenses = async () => {
    try {
      const token = localStorage.getItem('token')
      console.log('Loading friend expenses for friendId:', friendId)
      
      const response = await fetch(`http://localhost:5000/api/expenses/friend/${friendId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('Friend expenses response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Friend expenses result:', result)
        setExpenses(result.expenses || [])
      } else {
        const errorText = await response.text()
        console.error('Failed to load expenses:', errorText)
      }
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentUser = () => {
    try {
      const userDataString = localStorage.getItem('user')
      if (userDataString) {
        const userData = JSON.parse(userDataString)
        setCurrentUser(userData)
      }
    } catch (error) {
      console.error('Error loading current user:', error)
    }
  }

  const loadFriendBalance = async () => {
    try {
      setBalanceLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/expenses/balances?balance_type=personal`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        const personalBalances = result.balances.find((b: any) => b.type === 'personal')
        
        if (personalBalances) {
          const friendBalance = personalBalances.balances.find((b: any) => b.user_id.toString() === friendId.toString())
          if (friendBalance) {
            setBalance(friendBalance.net_balance)
          } else {
            setBalance(0) // No balance found, set to 0
          }
        } else {
          setBalance(0) // No personal balances found, set to 0
        }
      } else {
        console.error('Failed to load balance')
      }
    } catch (error) {
      console.error('Error loading balance:', error)
    } finally {
      setBalanceLoading(false)
    }
  }

  const handleExpenseSuccess = () => {
    // Refresh data after adding expense
    loadFriendExpenses()
    loadFriendBalance()
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

  if (error || !friend) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error || 'Friend not found'}</div>
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
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-medium text-lg">
                    {friend.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">{friend.name}</h1>
                  <p className="text-sm text-gray-400">{friend.email}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowExpenseModal(true)}
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
          {/* Friend Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Balance Summary</h2>
              <div className="space-y-4">
                <div className="text-center p-4 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Current Balance</p>
                  {balanceLoading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto"></div>
                  ) : (
                    <>
                      <p className={`text-2xl font-bold ${
                        balance > 0 ? 'text-green-400' : 
                        balance < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {balance > 0 && '+'}
                        {formatCurrency(Math.abs(balance))}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {balance > 0 
                          ? `${friend.name} owes you` 
                          : balance < 0 
                            ? `You owe ${friend.name}` 
                            : 'All settled up'
                        }
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white">{friend.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">Shared Expenses</h2>
              </div>
              
              {expenses.length === 0 ? (
                <div className="p-8 text-center">
                  <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No shared expenses yet</p>
                  <p className="text-sm text-gray-500 mt-2">Add your first expense together</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {expenses.map((expense) => (
                    <div 
                      key={expense.expense_id} 
                      className="p-6 hover:bg-gray-750 cursor-pointer transition-colors duration-200"
                      onClick={() => router.push(`/expenses/${expense.expense_id}`)}
                    >
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
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-emerald-400 flex items-center">
                          <span>Click to view details</span>
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {currentUser && friend && (
        <AddExpenseModal
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={handleExpenseSuccess}
          friends={[friend]}
          currentUserId={currentUser.user_id || currentUser.id}
          currentUserName={currentUser.username || currentUser.name}
          expenseType="personal"
        />
      )}
    </div>
  )
}
