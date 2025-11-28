#!/bin/bash

set -e

echo "Deploying FedShield Chaincode..."

# Package the chaincode
echo "Packaging chaincode..."
docker exec cli peer lifecycle chaincode package filetoken.tar.gz --path /opt/gopath/src/github.com/chaincode --lang golang --label filetoken_1.0

# Install chaincode on peer
echo "Installing chaincode..."
docker exec cli peer lifecycle chaincode install filetoken.tar.gz

# Get package ID
echo "Getting package ID..."
PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep "filetoken_1.0" | cut -d' ' -f3 | cut -d',' -f1)
echo "Package ID: $PACKAGE_ID"

# Approve chaincode for organization
echo "Approving chaincode..."
docker exec cli peer lifecycle chaincode approveformyorg -o orderer.fedshield.com:7050 --channelID fedshieldchannel --name filetoken --version 1.0 --package-id $PACKAGE_ID --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/fedshield.com/orderers/orderer.fedshield.com/msp/tlscacerts/tlsca.fedshield.com-cert.pem

# Check commit readiness
echo "Checking commit readiness..."
docker exec cli peer lifecycle chaincode checkcommitreadiness --channelID fedshieldchannel --name filetoken --version 1.0 --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/fedshield.com/orderers/orderer.fedshield.com/msp/tlscacerts/tlsca.fedshield.com-cert.pem

# Commit chaincode
echo "Committing chaincode..."
docker exec cli peer lifecycle chaincode commit -o orderer.fedshield.com:7050 --channelID fedshieldchannel --name filetoken --version 1.0 --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/fedshield.com/orderers/orderer.fedshield.com/msp/tlscacerts/tlsca.fedshield.com-cert.pem

# Test chaincode
echo "Testing chaincode..."
docker exec cli peer chaincode invoke -o orderer.fedshield.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/fedshield.com/orderers/orderer.fedshield.com/msp/tlscacerts/tlsca.fedshield.com-cert.pem -C fedshieldchannel -n filetoken -c '{"function":"RegisterToken","Args":["test123","test.txt","100","text/plain","admin"]}'

echo "Chaincode deployed successfully!"