// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Device authentication + security events for RPM devices
/// @notice Emits events for unauthorized access attempts and data tampering (hash mismatch)
contract DeviceAuthExtended {
    // ================================
    // Events
    // ================================
    event DeviceRegistered(address indexed device, string deviceId);
    event UnauthorizedAccess(address indexed source, string reason);
    event DataTampered(address indexed device, bytes32 expectedHash, bytes32 receivedHash);
    event AccessGranted(address indexed device);

    // ================================
    // State variables
    // ================================
    address public owner;
    mapping(address => string) public registeredDevices;

    // ================================
    // Modifiers
    // ================================
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: only owner");
        _;
    }

    modifier onlyRegistered() {
        require(isRegistered(msg.sender), "Device not registered");
        _;
    }

    // ================================
    // Constructor
    // ================================
    constructor() {
        owner = msg.sender;
    }

    // ================================
    // Admin functions
    // ================================
    /// @notice Register a device (only owner)
    function registerDevice(address deviceAddr, string calldata deviceId) external onlyOwner {
        require(bytes(deviceId).length > 0, "Device ID empty");
        registeredDevices[deviceAddr] = deviceId;
        emit DeviceRegistered(deviceAddr, deviceId);
    }

    /// @notice Unregister a device (only owner)
    function unregisterDevice(address deviceAddr) external onlyOwner {
        require(isRegistered(deviceAddr), "Device not registered");
        delete registeredDevices[deviceAddr];
    }

    // ================================
    // Helper / view
    // ================================
    function isRegistered(address deviceAddr) public view returns (bool) {
        return bytes(registeredDevices[deviceAddr]).length > 0;
    }

    // ================================
    // Unauthorized access detection
    // ================================
    /// @notice Called by any address wanting access. If not registered -> emits UnauthorizedAccess.
    /// Registered addresses will trigger AccessGranted event.
    function attemptAccess() external {
        if (!isRegistered(msg.sender)) {
            // Log the unauthorized attempt (useful if an attacker calls this)
            emit UnauthorizedAccess(msg.sender, "Attempted access by unregistered address");
        } else {
            emit AccessGranted(msg.sender);
        }
    }

    // ================================
    // Data tampering / hash mismatch
    // ================================
    /// @notice Devices call this to report a received/expected hash pair.
    /// If the hashes do not match, DataTampered is emitted.
    /// `expectedHash` and `receivedHash` are supplied as hex strings or plain strings;
    /// we compare keccak256 of the byte representations.
    function reportDataHash(string calldata expectedHashStr, string calldata receivedHashStr) external onlyRegistered {
        bytes32 expected = keccak256(bytes(expectedHashStr));
        bytes32 received = keccak256(bytes(receivedHashStr));

        // If hashes differ => tampering suspected
        if (expected != received) {
            emit DataTampered(msg.sender, expected, received);
        } else {
            // No event needed when data matches; optional: you could emit a "DataVerified" event
        }
    }
}
