import React, { useState, useEffect } from 'react';

const DetectionLog = ({ events, sessionActive }) => {
  const [filter, setFilter] = useState('all');
  const [filteredEvents, setFilteredEvents] = useState([]);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(event => event.eventType === filter));
    }
  }, [events, filter]);

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'focus_lost':
        return '👀';
      case 'no_face':
        return '😶';
      case 'multiple_faces':
        return '👥';
      case 'phone_detected':
        return '📱';
      case 'notes_detected':
        return '📝';
      default:
        return '⚠️';
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'focus_lost':
        return 'text-yellow-600 bg-yellow-50';
      case 'no_face':
        return 'text-orange-600 bg-orange-50';
      case 'multiple_faces':
        return 'text-red-600 bg-red-50';
      case 'phone_detected':
        return 'text-red-700 bg-red-100';
      case 'notes_detected':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatEventType = (eventType) => {
    return eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Detection Events</h3>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${sessionActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm text-gray-600">
            {sessionActive ? 'Live' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Event Filter */}
      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Events ({events.length})</option>
          <option value="focus_lost">Focus Lost</option>
          <option value="no_face">No Face</option>
          <option value="multiple_faces">Multiple Faces</option>
          <option value="phone_detected">Phone Detected</option>
          <option value="notes_detected">Notes Detected</option>
        </select>
      </div>

      {/* Events List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎯</div>
            <p>No violations detected yet</p>
            {sessionActive && (
              <p className="text-sm">Monitoring in progress...</p>
            )}
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getEventColor(event.eventType)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getEventIcon(event.eventType)}</span>
                  <div>
                    <div className="font-medium text-sm">
                      {formatEventType(event.eventType)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {event.description}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{formatTime(event.timestamp)}</div>
                  {event.confidence > 0 && (
                    <div className="mt-1">
                      Confidence: {(event.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Stats */}
      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Most Recent:</span>
              <div className="font-medium">
                {formatEventType(events[events.length - 1]?.eventType)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Total Events:</span>
              <div className="font-medium text-red-600">{events.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetectionLog;