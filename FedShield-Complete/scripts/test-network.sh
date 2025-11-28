#!/bin/bash

echo "🧪 Testing FedShield Network"
echo "============================"

# Test CouchDB connection
echo "Testing CouchDB connection..."
curl -u admin:adminpw http://localhost:5984/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ CouchDB is running"
else
    echo "❌ CouchDB is not accessible"
    exit 1
fi

# Test Fabric peer
echo "Testing Hyperledger Fabric peer..."
docker exec cli peer version > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Fabric peer is running"
else
    echo "❌ Fabric peer is not accessible"
    exit 1
fi

# Test chaincode
echo "Testing chaincode deployment..."
docker exec cli peer chaincode query -C fedshieldchannel -n filetoken -c '{"Args":["GetAllTokens"]}' > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Chaincode is deployed and functional"
else
    echo "❌ Chaincode is not working properly"
    exit 1
fi

# Test token registration
echo "Testing token registration..."
docker exec cli peer chaincode invoke -o orderer.fedshield.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/fedshield.com/orderers/orderer.fedshield.com/msp/tlscacerts/tlsca.fedshield.com-cert.pem -C fedshieldchannel -n filetoken -c '{"function":"RegisterToken","Args":["test-token-123","test-file.txt","100","text/plain","test-user"]}' > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Token registration successful"
else
    echo "❌ Token registration failed"
    exit 1
fi

# Test token retrieval
echo "Testing token retrieval..."
RESULT=$(docker exec cli peer chaincode query -C fedshieldchannel -n filetoken -c '{"Args":["GetToken","test-token-123"]}' 2>/dev/null)
if [[ $RESULT == *"test-file.txt"* ]]; then
    echo "✅ Token retrieval successful"
else
    echo "❌ Token retrieval failed"
    exit 1
fi

echo ""
echo "🎉 All tests passed! FedShield network is fully functional."
echo ""
echo "Network Status:"
echo "- CouchDB: ✅ Running on port 5984"
echo "- Hyperledger Fabric: ✅ Running"
echo "- Chaincode: ✅ Deployed and functional"
echo "- Token System: ✅ Working correctly"
echo ""
echo "Ready for application deployment!"