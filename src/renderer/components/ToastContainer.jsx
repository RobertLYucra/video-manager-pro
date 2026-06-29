import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

let addToastGlobal = null;

export function showToast(message, type = 'info') {
    if (addToastGlobal) {
        addToastGlobal(message, type);
    } else {
        console.warn('ToastContainer not mounted yet.', message);
    }
}

function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        addToastGlobal = (message, type) => {
            const id = Date.now();
            setToasts(prev => [...prev, { id, message, type }]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 3000);
        };
        return () => { addToastGlobal = null; };
    }, []);

    return (
        <div id="toastContainer" className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast toast-${toast.type} show`}>
                    <div className="toast-content">
                        <span className="toast-icon">
                            {toast.type === 'success' && '✅'}
                            {toast.type === 'error' && '❌'}
                            {toast.type === 'info' && 'ℹ️'}
                        </span>
                        <p className="toast-message">{toast.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ToastContainer;
