'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps {
  name: string
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  registerParams?: any // Si se usa react-hook-form
}

export default function PasswordInput({
  name,
  label = 'Contraseña',
  placeholder = '••••••••',
  required = false,
  error,
  registerParams = {},
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          placeholder={placeholder}
          required={required}
          className={`input pr-10 ${registerParams?.name ? '!bg-gray-50 focus:!bg-white' : ''}`}
          {...registerParams}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
