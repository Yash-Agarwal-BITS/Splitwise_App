'use client'

import { useState, useEffect } from 'react'
import { X, DollarSign, Users, Calculator, Percent } from 'lucide-react'

interface Friend {
  id: string | number
  name: string
  email: string
}

interface Participant {
  user_id: string | number
  name: string
  share: number
}

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  friends: Friend[]
  currentUserId: string | number
  currentUserName: string
  expenseType: 'personal' | 'group'
}

type SplitType = 'equal' | 'exact' | 'percentage'

export default function AddExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  friends,
  currentUserId,
  currentUserName,
  expenseType
}: AddExpenseModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState<string | number>(currentUserId)
  const [selectedParticipants, setSelectedParticipants] = useState<(string | number)[]>([currentUserId])
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDescription('')
      setAmount('')
      setPaidBy(currentUserId)
      
      // For personal expenses, automatically include the friend if there's only one
      const initialParticipants = expenseType === 'personal' && friends.length === 1 
        ? [currentUserId, friends[0].id]
        : [currentUserId]
      
      setSelectedParticipants(initialParticipants)
      setSplitType('equal')
      setShowParticipantDropdown(false)
      
      const initialParticipantsList = initialParticipants.map(userId => {
        let participantName = 'Unknown'
        if (userId == currentUserId) {
          participantName = currentUserName
        } else {
          const friend = friends.find(f => f.id == userId)
          participantName = friend?.name || 'Unknown'
        }
        
        return {
          user_id: userId,
          name: participantName,
          share: 0
        }
      })
      setParticipants(initialParticipantsList)
    }
  }, [isOpen, currentUserId, currentUserName, friends, expenseType])

  // Update participants when selection changes
  useEffect(() => {
    const newParticipants = selectedParticipants.map(userId => {
      let participantName = 'Unknown'
      if (userId == currentUserId) {
        participantName = currentUserName
      } else {
        const friend = friends.find(f => f.id == userId)
        participantName = friend?.name || 'Unknown'
      }
      
      return {
        user_id: userId,
        name: participantName,
        share: 0
      }
    })
    setParticipants(newParticipants)
  }, [selectedParticipants, currentUserId, currentUserName, friends])

  // Calculate shares when amount or split type changes
  useEffect(() => {
    if (!amount || participants.length === 0) return

    const totalAmount = parseFloat(amount)
    if (isNaN(totalAmount) || totalAmount <= 0) return

    if (splitType === 'equal') {
      const sharePerPerson = totalAmount / participants.length
      const updatedParticipants = participants.map(p => ({
        ...p,
        share: Math.round(sharePerPerson * 100) / 100
      }))
      setParticipants(updatedParticipants)
    }
  }, [amount, splitType, participants.length])

  const handleParticipantToggle = (userId: string | number) => {
    if (userId == currentUserId) return // Current user must always be included

    setSelectedParticipants(prev => {
      const isIncluded = prev.some(id => id == userId)
      return isIncluded
        ? prev.filter(id => id != userId)
        : [...prev, userId]
    })
  }

  const handleShareChange = (userId: string | number, newShare: number) => {
    setParticipants(prev => 
      prev.map(p => 
        p.user_id == userId ? { ...p, share: newShare } : p
      )
    )
  }

  const handlePercentageChange = (userId: string | number, percentage: number) => {
    const totalAmount = parseFloat(amount) || 0
    const newShare = (totalAmount * percentage) / 100
    handleShareChange(userId, Math.round(newShare * 100) / 100)
  }

  const getTotalShares = () => {
    return participants.reduce((sum, p) => sum + (p.share || 0), 0)
  }

  const isValidExpense = () => {
    const totalAmount = parseFloat(amount) || 0
    const totalShares = getTotalShares()
    
    return (
      description.trim() !== '' &&
      totalAmount > 0 &&
      participants.length > 0 &&
      Math.abs(totalShares - totalAmount) < 0.01
    )
  }

  const handleSubmit = async () => {
    if (!isValidExpense()) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      const expenseData = {
        group_id: expenseType === 'group' ? null : null,
        amount: parseFloat(amount),
        description: description.trim(),
        expense_type: expenseType,
        paid_by: paidBy,
        participants: participants.map(p => ({
          user_id: p.user_id,
          share: p.share
        }))
      }

      const response = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expenseData)
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create expense')
      }
    } catch (error) {
      console.error('Error creating expense:', error)
      alert('Failed to create expense. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Add an expense
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Participants Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">With you and:</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedParticipants.map(userId => {
                let participantName = 'Unknown'
                if (userId == currentUserId) {
                  participantName = currentUserName
                } else {
                  const friend = friends.find(f => f.id == userId)
                  participantName = friend?.name || 'Unknown'
                }
                
                if (!participantName || participantName === 'Unknown') return null
                
                return (
                  <div
                    key={userId}
                    className={`flex items-center px-3 py-1 rounded-full text-sm ${
                      userId == currentUserId 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-600 text-gray-200'
                    }`}
                  >
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                      <span className="text-xs font-medium text-white">
                        {participantName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {participantName}
                    {userId != currentUserId && (
                      <button
                        onClick={() => handleParticipantToggle(userId)}
                        className="ml-2 text-gray-300 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Add more participants */}
            {friends.length === 0 && (
              <div className="text-gray-400 text-sm mt-2">
                You need to add friends first to create expenses with them.
              </div>
            )}
            <div className="relative">
              <button
                onClick={() => setShowParticipantDropdown(!showParticipantDropdown)}
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center cursor-pointer"
                disabled={friends.length === 0}
              >
                <Users className="w-4 h-4 mr-1" />
                {friends.length === 0 ? 'No friends available' : 'Add people'}
              </button>
              
              {showParticipantDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto min-w-[200px]">
                  {(() => {
                    const availableFriends = friends.filter(f => !selectedParticipants.some(p => p == f.id))
                    return availableFriends.length === 0 ? (
                      <div className="px-3 py-2 text-gray-400 text-sm">
                        No friends available to add
                      </div>
                    ) : (
                      availableFriends.map(friend => (
                        <button
                          key={friend.id}
                          onClick={() => {
                            handleParticipantToggle(friend.id)
                            setShowParticipantDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left text-gray-100 hover:bg-gray-600 focus:bg-gray-600 focus:outline-none flex items-center"
                        >
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                            <span className="text-xs font-medium text-white">
                              {friend.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {friend.name}
                        </button>
                      ))
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Expense Details */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-700 rounded-md flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                placeholder="Enter a description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-transparent text-white text-lg placeholder-gray-400 border-none outline-none"
              />
              <div className="flex items-center">
                <span className="text-gray-400 text-2xl mr-2">₹</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-transparent text-white text-2xl placeholder-gray-400 border-none outline-none w-32"
                />
              </div>
            </div>
          </div>

          {/* Paid by */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Paid by</label>
            <select
              value={paidBy}
              onChange={(e) => {
                const newPaidBy = e.target.value
                const parsedValue = isNaN(Number(newPaidBy)) ? newPaidBy : Number(newPaidBy)
                setPaidBy(parsedValue)
              }}
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {selectedParticipants.map(userId => {
                let participantName = 'Unknown'
                if (userId == currentUserId) {
                  participantName = currentUserName
                } else {
                  const friend = friends.find(f => f.id == userId)
                  participantName = friend?.name || 'Unknown'
                }
                
                return (
                  <option key={userId} value={userId}>
                    {participantName} {userId == currentUserId ? '(you)' : ''}
                  </option>
                )
              })}
            </select>
            <p className="text-xs text-gray-500 mt-1">and split</p>
          </div>

          {/* Split Options */}
          <div>
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setSplitType('equal')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                  splitType === 'equal' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Calculator className="w-4 h-4 inline mr-1" />
                Equally
              </button>
              <button
                onClick={() => setSplitType('exact')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                  splitType === 'exact' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-1" />
                Exact amounts
              </button>
              <button
                onClick={() => setSplitType('percentage')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                  splitType === 'percentage' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Percent className="w-4 h-4 inline mr-1" />
                Percentages
              </button>
            </div>

            {/* Split Details */}
            <div className="space-y-3">
              {participants.map(participant => (
                <div key={participant.user_id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-white">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-white">{participant.name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {splitType === 'equal' ? (
                      <span className="text-white">₹{participant.share.toFixed(2)}</span>
                    ) : splitType === 'exact' ? (
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-1">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={participant.share === 0 ? '' : participant.share}
                          onChange={(e) => {
                            const value = e.target.value
                            const numValue = value === '' ? 0 : parseFloat(value)
                            handleShareChange(participant.user_id, numValue || 0)
                          }}
                          className="w-20 px-2 py-1 bg-gray-700 text-white border border-gray-600 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={amount && participant.share ? ((participant.share / parseFloat(amount)) * 100).toFixed(1) : ''}
                          onChange={(e) => handlePercentageChange(participant.user_id, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-gray-700 text-white border border-gray-600 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                        <span className="text-gray-400 ml-1">%</span>
                        <span className="text-white ml-2">₹{participant.share.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t border-gray-600 pt-3 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-white">TOTAL</span>
                <span className="text-lg font-medium text-white">₹{getTotalShares().toFixed(2)}</span>
              </div>
              {Math.abs(getTotalShares() - (parseFloat(amount) || 0)) > 0.01 && (
                <p className="text-red-400 text-sm mt-1">
                  Total shares must equal ₹{parseFloat(amount || '0').toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValidExpense() || loading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
} 