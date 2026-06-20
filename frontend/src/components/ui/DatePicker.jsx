import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

const DatePicker = ({ value, onChange, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        return value ? new Date(value) : new Date();
    });
    
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const days = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);
        
        // Adjust for Monday start instead of Sunday start if preferred, 
        // but standard is Sunday start (0 = Sunday). 
        // In the screenshot: Mo Tu We Th Fr Sa Su
        let startDay = firstDay === 0 ? 6 : firstDay - 1; // Convert to Monday start
        
        const calendarDays = [];
        
        // Previous month blanks
        for (let i = 0; i < startDay; i++) {
            calendarDays.push(<div key={`blank-${i}`} className="w-8 h-8"></div>);
        }
        
        // Days
        for (let d = 1; d <= days; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = value === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            
            calendarDays.push(
                <button
                    key={d}
                    onClick={() => {
                        onChange(dateStr);
                        setIsOpen(false);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors ${
                        isSelected 
                            ? 'bg-sky-500 text-white font-bold' 
                            : isToday 
                                ? 'text-sky-500 font-bold bg-sky-50 hover:bg-sky-100' 
                                : 'text-slate-700 hover:bg-slate-100'
                    }`}
                >
                    {d}
                </button>
            );
        }
        return calendarDays;
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const setToday = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        onChange(todayStr);
        setCurrentMonth(new Date());
        setIsOpen(false);
    };

    const clearDate = () => {
        onChange('');
        setIsOpen(false);
    };

    const formatDateDisplay = (dateString) => {
        if (!dateString) return 'Select Date';
        const [year, month, day] = dateString.split('-');
        return `${day}-${month}-${year}`;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none shadow-sm transition-colors min-w-[150px]"
            >
                <span>{formatDateDisplay(value)}</span>
                <CalendarIcon className="h-4 w-4 text-slate-500" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 p-3 bg-white border border-slate-200 shadow-xl rounded-2xl z-50 w-64 origin-top-right">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <span className="font-bold text-sm text-slate-800">
                            {monthNames[currentMonth.getMonth()]}, {currentMonth.getFullYear()}
                        </span>
                        <div className="flex gap-1">
                            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
                                <ChevronUp className="h-4 w-4" />
                            </button>
                            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-y-1 mb-1">
                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                            <div key={day} className="text-[10px] font-bold text-slate-400 w-8 text-center uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-y-1">
                        {renderCalendar()}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-bold px-1">
                        <button 
                            onClick={clearDate}
                            className="text-slate-400 hover:text-slate-600 transition-colors px-2 py-1"
                        >
                            Clear
                        </button>
                        <button 
                            onClick={setToday}
                            className="text-sky-500 hover:text-sky-600 transition-colors px-2 py-1"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
