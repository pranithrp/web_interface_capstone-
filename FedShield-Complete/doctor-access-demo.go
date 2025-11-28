package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Doctor struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Specialization string `json:"specialization"`
	HospitalID   string `json:"hospitalId"`
	IsVerified   bool   `json:"isVerified"`
}

type DoctorPermission struct {
	PatientID string    `json:"patientId"`
	DoctorID  string    `json:"doctorId"`
	FileToken string    `json:"fileToken"`
	FileName  string    `json:"fileName"`
	GrantedAt time.Time `json:"grantedAt"`
	ExpiresAt time.Time `json:"expiresAt"`
	IsActive  bool      `json:"isActive"`
}

// Simulated doctor database
var doctors = map[string]Doctor{
	"DR001": {ID: "DR001", Name: "Dr. Sarah Johnson", Specialization: "Cardiology", HospitalID: "HOSP001", IsVerified: true},
	"DR002": {ID: "DR002", Name: "Dr. Michael Chen", Specialization: "Neurology", HospitalID: "HOSP001", IsVerified: true},
	"DR003": {ID: "DR003", Name: "Dr. Emily Davis", Specialization: "Pediatrics", HospitalID: "HOSP002", IsVerified: true},
}

// Simulated permissions (in real system, this would be on blockchain)
var doctorPermissions = map[string][]DoctorPermission{
	"DR001": {
		{
			PatientID: "PAT001",
			DoctorID:  "DR001",
			FileToken: "bcc2fbf8d2a90755172a56380b34d8b9f5208ae06a366b190147d7938238efe5",
			FileName:  "cardiac_report.txt",
			GrantedAt: time.Now().Add(-2 * time.Hour),
			ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
			IsActive:  true,
		},
		{
			PatientID: "PAT002",
			DoctorID:  "DR001",
			FileToken: "0c8da9d4b8bbf343912cf5e57b21594438e726f87c72ad99afc155af33e653c4",
			FileName:  "ecg_results.txt",
			GrantedAt: time.Now().Add(-1 * time.Hour),
			ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
			IsActive:  true,
		},
	},
	"DR002": {
		{
			PatientID: "PAT003",
			DoctorID:  "DR002",
			FileToken: "91184b21d74a30ccb617394a12e1559ef3aed447f4ec0d39b6f4c36f7f49457b",
			FileName:  "brain_scan.txt",
			GrantedAt: time.Now().Add(-3 * time.Hour),
			ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
			IsActive:  true,
		},
	},
}

func main() {
	fmt.Println("FedShield Doctor Access Demo")
	fmt.Println("============================")

	http.HandleFunc("/", doctorDashboard)
	http.HandleFunc("/doctor/login", doctorLogin)
	http.HandleFunc("/doctor/files", getDoctorFiles)
	http.HandleFunc("/doctor/access", accessFile)

	fmt.Println("Doctor Access Demo Server Started!")
	fmt.Println("URL: http://localhost:8082")
	fmt.Println("\nDemo Doctors:")
	for id, doctor := range doctors {
		fmt.Printf("- %s: %s (%s)\n", id, doctor.Name, doctor.Specialization)
	}

	http.ListenAndServe(":8082", nil)
}

func doctorDashboard(w http.ResponseWriter, r *http.Request) {
	html := `
<!DOCTYPE html>
<html>
<head>
    <title>FedShield - Doctor Access Portal</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #2c3e50; margin-bottom: 30px; }
        .doctor-card { border: 2px solid #3498db; padding: 20px; margin: 15px 0; border-radius: 8px; cursor: pointer; transition: all 0.3s; }
        .doctor-card:hover { background: #ecf0f1; transform: translateY(-2px); }
        .file-list { background: #e8f6f3; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .file-item { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #27ae60; }
        .token { font-family: monospace; background: #2c3e50; color: white; padding: 10px; border-radius: 5px; word-break: break-all; }
        button { background: #3498db; color: white; padding: 12px 25px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        button:hover { background: #2980b9; }
        .success { background: #d5f4e6; border: 2px solid #27ae60; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .error { background: #fadbd8; border: 2px solid #e74c3c; padding: 20px; border-radius: 8px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>FedShield Doctor Access Portal</h1>
        <p>Blockchain-Validated Healthcare File Access</p>
    </div>

    <div class="container">
        <h2>Doctor Authentication</h2>
        <p>Select a doctor to simulate blockchain certificate validation:</p>
        
        <div class="doctor-card" onclick="loginDoctor('DR001')">
            <h3>Dr. Sarah Johnson (DR001)</h3>
            <p><strong>Specialization:</strong> Cardiology</p>
            <p><strong>Hospital:</strong> HOSP001</p>
            <p><strong>Status:</strong> <span style="color: #27ae60;">✓ Verified</span></p>
        </div>

        <div class="doctor-card" onclick="loginDoctor('DR002')">
            <h3>Dr. Michael Chen (DR002)</h3>
            <p><strong>Specialization:</strong> Neurology</p>
            <p><strong>Hospital:</strong> HOSP001</p>
            <p><strong>Status:</strong> <span style="color: #27ae60;">✓ Verified</span></p>
        </div>

        <div class="doctor-card" onclick="loginDoctor('DR003')">
            <h3>Dr. Emily Davis (DR003)</h3>
            <p><strong>Specialization:</strong> Pediatrics</p>
            <p><strong>Hospital:</strong> HOSP002</p>
            <p><strong>Status:</strong> <span style="color: #27ae60;">✓ Verified</span></p>
        </div>
    </div>

    <div id="doctorFiles" class="container" style="display: none;">
        <h2>Authorized Files</h2>
        <div id="filesList"></div>
    </div>

    <div id="fileAccess" class="container" style="display: none;">
        <h2>File Access</h2>
        <div id="accessResult"></div>
    </div>

    <script>
        let currentDoctor = null;

        async function loginDoctor(doctorId) {
            try {
                const response = await fetch('/doctor/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ doctorId: doctorId })
                });

                const result = await response.json();
                
                if (response.ok) {
                    currentDoctor = result.doctor;
                    document.getElementById('doctorFiles').style.display = 'block';
                    loadDoctorFiles(doctorId);
                } else {
                    alert('Authentication failed: ' + result.error);
                }
            } catch (error) {
                alert('Login error: ' + error.message);
            }
        }

        async function loadDoctorFiles(doctorId) {
            try {
                const response = await fetch('/doctor/files?doctorId=' + doctorId);
                const result = await response.json();
                
                if (response.ok) {
                    displayFiles(result.files);
                } else {
                    document.getElementById('filesList').innerHTML = '<div class="error">No authorized files found</div>';
                }
            } catch (error) {
                document.getElementById('filesList').innerHTML = '<div class="error">Error loading files: ' + error.message + '</div>';
            }
        }

        function displayFiles(files) {
            let html = '<div class="file-list">';
            html += '<h3>Files You Are Authorized to Access:</h3>';
            
            files.forEach(file => {
                html += '<div class="file-item">';
                html += '<h4>' + file.fileName + '</h4>';
                html += '<p><strong>Patient:</strong> ' + file.patientId + '</p>';
                html += '<p><strong>Granted:</strong> ' + new Date(file.grantedAt).toLocaleString() + '</p>';
                html += '<p><strong>Expires:</strong> ' + new Date(file.expiresAt).toLocaleString() + '</p>';
                html += '<div class="token">Token: ' + file.fileToken + '</div>';
                html += '<button onclick="accessFile(\'' + file.fileToken + '\', \'' + file.fileName + '\')">Access File</button>';
                html += '</div>';
            });
            
            html += '</div>';
            document.getElementById('filesList').innerHTML = html;
        }

        async function accessFile(token, fileName) {
            try {
                const response = await fetch('/doctor/access', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        doctorId: currentDoctor.id, 
                        token: token,
                        fileName: fileName 
                    })
                });

                const result = await response.json();
                
                document.getElementById('fileAccess').style.display = 'block';
                
                if (response.ok) {
                    document.getElementById('accessResult').innerHTML = 
                        '<div class="success">' +
                        '<h3>✓ File Access Granted</h3>' +
                        '<p><strong>File:</strong> ' + fileName + '</p>' +
                        '<p><strong>Doctor:</strong> ' + currentDoctor.name + '</p>' +
                        '<p><strong>Access Time:</strong> ' + new Date().toLocaleString() + '</p>' +
                        '<p><strong>Blockchain Validation:</strong> ✓ Token Valid</p>' +
                        '<p><strong>Audit Log:</strong> ✓ Access Recorded</p>' +
                        '<p><em>In production, file content would be retrieved from CouchDB</em></p>' +
                        '</div>';
                } else {
                    document.getElementById('accessResult').innerHTML = 
                        '<div class="error">' +
                        '<h3>✗ Access Denied</h3>' +
                        '<p>' + result.error + '</p>' +
                        '</div>';
                }
            } catch (error) {
                document.getElementById('accessResult').innerHTML = 
                    '<div class="error">Access error: ' + error.message + '</div>';
            }
        }
    </script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

func doctorLogin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var request struct {
		DoctorID string `json:"doctorId"`
	}

	json.NewDecoder(r.Body).Decode(&request)

	// Validate doctor (simulate blockchain certificate validation)
	doctor, exists := doctors[request.DoctorID]
	if !exists || !doctor.IsVerified {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid doctor certificate or not verified"})
		return
	}

	// Simulate successful blockchain authentication
	response := map[string]interface{}{
		"success": true,
		"message": "Doctor authenticated via blockchain certificate",
		"doctor":  doctor,
	}

	json.NewEncoder(w).Encode(response)
}

func getDoctorFiles(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	doctorID := r.URL.Query().Get("doctorId")

	// Get authorized files for this doctor (simulate blockchain query)
	permissions, exists := doctorPermissions[doctorID]
	if !exists {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "No authorized files found"})
		return
	}

	// Filter active permissions
	var activeFiles []DoctorPermission
	for _, perm := range permissions {
		if perm.IsActive && time.Now().Before(perm.ExpiresAt) {
			activeFiles = append(activeFiles, perm)
		}
	}

	response := map[string]interface{}{
		"success": true,
		"files":   activeFiles,
		"count":   len(activeFiles),
	}

	json.NewEncoder(w).Encode(response)
}

func accessFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var request struct {
		DoctorID string `json:"doctorId"`
		Token    string `json:"token"`
		FileName string `json:"fileName"`
	}

	json.NewDecoder(r.Body).Decode(&request)

	// Validate doctor has permission for this token
	permissions, exists := doctorPermissions[request.DoctorID]
	if !exists {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Doctor not authorized"})
		return
	}

	// Check if doctor has permission for this specific token
	hasPermission := false
	for _, perm := range permissions {
		if perm.FileToken == request.Token && perm.IsActive && time.Now().Before(perm.ExpiresAt) {
			hasPermission = true
			break
		}
	}

	if !hasPermission {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Access denied: No valid permission for this file"})
		return
	}

	// Simulate successful file access
	response := map[string]interface{}{
		"success":    true,
		"message":    "File access granted and logged on blockchain",
		"fileName":   request.FileName,
		"accessTime": time.Now(),
		"auditLog":   "Access recorded on Hyperledger Fabric",
	}

	json.NewEncoder(w).Encode(response)
}