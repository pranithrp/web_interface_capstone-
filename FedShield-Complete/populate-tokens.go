package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func main() {
	fmt.Println("Populating demo tokens...")

	// Demo files with their content
	demoFiles := []struct {
		Name    string
		Content string
	}{
		{"confidential_report.txt", "This is a confidential business report containing sensitive financial data."},
		{"medical_record.txt", "Patient: John Doe\nDiagnosis: Confidential medical information\nTreatment: Restricted access required"},
		{"legal_contract.txt", "CONFIDENTIAL LEGAL CONTRACT\nParties: Company A and Company B\nTerms: Highly sensitive business agreement"},
	}

	// Create database
	createDatabase()

	for i, file := range demoFiles {
		token := generateToken([]byte(file.Content))
		
		fmt.Printf("File %d: %s\n", i+1, file.Name)
		fmt.Printf("Token: %s\n", token)
		
		// Store in CouchDB
		err := storeFileInCouchDB(token, file.Content, file.Name)
		if err != nil {
			fmt.Printf("Error storing file: %v\n", err)
		} else {
			fmt.Printf("✓ Stored in CouchDB\n")
		}
		fmt.Println()
	}

	fmt.Println("Demo tokens populated successfully!")
	fmt.Println("You can now use these tokens in the web interface.")
}

func generateToken(content []byte) string {
	hash := sha256.Sum256(content)
	return hex.EncodeToString(hash[:])
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

func storeFileInCouchDB(token, content, fileName string) error {
	client := &http.Client{Timeout: 10 * time.Second}

	doc := map[string]interface{}{
		"_id":         token,
		"content":     content,
		"fileName":    fileName,
		"contentType": "text/plain",
		"timestamp":   time.Now().Format(time.RFC3339),
		"stored_by":   "Demo Population Script",
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

	return nil
}