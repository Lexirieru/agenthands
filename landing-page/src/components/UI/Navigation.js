"use client"

import Clock from '@/components/UI/Clock/Clock'
import styles from '@/app/page.module.css'

/**
 * Reusable Navigation component
 *
 * @param {Object} props
 * @param {string} props.variant - Navigation variant: 'home' | 'about' | 'project'
 * @param {string} props.selectedItem - Selected item: 'WORK' | 'CONTACT' | 'ABOUT' | 'HOME' | 'LAB'
 * @param {Function} props.onItemClick - Callback called on item click (optional)
 * @param {Object} props.customStyles - Custom CSS styles (optional)
 */
export default function Navigation({ 
  variant = 'home', 
  selectedItem = 'HOME',
  onItemClick,
  customStyles = {}
}) {
  const navItems = [
    { label: 'APP', id: 'app', href: 'https://app-agenthands.vercel.app/tasks' },
    { label: 'CONTACT', id: 'contact' },
    { label: 'FEATURES', id: 'work' },
    { label: 'ABOUT', id: 'about' }
  ]

  const handleClick = (item) => {
    if (item.href) {
      window.open(item.href, '_blank', 'noopener,noreferrer')
      return
    }
    if (onItemClick) {
      onItemClick(item.id)
    }
  }

  const isHomeVariant = variant.includes('home')
  const showTitle = isHomeVariant
  const showClock = variant.includes('home')
  const ariaLabel = isHomeVariant ? 'home navigation' : `${variant} navigation`

  return (
    <nav className={customStyles.nav || ''} aria-label={ariaLabel}>
      {showTitle && <h3>AGENTHANDS</h3>}
      <ul className={customStyles.ul || ''}>
        {navItems.map((item) => {
          const isSelected = item.label === selectedItem
          return (
            <li key={item.id}>
              <a
                href={item.href || `#${item.id}`}
                target={item.href ? '_blank' : undefined}
                rel={item.href ? 'noopener noreferrer' : undefined}
                className={isSelected ? (customStyles.selected || styles.selected) : ''}
                aria-current={isSelected ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  handleClick(item)
                }}
              >
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
      {showClock && (
        <p className={customStyles.date || styles.date}>
          <Clock />
        </p>
      )}
    </nav>
  )
}
