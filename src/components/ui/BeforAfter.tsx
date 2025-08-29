import React, { useReducer, useRef, useState, useEffect } from 'react'

type State = {
  rangeValue: number
}

type Action = { type: 'set_value'; payload: number }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set_value':
      const value = Math.max(0, Math.min(100, action.payload))
      return {
        rangeValue: value
      }
    default:
      return state
  }
}

type PointerEvent = React.PointerEvent<HTMLDivElement>
type InlineStyle = React.CSSProperties

interface Props {
  beforeImage: string
  afterImage: string
  onViewBefore?: () => void
  onDownloadBefore?: () => void
  onViewAfter?: () => void
  onDownloadAfter?: () => void
  className?: string
  beforeClassName?: string
  afterClassName?: string
  buttonClassName?: string
  style?: InlineStyle
  beforeStyle?: InlineStyle
  afterStyle?: InlineStyle
  buttonStyle?: InlineStyle
}

type ControlButtonsProps = {
  onView: () => void
  onDownload: () => void
  style?: React.CSSProperties
}

const ControlButtons = ({
  onView,
  onDownload,
  style
}: {
  onView: () => void
  onDownload: () => void
  style?: React.CSSProperties
}) => {
  const handleInteraction = (e: React.PointerEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  const buttonStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 5px',
    cursor: 'pointer',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        display: 'flex',
        gap: '10px',
        pointerEvents: 'none', 
        ...style
      }}
    >
      <button
        style={buttonStyle}
        onPointerDown={(e) => handleInteraction(e, onView)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
      </button>
      <button
        style={buttonStyle}
        onPointerDown={(e) => handleInteraction(e, onDownload)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      </button>
    </div>
  )
}

const downloadImage = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `generated_image.png`;
  a.click();
  window.URL.revokeObjectURL(objectUrl);
}

export function BeforeAfter({
  beforeImage,
  afterImage,
  // --- UPDATED DEFAULTS ---
  onViewBefore = () => window.open(beforeImage, '_blank'),
  onDownloadBefore = () => downloadImage(beforeImage),
  onViewAfter = () => window.open(afterImage, '_blank'),
  onDownloadAfter = () => downloadImage(afterImage),
  className = 'before-after-slider',
  beforeClassName = 'before-image',
  afterClassName = 'after-image',
  buttonClassName = 'resize-handle',
  style,
  beforeStyle,
  afterStyle,
  buttonStyle
}: Props) {
  const [{ rangeValue }, dispatch] = useReducer(reducer, {
    rangeValue: 50
  })
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointerMove = (event: globalThis.PointerEvent) => {
    if (!isDragging || !containerRef.current) return

    const { clientX } = event
    const { left, width } = containerRef.current.getBoundingClientRect()
    const positionX = clientX - left
    const percentage = (positionX / width) * 100

    dispatch({ type: 'set_value', payload: percentage })
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  // Effect to add/remove global event listeners for smooth dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging])

  const baseImageStyles: InlineStyle = {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center'
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        width: '100%',
        height: '180px',
        cursor: isDragging ? 'e-resize' : 'default',
        ...style
      }}
    >
      {/* --- AFTER IMAGE & CONTROLS --- */}
      <img
        src={afterImage}
        alt="after"
        className={afterClassName}
        style={{ ...baseImageStyles, ...afterStyle }}
      />
      {/* Inverse clip-path for "After" controls */}
      <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          clipPath: `inset(0 0 0 ${rangeValue}%)`
      }}>
        <ControlButtons onView={onViewAfter} onDownload={onDownloadAfter} style={{ right: '16px' }} />
      </div>


      {/* --- BEFORE IMAGE & CONTROLS --- */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          clipPath: `inset(0 ${100 - rangeValue}% 0 0)`
        }}
      >
        <img
          src={beforeImage}
          alt="before"
          className={beforeClassName}
          style={{ ...baseImageStyles, ...beforeStyle }}
        />
        <ControlButtons onView={onViewBefore} onDownload={onDownloadBefore} style={{ left: '16px' }} />
      </div>

      {/* --- SLIDER HANDLE --- */}
      <div
        className={buttonClassName}
        style={{
          position: 'absolute',
          top: 0,
          left: `${rangeValue}%`,
          transform: 'translateX(-50%)',
          height: '100%',
          width: '4px',
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 5px rgba(0,0,0,0.5)',
          cursor: 'e-resize', // Handle cursor is always resize
          ...buttonStyle
        }}
        onPointerDown={() => setIsDragging(true)}
      >
        {/* The circular button part of the handle */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: 'inherit'
          }}
        >
          <svg fill="#333" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            <path d="M15.41 7.41L10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default BeforeAfter