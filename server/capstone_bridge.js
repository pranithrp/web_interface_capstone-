const fs = require('fs');
const path = require('path');

// Minimal bridge: watches capstone-5 threat_log and emits socket.io events
module.exports = (io, options = {}) => {
  const base = options.basePath || path.join(__dirname, '..', 'capstone-5');
  const candidatePaths = [
    path.join(base, 'logs', 'threat_log.csv'),
    path.join(base, 'threat_log.csv')
  ];

  const logPath = candidatePaths.find(p => fs.existsSync(p));
  if (!logPath) {
    console.warn('⚠️ capstone_bridge: threat_log.csv not found in capstone-5 (checked paths):', candidatePaths);
    return;
  }

  console.log('🛰️ capstone_bridge: watching', logPath);

  let lastSize = 0;

  // Helper to broadcast payload to all doctors rooms
  const broadcastToDoctors = async (payload) => {
    try {
      const Doctor = require('./models/Doctor');
      const doctors = await Doctor.find({});
      if (!doctors || doctors.length === 0) {
        // Fallback: emit globally with a 'target' field
        io.emit('threat_alert', payload);
        return;
      }

      doctors.forEach(d => {
        if (d && d.doctorId) {
          io.to(d.doctorId).emit('threat_alert', payload);
        }
      });
      // Also emit to an 'admins' room for system operators
      io.to('admins').emit('threat_alert', payload);
    } catch (err) {
      console.error('capstone_bridge: error broadcasting to doctors', err);
      io.emit('threat_alert', payload);
    }
  };

  // Read initial size
  try {
    const st = fs.statSync(logPath);
    lastSize = st.size;
  } catch (err) {
    lastSize = 0;
  }

  // Poll for file growth every 2 seconds and read appended lines
  setInterval(() => {
    fs.stat(logPath, (err, stats) => {
      if (err) return;
      if (stats.size > lastSize) {
        const stream = fs.createReadStream(logPath, { start: lastSize, end: stats.size });
        let leftover = '';
        stream.on('data', chunk => { leftover += chunk.toString(); });
        stream.on('end', async () => {
          lastSize = stats.size;
          const lines = leftover.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          // Skip header if it appears in appended chunk
          for (const line of lines) {
            // Basic CSV parsing: split by comma (assumes no quoted commas)
            const cols = line.split(',').map(c => c.trim());
            // Last column expected to be prediction/label
            const label = cols[cols.length - 1] || 'unknown';
            const timestamp = cols[0] || new Date().toISOString();

            const payload = {
              type: 'threat_alert',
              id: `capstone-${Date.now()}`,
              source: 'capstone-5',
              label: label,
              severity: (String(label).toLowerCase().includes('threat') ? 'high' : 'low'),
              message: (String(label).toLowerCase().includes('threat') ? 'Threat detected by network & contract analysis' : 'Anomaly detected'),
              raw: cols,
              timestamp,
            };

            // Try to parse device/patient info from the row if present (best-effort)
            // If you have a mapping from device -> patient, extend this logic.
            // For now, broadcast to doctors rooms so doctors are always notified.
            await broadcastToDoctors(payload);
          }
        });
      }
    });
  }, 2000);
};
