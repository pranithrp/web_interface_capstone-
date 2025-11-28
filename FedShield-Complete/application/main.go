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
	"os"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
	"github.com/hyperledger/fabric-sdk-go/pkg/core/config"
	"github.com/hyperledger/fabric-sdk-go/pkg/gateway"
)

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

type FedShieldApp struct {
	contract *gateway.Contract
}

func (app *FedShieldApp) uploadFile(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Unable to get file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Unable to read file", http.StatusInternalServerError)
		return
	}

	// Generate unique token
	token := generateToken(content)

	// Store file in CouchDB
	err = app.storeFileInCouchDB(token, content, header.Filename, header.Header.Get("Content-Type"))
	if err != nil {
		http.Error(w, "Failed to store file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Register token on blockchain
	err = app.registerTokenOnBlockchain(token, header.Filename, len(content), header.Header.Get("Content-Type"), "user1")
	if err != nil {
		http.Error(w, "Failed to register token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := FileUploadResponse{
		Token:    token,
		Message:  "File uploaded successfully",
		FileName: header.Filename,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (app *FedShieldApp) retrieveFile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	token := vars["token"]

	// Validate token on blockchain
	valid, err := app.validateTokenOnBlockchain(token)
	if err != nil {
		http.Error(w, "Token validation failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if !valid {
		http.Error(w, "Invalid or inactive token", http.StatusUnauthorized)
		return
	}

	// Retrieve file from CouchDB
	fileData, err := app.retrieveFileFromCouchDB(token)
	if err != nil {
		http.Error(w, "File retrieval failed: "+err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fileData)
}

func (app *FedShieldApp) getTokenInfo(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	token := vars["token"]

	// Get token info from blockchain
	result, err := app.contract.EvaluateTransaction("GetToken", token)
	if err != nil {
		http.Error(w, "Token not found: "+err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func generateToken(content []byte) string {
	hash := sha256.Sum256(content)
	return hex.EncodeToString(hash[:])
}

func (app *FedShieldApp) storeFileInCouchDB(token string, content []byte, fileName, contentType string) error {
	client := &http.Client{}

	doc := map[string]interface{}{
		"_id":         token,
		"content":     string(content),
		"fileName":    fileName,
		"contentType": contentType,
		"timestamp":   time.Now(),
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
		return fmt.Errorf("CouchDB error: %s", resp.Status)
	}

	return nil
}

func (app *FedShieldApp) retrieveFileFromCouchDB(token string) (*FileRetrieveResponse, error) {
	client := &http.Client{}

	req, _ := http.NewRequest("GET", "http://localhost:5984/fedshield-files/"+token, nil)
	req.SetBasicAuth("admin", "adminpw")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("file not found")
	}

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	return &FileRetrieveResponse{
		Content:     result["content"].(string),
		FileName:    result["fileName"].(string),
		ContentType: result["contentType"].(string),
	}, nil
}

func (app *FedShieldApp) registerTokenOnBlockchain(token, fileName string, fileSize int, contentType, owner string) error {
	_, err := app.contract.SubmitTransaction("RegisterToken", token, fileName, fmt.Sprintf("%d", fileSize), contentType, owner)
	return err
}

func (app *FedShieldApp) validateTokenOnBlockchain(token string) (bool, error) {
	result, err := app.contract.EvaluateTransaction("ValidateToken", token)
	if err != nil {
		return false, err
	}

	return string(result) == "true", nil
}

func (app *FedShieldApp) createCouchDBDatabase() error {
	client := &http.Client{}
	req, _ := http.NewRequest("PUT", "http://localhost:5984/fedshield-files", nil)
	req.SetBasicAuth("admin", "adminpw")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

func main() {
	// Initialize Fabric connection
	err := os.Setenv("DISCOVERY_AS_LOCALHOST", "true")
	if err != nil {
		log.Fatalf("Error setting environment variable: %v", err)
	}

	wallet, err := gateway.NewFileSystemWallet("wallet")
	if err != nil {
		log.Fatalf("Failed to create wallet: %v", err)
	}

	if !wallet.Exists("appUser") {
		err = populateWallet(wallet)
		if err != nil {
			log.Fatalf("Failed to populate wallet contents: %v", err)
		}
	}

	ccpPath := filepath.Join("connection-org1.yaml")
	gw, err := gateway.Connect(
		gateway.WithConfig(config.FromFile(filepath.Clean(ccpPath))),
		gateway.WithIdentity(wallet, "appUser"),
	)
	if err != nil {
		log.Fatalf("Failed to connect to gateway: %v", err)
	}
	defer gw.Close()

	network, err := gw.GetNetwork("fedshieldchannel")
	if err != nil {
		log.Fatalf("Failed to get network: %v", err)
	}

	contract := network.GetContract("filetoken")

	app := &FedShieldApp{contract: contract}

	// Create CouchDB database
	app.createCouchDBDatabase()

	// Setup routes
	r := mux.NewRouter()
	r.HandleFunc("/upload", app.uploadFile).Methods("POST")
	r.HandleFunc("/file/{token}", app.retrieveFile).Methods("GET")
	r.HandleFunc("/token/{token}", app.getTokenInfo).Methods("GET")

	// Serve static files
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./static/")))

	fmt.Println("FedShield server starting on :8080")
	fmt.Println("Upload files: POST /upload")
	fmt.Println("Retrieve files: GET /file/{token}")
	fmt.Println("Token info: GET /token/{token}")

	log.Fatal(http.ListenAndServe(":8080", r))
}

func populateWallet(wallet *gateway.Wallet) error {
	credPath := filepath.Join("..", "network", "crypto-config", "peerOrganizations", "org1.fedshield.com", "users", "User1@org1.fedshield.com", "msp")

	certPath := filepath.Join(credPath, "signcerts", "User1@org1.fedshield.com-cert.pem")
	cert, err := os.ReadFile(filepath.Clean(certPath))
	if err != nil {
		return err
	}

	keyDir := filepath.Join(credPath, "keystore")
	files, err := os.ReadDir(keyDir)
	if err != nil {
		return err
	}
	keyPath := filepath.Join(keyDir, files[0].Name())
	key, err := os.ReadFile(filepath.Clean(keyPath))
	if err != nil {
		return err
	}

	identity := gateway.NewX509Identity("Org1MSP", string(cert), string(key))

	return wallet.Put("appUser", identity)
}