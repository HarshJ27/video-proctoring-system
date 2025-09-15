// Calculate integrity score based on violations
export const calculateIntegrityScore = (events, analytics) => {
    let baseScore = 100;
    
    // Deduction rules based on proctoring best practices
    const deductions = {
      focusLost: analytics.focusLostCount * 3,        // 3 points per focus loss
      noFace: analytics.noFaceCount * 5,              // 5 points per no face
      multipleFaces: analytics.multipleFacesCount * 8, // 8 points per multiple faces
      phoneDetected: analytics.phoneDetectedCount * 15, // 15 points per phone
      notesDetected: analytics.notesDetectedCount * 10  // 10 points per notes
    };
    
    // Apply deductions
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    const finalScore = Math.max(0, baseScore - totalDeductions);
    
    return {
      score: finalScore,
      deductions,
      totalDeductions,
      details: generateScoreDetails(events, analytics, deductions)
    };
  };
  
  // Generate detailed score breakdown
  const generateScoreDetails = (events, analytics, deductions) => {
    return {
      baseScore: 100,
      violations: [
        {
          type: 'Focus Lost',
          count: analytics.focusLostCount,
          deduction: deductions.focusLost,
          severity: 'LOW'
        },
        {
          type: 'No Face Detected',
          count: analytics.noFaceCount,
          deduction: deductions.noFace,
          severity: 'MEDIUM'
        },
        {
          type: 'Multiple Faces',
          count: analytics.multipleFacesCount,
          deduction: deductions.multipleFaces,
          severity: 'HIGH'
        },
        {
          type: 'Phone Detected',
          count: analytics.phoneDetectedCount,
          deduction: deductions.phoneDetected,
          severity: 'CRITICAL'
        },
        {
          type: 'Notes Detected',
          count: analytics.notesDetectedCount,
          deduction: deductions.notesDetected,
          severity: 'HIGH'
        }
      ]
    };
  };  