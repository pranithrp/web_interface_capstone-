#!/bin/bash

set -e

echo "Starting FedShield Network..."

# Clean up previous runs
docker-compose down -v
docker system prune -f

# Generate crypto material
echo "Generating crypto material..."
cryptogen generate --config=./crypto-config.yaml

# Create channel artifacts directory
mkdir -p channel-artifacts

# Generate genesis block
echo "Generating genesis block..."
configtxgen -profile FedShieldOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

# Generate channel configuration transaction
echo "Generating channel configuration..."
configtxgen -profile FedShieldChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID fedshieldchannel

# Generate anchor peer transaction
echo "Generating anchor peer update..."
configtxgen -profile FedShieldChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID fedshieldchannel -asOrg Org1MSP

# Start the network
echo "Starting Docker containers..."
docker-compose up -d

# Wait for containers to start
echo "Waiting for containers to start..."
sleep 10

# Create channel
echo "Creating channel..."
docker exec cli peer channel create -o orderer.fedshield.com:7050 -c fedshieldchannel -f ./channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/fedshield.com/orderers/orderer.fedshield.com/msp/tlscacerts/tlsca.fedshield.com-cert.pem

# Join peer to channel
echo "Joining peer to channel..."
docker exec cli peer channel join -b fedshieldchannel.block

# Update anchor peer
echo "Updating anchor peer..."
docker exec cli peer channel update -o orderer.fedshield.com:7050 -c fedshieldchannel -f ./channel-artifacts/Org1MSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/fedshield.com/orderers/orderer.fedshield.com/msp/tlscacerts/tlsca.fedshield.com-cert.pem

echo "Network started successfully!"
echo "CouchDB UI: http://localhost:5984/_utils (admin/adminpw)"
echo "File Storage CouchDB: http://localhost:5984/_utils (admin/adminpw)"