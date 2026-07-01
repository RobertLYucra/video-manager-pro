import React, { useState, useEffect, useRef } from 'react';

function LoggerTerminal({ title, logLines, onClear, isActive, elapsedTime, defaultExpanded = false }) {
    const [isLogExpanded, setIsLogExpanded] = useState(defaultExpanded);
    const logRef = useRef(null);

    const [internalTime, setInternalTime] = useState(0);

    // Auto-scroll
    useEffect(() => {
        if (logRef.current && isLogExpanded) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logLines, isLogExpanded]);

    // Auto-expand when active
    useEffect(() => {
        if (isActive) {
            setIsLogExpanded(true);
        }
    }, [isActive]);

    // Internal timer if external elapsedTime is not provided
    useEffect(() => {
        let interval;
        if (isActive && elapsedTime === undefined) {
            interval = setInterval(() => {
                setInternalTime(prev => prev + 1);
            }, 1000);
        } else if (!isActive && elapsedTime === undefined) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, elapsedTime]);

    // Reset internal timer when starting a new process (log clears or starts)
    useEffect(() => {
        if (isActive && logLines.length <= 1) {
            setInternalTime(0);
        }
    }, [isActive, logLines]);

    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds === undefined) seconds = 0;
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    const displayTime = elapsedTime !== undefined ? elapsedTime : internalTime;

    return (
        <div className="card terminal-card" style={{ marginTop: '24px', marginBottom: '24px' }}>
            <div 
                className="terminal-header" 
                style={{ cursor: 'pointer', userSelect: 'none' }} 
                onClick={() => setIsLogExpanded(!isLogExpanded)}
            >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isLogExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    <span>{title || 'Consola'}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {(isActive || displayTime > 0) && (
                        <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{formatTime(displayTime)}</span>
                    )}
                    {isActive && <div className="status-dot active"></div>}
                    <button className="btn-small clear-btn" onClick={(e) => { e.stopPropagation(); onClear(); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', width: 'auto', height: 'auto' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Limpiar
                    </button>
                </div>
            </div>
            {isLogExpanded && (
                <div ref={logRef} className="terminal">
                    {logLines.map((line, idx) => (
                        <div key={idx} style={{ 
                            color: line.isError ? 'var(--danger)' : 
                                   line.isSuccess ? 'var(--success)' : 'inherit'
                        }}>
                            {line.text}
                        </div>
                    ))}
                    {logLines.length === 0 && (
                        <div style={{ color: '#64748b' }}>Esperando a iniciar proceso...</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default LoggerTerminal;
