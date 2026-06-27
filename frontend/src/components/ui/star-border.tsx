import React from 'react'
import './star-border.css'

interface StarBorderProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType
  className?: string
  innerClassName?: string
  color?: string
  speed?: string
  thickness?: number
  children?: React.ReactNode
}

export function StarBorder({
  as: Component = 'button',
  className = '',
  innerClassName = '',
  color = 'white',
  speed = '6s',
  thickness = 1,
  children,
  ...rest
}: StarBorderProps) {
  return (
    <Component
      className={`star-border-container ${className}`}
      style={{
        padding: `${thickness}px 0`,
        ...rest.style
      }}
      {...rest}
    >
      <div
        className='border-gradient-bottom'
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      />
      <div
        className='border-gradient-top'
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed
        }}
      />
      <div className={`inner-content ${innerClassName}`}>{children}</div>
    </Component>
  )
}
