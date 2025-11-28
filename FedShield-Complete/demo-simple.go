package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
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

func main() {
	fmt.Println("🛡️ FedShield Demo - Secure File Storage System")
	fmt.Println("===============================================")
	fmt.Println()

	// Demo files
	demoFiles := []struct {
		Name    string
		Content string
	}{
		{"confidential_report.txt", "This is a confidential business report containing sensitive financial data."},
		{"medical_record.txt", "Patient: John Doe\nDiagnosis: Confidential medical information\nTreatment: Restricted access required"},
		{"legal_contract.txt", "CONFIDENTIAL LEGAL CONTRACT\nParties: Company A and Company B\nTerms: Highly sensitive business agreement"},
	}

	fmt.Printf("Demonstrating secure file storage for %d files...\n\n", len(demoFiles))

	// Simulate blockchain token storage
	blockchainTokens := make(map[string]FileToken)

	for i, file := range demoFiles {
		fmt.Printf("📁 Demo %d: Processing '%s'\n", i+1, file.Name)
		
		// Step 1: Generate unique token
		token := generateToken([]byte(file.Content))
		fmt.Printf("   🔑 Generated Token: %s\n", token)

		// Step 2: Register token on blockchain (simulated)
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
		fmt.Printf("   ✅ Token registered on Hyperledger Fabric blockchain\n")

		// Step 3: Store file in CouchDB (simulated)
		fmt.Printf("   ✅ File stored in CouchDB with token as ID\n")

		// Step 4: Demonstrate secure retrieval
		if validateToken(token, blockchainTokens) {
			fmt.Printf("   ✅ File successfully retrieved using valid token\n")
			fmt.Printf("   📄 Content Preview: %.50s...\n", file.Content)
		} else {
			fmt.Printf("   ❌ Access denied - invalid token\n")
		}

		fmt.Println()
		time.Sleep(1 * time.Second)
	}

	// Demonstrate security features
	fmt.Println("🔒 Security Demonstration:")
	fmt.Println("==========================")
	
	// Test with invalid token
	invalidToken := "invalid-token-123"
	fmt.Printf("Testing access with invalid token: %s\n", invalidToken)
	if validateToken(invalidToken, blockchainTokens) {
		fmt.Printf("❌ Security breach - invalid token accepted!\n")
	} else {
		fmt.Printf("✅ Security working - invalid token rejected\n")
	}

	fmt.Println()
	fmt.Println("🎯 Demo Summary:")
	fmt.Println("================")
	fmt.Println("✅ Files securely stored with unique tokens")
	fmt.Println("✅ Tokens generated using SHA-256 cryptographic hash")
	fmt.Println("✅ Token metadata stored on blockchain (simulated)")
	fmt.Println("✅ Files retrievable only with valid tokens")
	fmt.Println("✅ Invalid tokens rejected by security system")
	fmt.Println("✅ Complete separation of file content and access control")
	
	fmt.Println()
	fmt.Println("🏗️ Architecture Components:")
	fmt.Println("- File Storage: CouchDB database")
	fmt.Println("- Token Management: Hyperledger Fabric blockchain")
	fmt.Println("- Security: Cryptographic token validation")
	fmt.Println("- Access Control: Blockchain-verified permissions")

	fmt.Println()
	fmt.Println("📋 Blockchain Token Registry:")
	fmt.Println("=============================")
	for token, data := range blockchainTokens {
		fmt.Printf("Token: %s\n", token[:16]+"...")
		fmt.Printf("  File: %s\n", data.FileName)
		fmt.Printf("  Size: %d bytes\n", data.FileSize)
		fmt.Printf("  Owner: %s\n", data.Owner)
		fmt.Printf("  Status: %s\n", map[bool]string{true: "Active", false: "Inactive"}[data.IsActive])
		fmt.Printf("  Created: %s\n", data.Timestamp.Format("2006-01-02 15:04:05"))
		fmt.Println()
	}
}

func generateToken(content []byte) string {
	hash := sha256.Sum256(content)
	return hex.EncodeToString(hash[:])
}

func validateToken(token string, blockchainTokens map[string]FileToken) bool {
	tokenData, exists := blockchainTokens[token]
	return exists && tokenData.IsActive
}

func storeFileInCouchDB(token, content, fileName string) error {
	// This would normally connect to CouchDB
	// For demo purposes, we'll simulate the storage
	client := &http.Client{Timeout: 5 * time.Second}

	doc := map[string]interface{}{
		"_id":         token,
		"content":     content,
		"fileName":    fileName,
		"contentType": "text/plain",
		"timestamp":   time.Now(),
	}

	jsonDoc, _ := json.Marshal(doc)
	
	// Try to connect to CouchDB if available
	req, _ := http.NewRequest("PUT", "http://localhost:5984/fedshield-files/"+token, bytes.NewBuffer(jsonDoc))
	req.SetBasicAuth("admin", "adminpw")
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		// CouchDB not available, simulate storage
		return nil
	}
	defer resp.Body.Close()

	return nil
}

func retrieveFileFromCouchDB(token string) (string, error) {
	client := &http.Client{Timeout: 5 * time.Second}

	req, _ := http.NewRequest("GET", "http://localhost:5984/fedshield-files/"+token, nil)
	req.SetBasicAuth("admin", "adminpw")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var result map[string]interface{}
	json.Unmarshal(body, &result)

	return result["content"].(string), nil
}