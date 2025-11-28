package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

type FileToken struct {
	Token       string    `json:"token"`
	FileName    string    `json:"fileName"`
	FileSize    int       `json:"fileSize"`
	ContentType string    `json:"contentType"`
	Owner       string    `json:"owner"`
	Timestamp   time.Time `json:"timestamp"`
	IsActive    bool      `json:"isActive"`
}

// RegisterToken stores file token metadata on blockchain
func (s *SmartContract) RegisterToken(ctx contractapi.TransactionContextInterface, token string, fileName string, fileSize int, contentType string, owner string) error {
	// Check if token already exists
	existing, err := ctx.GetStub().GetState(token)
	if err != nil {
		return fmt.Errorf("failed to read from world state: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("token %s already exists", token)
	}

	// Create file token record
	fileToken := FileToken{
		Token:       token,
		FileName:    fileName,
		FileSize:    fileSize,
		ContentType: contentType,
		Owner:       owner,
		Timestamp:   time.Now(),
		IsActive:    true,
	}

	fileTokenJSON, err := json.Marshal(fileToken)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(token, fileTokenJSON)
}

// GetToken retrieves token metadata from blockchain
func (s *SmartContract) GetToken(ctx contractapi.TransactionContextInterface, token string) (*FileToken, error) {
	fileTokenJSON, err := ctx.GetStub().GetState(token)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if fileTokenJSON == nil {
		return nil, fmt.Errorf("token %s does not exist", token)
	}

	var fileToken FileToken
	err = json.Unmarshal(fileTokenJSON, &fileToken)
	if err != nil {
		return nil, err
	}

	return &fileToken, nil
}

// ValidateToken checks if token is valid and active
func (s *SmartContract) ValidateToken(ctx contractapi.TransactionContextInterface, token string) (bool, error) {
	fileToken, err := s.GetToken(ctx, token)
	if err != nil {
		return false, err
	}

	return fileToken.IsActive, nil
}

// RevokeToken deactivates a token
func (s *SmartContract) RevokeToken(ctx contractapi.TransactionContextInterface, token string, owner string) error {
	fileToken, err := s.GetToken(ctx, token)
	if err != nil {
		return err
	}

	if fileToken.Owner != owner {
		return fmt.Errorf("only owner can revoke token")
	}

	fileToken.IsActive = false
	fileTokenJSON, err := json.Marshal(fileToken)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(token, fileTokenJSON)
}

// GetAllTokens returns all tokens (for admin purposes)
func (s *SmartContract) GetAllTokens(ctx contractapi.TransactionContextInterface) ([]*FileToken, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var tokens []*FileToken
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var token FileToken
		err = json.Unmarshal(queryResponse.Value, &token)
		if err != nil {
			return nil, err
		}
		tokens = append(tokens, &token)
	}

	return tokens, nil
}

func main() {
	assetChaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating filetoken chaincode: %v", err)
		return
	}

	if err := assetChaincode.Start(); err != nil {
		fmt.Printf("Error starting filetoken chaincode: %v", err)
	}
}