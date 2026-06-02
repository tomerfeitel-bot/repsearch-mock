export function Avatar({ username, size = 'md', className = '' }) {
  const initials = username ? username.slice(0, 2).toUpperCase() : '?'
  const colors = ['bg-indigo-600','bg-violet-600','bg-blue-600','bg-emerald-600','bg-orange-600','bg-pink-600','bg-teal-600','bg-rose-600']
  const color = colors[(username?.charCodeAt(0) || 0) % colors.length]
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base', xl: 'w-20 h-20 text-xl' }
  return (
    <div className={sizes[size] + ' ' + color + ' ' + className + ' rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0'}>
      {initials}
    </div>
  )
}
