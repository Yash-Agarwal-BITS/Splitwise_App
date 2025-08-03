'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, DollarSign, Calendar, Users } from 'lucide-react'

interface User {
  user_id: string
  username: string
  email: string
}

interface ExpenseParticipant {
  participant_id: string
  user_id: string
  share: number
  users: User
}

interface Expense {
  expense_id: string
  paid_by: string
  amount: number
  description: string
  created_at: string
  expense_type: string
  users: User
  participants: ExpenseParticipant[]
}

export default function ExpenseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const expenseId = params.id

  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadCurrentUser()
    loadExpenseDetails()
  }, [expenseId])

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

  const loadExpenseDetails = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(`http://localhost:5000/api/expenses/${expenseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setExpense(result.expense)
      } else {
        const errorText = await response.text()
        setError(errorText || 'Failed to load expense details')
      }
    } catch (error) {
      console.error('Error loading expense details:', error)
      setError('Failed to load expense details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const isCurrentUserPayer = () => {
    return currentUser && expense && (currentUser.user_id || currentUser.id) === expense.paid_by
  }

  const getCurrentUserShare = () => {
    if (!currentUser || !expense) return 0
    const currentUserId = currentUser.user_id || currentUser.id
    const participant = expense.participants.find(p => p.user_id === currentUserId)
    return participant ? participant.share : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-800 rounded-lg shadow p-8 text-center">
            <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Expense Not Found</h1>
            <p className="text-gray-400 mb-6">{error || 'The expense you are looking for does not exist.'}</p>
            <button
              onClick={() => router.back()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="text-gray-400 hover:text-white mr-4"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">Expense Details</h1>
                <p className="text-sm text-gray-400">{expense.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(expense.amount)}
              </p>
              <p className="text-sm text-gray-400">
                {expense.expense_type === 'personal' ? 'Personal Expense' : 'Group Expense'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Expense Information */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Expense Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Description</label>
                  <p className="text-white font-medium">{expense.description}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Amount</label>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Date Created</label>
                  <p className="text-white flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatDate(expense.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Type</label>
                  <p className="text-white capitalize">{expense.expense_type}</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Payment Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Paid by</label>
                  <div className="flex items-center mt-2">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-medium">
                        {expense.users.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{expense.users.username}</p>
                      <p className="text-sm text-gray-400">{expense.users.email}</p>
                    </div>
                  </div>
                </div>
                {currentUser && (
                  <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Your Share</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(getCurrentUserShare())}
                    </p>
                    {isCurrentUserPayer() ? (
                      <p className="text-sm text-emerald-400 mt-1">You paid for this expense</p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">
                        You owe {formatCurrency(getCurrentUserShare())} to {expense.users.username}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Participants ({expense.participants.length})
            </h2>
            <div className="space-y-4">
              {expense.participants.map((participant) => (
                <div key={participant.participant_id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-medium">
                        {participant.users.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{participant.users.username}</p>
                      <p className="text-sm text-gray-400">{participant.users.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-400">
                      {formatCurrency(participant.share)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {((participant.share / expense.amount) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Amount</span>
                <span className="text-lg font-semibold text-white">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">Total Shares</span>
                <span className="text-white">
                  {formatCurrency(expense.participants.reduce((sum, p) => sum + p.share, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 