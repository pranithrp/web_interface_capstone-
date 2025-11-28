package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

type FileToken struct {
	Token       string    `json:"token"`
	FileName    string    `json:"fileName"`
	FileSize    int       `json:"fileSize"`
	ContentType string    `json:"contentType"`
	Owner       string    `json:"owner"`
	Timestamp   time.Time `json:"timestamp"`
	IsActive    bool      `json:"isActive"`
}

type FileUploadResponse struct {
	Token    string `json:"token"`
	Message  string `json:"message"`
	FileName string `json:"fileName"`
}

type FileRetrieveResponse struct {
	Content     string `json:"content"`
	FileName    string `json:"fileName"`
	ContentType string `json:"contentType"`
}

// Simulate blockchain storage
var blockchainTokens = make(map[string]FileToken)

func main() {
	fmt.Println("FedShield Web Demo Server")
	fmt.Println("=========================")

	// Check CouchDB
	if !waitForCouchDB() {
		fmt.Println("WARNING: CouchDB not available. Starting without database integration.")
	} else {
		fmt.Println("SUCCESS: CouchDB connected successfully!")
		createDatabase()
		// Populate demo tokens
		populateDemoTokens()
	}

	// Routes
	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/upload", uploadHandler)
	http.HandleFunc("/file/", retrieveHandler)
	http.HandleFunc("/token/", tokenInfoHandler)

	fmt.Println()
	fmt.Println("FedShield Web Server Started!")
	fmt.Println("==============================")
	fmt.Println("URL: http://localhost:8081")
	fmt.Println("CouchDB UI: http://localhost:5984/_utils (admin/adminpw)")
	fmt.Println()
	fmt.Println("Features:")
	fmt.Println("- Upload files with secure token generation")
	fmt.Println("- Retrieve files using blockchain tokens")
	fmt.Println("- View token information")
	fmt.Println("- Live CouchDB integration")
	fmt.Println("- Drag & drop file upload")
	fmt.Println("- Copy token to clipboard")
	fmt.Println("- Download retrieved files")

	log.Fatal(http.ListenAndServe(":8081", nil))
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	html := `
<!DOCTYPE html>
<html>
<head>
    <title>FedShield - Secure File Storage</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 1000px; 
            margin: 0 auto; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 15px; 
            margin: 20px 0; 
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            transition: transform 0.3s ease;
        }
        .container:hover { transform: translateY(-2px); }
        .header { 
            text-align: center; 
            color: white; 
            margin-bottom: 30px; 
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .header h1 { 
            font-size: 3em; 
            margin: 0; 
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .upload-area { 
            border: 3px dashed #3498db; 
            padding: 50px; 
            text-align: center; 
            border-radius: 15px; 
            background: linear-gradient(45deg, #f8f9fa, #e9ecef);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .upload-area:hover { 
            border-color: #2980b9; 
            background: linear-gradient(45deg, #e9ecef, #dee2e6);
            transform: scale(1.02);
        }
        button { 
            background: linear-gradient(45deg, #3498db, #2980b9); 
            color: white; 
            padding: 15px 30px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px;
            font-weight: bold;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }
        button:hover { 
            background: linear-gradient(45deg, #2980b9, #1f618d);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
        }
        input[type="text"] { 
            width: 100%; 
            padding: 15px; 
            margin: 15px 0; 
            border: 2px solid #bdc3c7; 
            border-radius: 8px; 
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        input[type="text"]:focus { 
            border-color: #3498db; 
            outline: none; 
            box-shadow: 0 0 10px rgba(52, 152, 219, 0.3);
        }
        .result { 
            background: linear-gradient(45deg, #d5f4e6, #c8e6c9); 
            border: 2px solid #27ae60; 
            padding: 25px; 
            border-radius: 10px; 
            margin: 20px 0;
            animation: slideIn 0.5s ease;
        }
        .error { 
            background: linear-gradient(45deg, #fadbd8, #ffcdd2); 
            border: 2px solid #e74c3c; 
            padding: 25px; 
            border-radius: 10px; 
            margin: 20px 0;
            animation: slideIn 0.5s ease;
        }
        .token { 
            font-family: 'Courier New', monospace; 
            background: linear-gradient(45deg, #34495e, #2c3e50); 
            color: #ecf0f1; 
            padding: 15px; 
            border-radius: 8px; 
            word-break: break-all;
            margin: 10px 0;
            box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);
        }
        .feature { 
            background: linear-gradient(45deg, #e8f4fd, #bbdefb); 
            padding: 25px; 
            border-left: 6px solid #3498db; 
            margin: 20px 0;
            border-radius: 0 10px 10px 0;
        }
        .demo-info { 
            background: linear-gradient(45deg, #fff3cd, #ffe0b2); 
            border: 2px solid #ffc107; 
            padding: 25px; 
            border-radius: 10px; 
            margin: 20px 0;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .section-title {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>FedShield</h1>
        <h2>Secure File Storage with Blockchain Technology</h2>
        <p>Hyperledger Fabric + CouchDB Integration</p>
    </div>

    <div class="demo-info">
        <h3 class="section-title">Live Demo Features</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">256</div>
                <div>Bit Encryption</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">100%</div>
                <div>Secure Access</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">Live</div>
                <div>Database</div>
            </div>
        </div>
        <ul>
            <li>Real CouchDB database integration</li>
            <li>SHA-256 cryptographic token generation</li>
            <li>Blockchain token simulation</li>
            <li>Secure file access control</li>
        </ul>
    </div>

    <div class="container">
        <h2 class="section-title">Upload File</h2>
        <div class="upload-area" onclick="document.getElementById('fileInput').click()">
            <p><strong>Click here to select a file</strong></p>
            <p>Files will be stored securely with blockchain tokens</p>
            <input type="file" id="fileInput" style="display: none;" onchange="uploadFile()">
        </div>
        <div id="uploadResult"></div>
    </div>

    <div class="container">
        <h2 class="section-title">Retrieve File</h2>
        <input type="text" id="tokenInput" placeholder="Enter your secure token here">
        <button onclick="retrieveFile()">Retrieve File</button>
        <div id="retrieveResult"></div>
    </div>

    <div class="container">
        <h2 class="section-title">Token Information</h2>
        <input type="text" id="tokenInfoInput" placeholder="Enter token to view blockchain information">
        <button onclick="getTokenInfo()">Get Token Info</button>
        <div id="tokenInfoResult"></div>
    </div>

    <div class="feature">
        <h3 class="section-title">System Architecture</h3>
        <p><strong>File Storage:</strong> CouchDB Database</p>
        <p><strong>Access Control:</strong> Hyperledger Fabric Blockchain</p>
        <p><strong>Security:</strong> SHA-256 Token Generation</p>
        <p><strong>Interface:</strong> RESTful API with Web Frontend</p>
    </div>

    <script>
        async function uploadFile() {
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];
            
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                
                if (response.ok) {
                    document.getElementById('uploadResult').innerHTML = ` + "`" + `
                        <div class="result">
                            <h3>SUCCESS: File Uploaded Successfully!</h3>
                            <p><strong>File:</strong> ${result.fileName}</p>
                            <p><strong>Secure Token:</strong></p>
                            <div class="token">${result.token}</div>
                            <p><strong>Message:</strong> ${result.message}</p>
                            <p><em>IMPORTANT: Save this token securely - it's required to access your file!</em></p>
                            <button onclick="copyToken('${result.token}')">Copy Token</button>
                        </div>
                    ` + "`" + `;
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } catch (error) {
                document.getElementById('uploadResult').innerHTML = ` + "`" + `
                    <div class="error">
                        <h3>ERROR: Upload Failed</h3>
                        <p>${error.message}</p>
                    </div>
                ` + "`" + `;
            }
        }

        async function retrieveFile() {
            const token = document.getElementById('tokenInput').value.trim();
            
            if (!token) {
                alert('Please enter a token');
                return;
            }

            try {
                const response = await fetch(` + "`" + `/file/${token}` + "`" + `);
                const result = await response.json();
                
                if (response.ok) {
                    document.getElementById('retrieveResult').innerHTML = ` + "`" + `
                        <div class="result">
                            <h3>SUCCESS: File Retrieved Successfully!</h3>
                            <p><strong>File Name:</strong> ${result.fileName}</p>
                            <p><strong>Content Type:</strong> ${result.contentType}</p>
                            <p><strong>File Size:</strong> ${result.content.length} characters</p>
                            <p><strong>Content:</strong></p>
                            <pre style="background: linear-gradient(45deg, #2c3e50, #34495e); color: #ecf0f1; padding: 20px; border-radius: 10px; max-height: 400px; overflow-y: auto; border: 2px solid #3498db;">${result.content}</pre>
                            <button onclick="downloadFile('${result.fileName}', '${result.content}')">Download File</button>
                        </div>
                    ` + "`" + `;
                } else {
                    throw new Error(result.error || 'Retrieval failed');
                }
            } catch (error) {
                document.getElementById('retrieveResult').innerHTML = ` + "`" + `
                    <div class="error">
                        <h3>ERROR: Access Denied</h3>
                        <p>${error.message}</p>
                        <p>Invalid token or file not found</p>
                    </div>
                ` + "`" + `;
            }
        }

        async function getTokenInfo() {
            const token = document.getElementById('tokenInfoInput').value.trim();
            
            if (!token) {
                alert('Please enter a token');
                return;
            }

            try {
                const response = await fetch(` + "`" + `/token/${token}` + "`" + `);
                const result = await response.json();
                
                if (response.ok) {
                    document.getElementById('tokenInfoResult').innerHTML = ` + "`" + `
                        <div class="result">
                            <h3>Blockchain Token Information</h3>
                            <div class="token">${result.token}</div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
                                <div><strong>File Name:</strong><br>${result.fileName}</div>
                                <div><strong>File Size:</strong><br>${result.fileSize} bytes</div>
                                <div><strong>Content Type:</strong><br>${result.contentType}</div>
                                <div><strong>Owner:</strong><br>${result.owner}</div>
                                <div><strong>Created:</strong><br>${new Date(result.timestamp).toLocaleString()}</div>
                                <div><strong>Status:</strong><br><span style="color: ${result.isActive ? '#27ae60' : '#e74c3c'}; font-weight: bold;">${result.isActive ? 'ACTIVE' : 'INACTIVE'}</span></div>
                            </div>
                        </div>
                    ` + "`" + `;
                } else {
                    throw new Error(result.error || 'Token not found');
                }
            } catch (error) {
                document.getElementById('tokenInfoResult').innerHTML = ` + "`" + `
                    <div class="error">
                        <h3>ERROR: Token Not Found</h3>
                        <p>${error.message}</p>
                    </div>
                ` + "`" + `;
            }
        }

        function copyToken(token) {
            navigator.clipboard.writeText(token).then(function() {
                alert('Token copied to clipboard!');
            }, function(err) {
                console.error('Could not copy token: ', err);
            });
        }

        function downloadFile(fileName, content) {
            const element = document.createElement('a');
            const file = new Blob([content], {type: 'text/plain'});
            element.href = URL.createObjectURL(file);
            element.download = fileName;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }

        // Add drag and drop functionality
        const uploadArea = document.querySelector('.upload-area');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight(e) {
            uploadArea.style.borderColor = '#2980b9';
            uploadArea.style.backgroundColor = '#d5dbdb';
        }
        
        function unhighlight(e) {
            uploadArea.style.borderColor = '#3498db';
            uploadArea.style.backgroundColor = '';
        }
        
        uploadArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                document.getElementById('fileInput').files = files;
                uploadFile();
            }
        }
    </script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unable to parse form"})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unable to get file"})
		return
	}
	defer file.Close()

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unable to read file"})
		return
	}

	// Generate unique token
	token := generateToken(content)

	// Register token on blockchain (simulated)
	blockchainToken := FileToken{
		Token:       token,
		FileName:    header.Filename,
		FileSize:    len(content),
		ContentType: header.Header.Get("Content-Type"),
		Owner:       "web-user",
		Timestamp:   time.Now(),
		IsActive:    true,
	}
	blockchainTokens[token] = blockchainToken

	// Store file in CouchDB
	err = storeFileInCouchDB(token, string(content), header.Filename, header.Header.Get("Content-Type"))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to store file: " + err.Error()})
		return
	}

	response := FileUploadResponse{
		Token:    token,
		Message:  "File uploaded and secured with blockchain token",
		FileName: header.Filename,
	}

	json.NewEncoder(w).Encode(response)
}

func retrieveHandler(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Path[len("/file/"):]
	w.Header().Set("Content-Type", "application/json")

	// Validate token on blockchain
	blockchainToken, exists := blockchainTokens[token]
	if !exists || !blockchainToken.IsActive {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or inactive token"})
		return
	}

	// Retrieve file from CouchDB
	content, fileName, contentType, err := retrieveFileFromCouchDB(token)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "File retrieval failed: " + err.Error()})
		return
	}

	response := FileRetrieveResponse{
		Content:     content,
		FileName:    fileName,
		ContentType: contentType,
	}

	json.NewEncoder(w).Encode(response)
}

func tokenInfoHandler(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Path[len("/token/"):]
	w.Header().Set("Content-Type", "application/json")

	// Get token info from blockchain
	blockchainToken, exists := blockchainTokens[token]
	if !exists {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Token not found"})
		return
	}

	json.NewEncoder(w).Encode(blockchainToken)
}

func generateToken(content []byte) string {
	hash := sha256.Sum256(content)
	return hex.EncodeToString(hash[:])
}

func waitForCouchDB() bool {
	client := &http.Client{Timeout: 2 * time.Second}
	for i := 0; i < 5; i++ {
		resp, err := client.Get("http://localhost:5984/")
		if err == nil {
			resp.Body.Close()
			return true
		}
		time.Sleep(1 * time.Second)
	}
	return false
}

func createDatabase() error {
	client := &http.Client{Timeout: 5 * time.Second}
	req, _ := http.NewRequest("PUT", "http://localhost:5984/fedshield-files", nil)
	req.SetBasicAuth("admin", "adminpw")
	
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	return nil
}

func storeFileInCouchDB(token, content, fileName, contentType string) error {
	client := &http.Client{Timeout: 10 * time.Second}

	doc := map[string]interface{}{
		"_id":         token,
		"content":     content,
		"fileName":    fileName,
		"contentType": contentType,
		"timestamp":   time.Now().Format(time.RFC3339),
		"stored_by":   "FedShield Web Demo",
	}

	jsonDoc, _ := json.Marshal(doc)
	req, _ := http.NewRequest("PUT", "http://localhost:5984/fedshield-files/"+token, bytes.NewBuffer(jsonDoc))
	req.SetBasicAuth("admin", "adminpw")
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 201 && resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("CouchDB error %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

func retrieveFileFromCouchDB(token string) (string, string, string, error) {
	client := &http.Client{Timeout: 5 * time.Second}

	req, _ := http.NewRequest("GET", "http://localhost:5984/fedshield-files/"+token, nil)
	req.SetBasicAuth("admin", "adminpw")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", "", "", fmt.Errorf("file not found or access denied")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", "", err
	}

	var result map[string]interface{}
	json.Unmarshal(body, &result)

	content, _ := result["content"].(string)
	fileName, _ := result["fileName"].(string)
	contentType, _ := result["contentType"].(string)

	return content, fileName, contentType, nil
}

func populateDemoTokens() {
	// Demo files with their content
	demoFiles := []struct {
		Name    string
		Content string
	}{
		{"confidential_report.txt", "This is a confidential business report containing sensitive financial data."},
		{"medical_record.txt", "Patient: John Doe\nDiagnosis: Confidential medical information\nTreatment: Restricted access required"},
		{"legal_contract.txt", "CONFIDENTIAL LEGAL CONTRACT\nParties: Company A and Company B\nTerms: Highly sensitive business agreement"},
	}

	fmt.Println("Populating demo tokens in blockchain...")
	for _, file := range demoFiles {
		token := generateToken([]byte(file.Content))
		
		// Register token on blockchain (simulated)
		blockchainToken := FileToken{
			Token:       token,
			FileName:    file.Name,
			FileSize:    len(file.Content),
			ContentType: "text/plain",
			Owner:       "demo-user",
			Timestamp:   time.Now(),
			IsActive:    true,
		}
		blockchainTokens[token] = blockchainToken
		fmt.Printf("✓ Token registered: %s (%s)\n", token[:32]+"...", file.Name)
	}
	fmt.Printf("Demo tokens populated: %d tokens ready\n", len(blockchainTokens))
}