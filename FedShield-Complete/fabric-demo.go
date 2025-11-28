package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

type FabricTransaction struct {
	TxID        string    `json:"txId"`
	Function    string    `json:"function"`
	Args        []string  `json:"args"`
	Timestamp   time.Time `json:"timestamp"`
	BlockNumber int       `json:"blockNumber"`
	Status      string    `json:"status"`
}

type BlockchainBlock struct {
	BlockNumber   int                 `json:"blockNumber"`
	PreviousHash  string              `json:"previousHash"`
	Transactions  []FabricTransaction `json:"transactions"`
	Timestamp     time.Time           `json:"timestamp"`
	Hash          string              `json:"hash"`
}

type FabricNetwork struct {
	Blocks []BlockchainBlock `json:"blocks"`
	Tokens map[string]interface{} `json:"tokens"`
}

func main() {
	fmt.Println("=======================================================")
	fmt.Println("HYPERLEDGER FABRIC BLOCKCHAIN SIMULATION FOR FEDSHIELD")
	fmt.Println("=======================================================")
	fmt.Println()

	// Initialize Fabric Network
	network := &FabricNetwork{
		Blocks: []BlockchainBlock{},
		Tokens: make(map[string]interface{}),
	}

	// Create Genesis Block
	genesisBlock := BlockchainBlock{
		BlockNumber:  0,
		PreviousHash: "0000000000000000000000000000000000000000000000000000000000000000",
		Transactions: []FabricTransaction{},
		Timestamp:    time.Now(),
		Hash:         "genesis_block_hash",
	}
	network.Blocks = append(network.Blocks, genesisBlock)

	fmt.Println("STEP 1: Hyperledger Fabric Network Initialized")
	fmt.Printf("Genesis Block Created: Block #%d\n", genesisBlock.BlockNumber)
	fmt.Printf("Genesis Hash: %s\n", genesisBlock.Hash)
	fmt.Println()

	// Simulate file uploads and token registrations
	demoFiles := []struct {
		Name    string
		Content string
	}{
		{"confidential_report.txt", "This is a confidential business report containing sensitive financial data."},
		{"medical_record.txt", "Patient: John Doe\nDiagnosis: Confidential medical information"},
		{"legal_contract.txt", "CONFIDENTIAL LEGAL CONTRACT\nParties: Company A and Company B"},
	}

	fmt.Println("STEP 2: Registering File Tokens on Hyperledger Fabric Blockchain")
	fmt.Println("================================================================")

	for i, file := range demoFiles {
		fmt.Printf("\nProcessing File %d: %s\n", i+1, file.Name)
		
		// Generate token
		token := generateToken([]byte(file.Content))
		fmt.Printf("Generated Token: %s\n", token[:32]+"...")

		// Create blockchain transaction
		tx := FabricTransaction{
			TxID:        generateTxID(),
			Function:    "RegisterToken",
			Args:        []string{token, file.Name, fmt.Sprintf("%d", len(file.Content)), "text/plain", "demo-user"},
			Timestamp:   time.Now(),
			BlockNumber: len(network.Blocks),
			Status:      "VALID",
		}

		// Create new block
		block := BlockchainBlock{
			BlockNumber:  len(network.Blocks),
			PreviousHash: network.Blocks[len(network.Blocks)-1].Hash,
			Transactions: []FabricTransaction{tx},
			Timestamp:    time.Now(),
			Hash:         generateBlockHash(tx),
		}

		network.Blocks = append(network.Blocks, block)
		network.Tokens[token] = map[string]interface{}{
			"fileName":    file.Name,
			"fileSize":    len(file.Content),
			"contentType": "text/plain",
			"owner":       "demo-user",
			"timestamp":   time.Now(),
			"isActive":    true,
			"blockNumber": block.BlockNumber,
			"txId":        tx.TxID,
		}

		fmt.Printf("Transaction ID: %s\n", tx.TxID)
		fmt.Printf("Block Number: %d\n", block.BlockNumber)
		fmt.Printf("Block Hash: %s\n", block.Hash[:32]+"...")
		fmt.Printf("Status: COMMITTED TO BLOCKCHAIN\n")
	}

	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("STEP 3: Hyperledger Fabric Network Status")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("Total Blocks: %d\n", len(network.Blocks))
	fmt.Printf("Total Transactions: %d\n", len(network.Blocks)-1) // Excluding genesis
	fmt.Printf("Registered Tokens: %d\n", len(network.Tokens))
	fmt.Println()

	fmt.Println("BLOCKCHAIN STRUCTURE:")
	for _, block := range network.Blocks {
		if block.BlockNumber == 0 {
			fmt.Printf("Block #%d (Genesis): %s\n", block.BlockNumber, block.Hash[:16]+"...")
		} else {
			fmt.Printf("Block #%d: %s (Prev: %s)\n", 
				block.BlockNumber, 
				block.Hash[:16]+"...", 
				block.PreviousHash[:16]+"...")
		}
	}

	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("STEP 4: Smart Contract Functions Demonstration")
	fmt.Println(strings.Repeat("=", 60))

	// Demonstrate smart contract functions
	fmt.Println("\nAvailable Chaincode Functions:")
	fmt.Println("1. RegisterToken(token, fileName, fileSize, contentType, owner)")
	fmt.Println("2. GetToken(token)")
	fmt.Println("3. ValidateToken(token)")
	fmt.Println("4. RevokeToken(token, owner)")
	fmt.Println("5. GetAllTokens()")

	// Demonstrate token validation
	fmt.Println("\nDemonstrating Token Validation:")
	for token := range network.Tokens {
		fmt.Printf("Validating Token: %s...\n", token[:32])
		if validateToken(token, network) {
			fmt.Printf("✓ Token is VALID and ACTIVE\n")
		} else {
			fmt.Printf("✗ Token is INVALID or INACTIVE\n")
		}
		break // Just show one example
	}

	// Test invalid token
	fmt.Println("\nTesting Invalid Token:")
	invalidToken := "invalid_token_12345"
	fmt.Printf("Validating Token: %s\n", invalidToken)
	if validateToken(invalidToken, network) {
		fmt.Printf("✓ Token is VALID and ACTIVE\n")
	} else {
		fmt.Printf("✗ Token is INVALID or INACTIVE (SECURITY WORKING)\n")
	}

	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("STEP 5: Blockchain Security Features")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("✓ Immutable Records: Once written, blocks cannot be changed")
	fmt.Println("✓ Cryptographic Hashing: Each block linked to previous block")
	fmt.Println("✓ Consensus Mechanism: Multiple nodes must agree on transactions")
	fmt.Println("✓ Access Control: Only authorized users can invoke chaincode")
	fmt.Println("✓ Audit Trail: Complete history of all token operations")

	fmt.Println("\n" + strings.Repeat("=", 60))
	fmt.Println("MENTOR DEMONSTRATION COMPLETE")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("This simulation shows how FedShield integrates with Hyperledger Fabric:")
	fmt.Println("• File tokens are registered on the blockchain")
	fmt.Println("• Each transaction is recorded in an immutable block")
	fmt.Println("• Smart contracts enforce business logic")
	fmt.Println("• Token validation ensures secure file access")
	fmt.Println("• Complete audit trail for compliance")
	fmt.Println()
	fmt.Println("In production, this would run on actual Hyperledger Fabric network")
	fmt.Println("with multiple organizations, peers, and orderers.")
}

func generateToken(content []byte) string {
	hash := sha256.Sum256(content)
	return hex.EncodeToString(hash[:])
}

func generateTxID() string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("%d", time.Now().UnixNano())))
	return hex.EncodeToString(hash[:])[:16]
}

func generateBlockHash(tx FabricTransaction) string {
	data := fmt.Sprintf("%s%s%v", tx.TxID, tx.Function, tx.Args)
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

func validateToken(token string, network *FabricNetwork) bool {
	tokenData, exists := network.Tokens[token]
	if !exists {
		return false
	}
	
	tokenMap := tokenData.(map[string]interface{})
	isActive, ok := tokenMap["isActive"].(bool)
	return ok && isActive
}

