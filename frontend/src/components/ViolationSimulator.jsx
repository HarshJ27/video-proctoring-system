import React, { useState } from 'react';

const ViolationSimulator = ({ onSimulateViolation, sessionActive }) => {
  const [isSimulating, setIsSimulating] = useState(false);

  const simulateViolation = async (violationType) => {
    if (!sessionActive) return;
    
    setIsSimulating(true);
    
    const violations = {
      focus_lost: {
        eventType: 'focus_lost',
        description: 'SIMULATED: Candidate looking away from screen',
        confidence: 0.2,
      },
      no_face: {
        eventType: 'no_face', 
        description: 'SIMULATED: No face detected - candidate left camera view',
        confidence: 0,
      },
      multiple_faces: {
        eventType: 'multiple_faces',
        description: 'SIMULATED: Multiple faces detected - unauthorized person present',
        confidence: 0.8,
      },
      phone_detected: {
        eventType: 'phone_detected',
        description: 'SIMULATED: Mobile device detected in frame',
        confidence: 0.9,
      },
      notes_detected: {
        eventType: 'notes_detected',
        description: 'SIMULATED: Written notes or books detected',
        confidence: 0.85,
      }
    };

    const violation = violations[violationType];
    
    // Call the parent handler
    if (onSimulateViolation) {
      onSimulateViolation(violation);
    }

    // Brief delay to show button feedback
    setTimeout(() => {
      setIsSimulating(false);
    }, 1000);
  };

  if (!sessionActive) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Violation Testing</h3>
        <p className="text-gray-500 text-center py-4">
          Start the interview session to test violation detection
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Test Violations</h3>
        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          DEMO MODE
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Click buttons below to simulate different violations and see how the system responds:
      </p>

      <div className="grid grid-cols-1 gap-3">
        {/* Focus Lost */}
        <button
          onClick={() => simulateViolation('focus_lost')}
          disabled={isSimulating}
          className="flex items-center space-x-3 p-3 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <span className="text-xl">👀</span>
          <div className="text-left">
            <div className="font-medium text-yellow-800">Simulate Focus Lost</div>
            <div className="text-xs text-yellow-600">Looking away from screen more than 5 seconds</div>
          </div>
        </button>

        {/* No Face */}
        <button
          onClick={() => simulateViolation('no_face')}
          disabled={isSimulating}
          className="flex items-center space-x-3 p-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <span className="text-xl">😶</span>
          <div className="text-left">
            <div className="font-medium text-orange-800">Simulate No Face</div>
            <div className="text-xs text-orange-600">Face not detected more than 10 seconds</div>
          </div>
        </button>

        {/* Multiple Faces */}
        <button
          onClick={() => simulateViolation('multiple_faces')}
          disabled={isSimulating}
          className="flex items-center space-x-3 p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <span className="text-xl">👥</span>
          <div className="text-left">
            <div className="font-medium text-red-800">Simulate Multiple Faces</div>
            <div className="text-xs text-red-600">Another person detected</div>
          </div>
        </button>

        {/* Phone Detected */}
        <button
          onClick={() => simulateViolation('phone_detected')}
          disabled={isSimulating}
          className="flex items-center space-x-3 p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <span className="text-xl">📱</span>
          <div className="text-left">
            <div className="font-medium text-red-800">Simulate Phone Detection</div>
            <div className="text-xs text-red-600">Mobile device in frame</div>
          </div>
        </button>

        {/* Notes Detected */}
        <button
          onClick={() => simulateViolation('notes_detected')}
          disabled={isSimulating}
          className="flex items-center space-x-3 p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <span className="text-xl">📝</span>
          <div className="text-left">
            <div className="font-medium text-red-800">Simulate Notes Detection</div>
            <div className="text-xs text-red-600">Written materials detected</div>
          </div>
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600">💡</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium">Testing Tips:</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• Each violation will appear in the Detection Log</li>
              <li>• Statistics will update in real-time</li>
              <li>• Try multiple violations to see scoring impact</li>
              <li>• Generate report after testing to see full analysis</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViolationSimulator;