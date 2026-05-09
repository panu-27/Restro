import React from 'react';

export function CustomLogo({ size = 24, className = "", ...props }) {
    return (
        <img
            src="/brand-logo.png"
            alt="Annapurna logo"
            width={size}
            height={size}
            className={className}
            style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }}
            {...props}
        />
    );
}
