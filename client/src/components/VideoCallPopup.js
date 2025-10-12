import React, { useRef, useEffect } from 'react';

const VideoCallPopup = ({
  isOpen,
  onClose,
  localStream,
  remoteStream,
  callActive,
  waitingForOther,
  callError,
  onEndCall,
  onRetry,
  otherPartyName
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("VideoCallPopup: Setting local video stream");
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("VideoCallPopup: Setting remote video stream");
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 w-full max-w-4xl mx-4 text-white">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">📹 Video Call with {otherPartyName}</h2>
        </div>

        {callError && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4 mb-4 text-center">
            <div className="mb-3">{callError}</div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {waitingForOther && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">Waiting for {otherPartyName} to join...</p>
          </div>
        )}

        {callActive && (
          <div className="flex gap-6 justify-center items-center mb-6">
            <div className="relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-80 h-60 bg-black rounded-lg shadow-lg"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 px-2 py-1 rounded text-sm">
                You
              </div>
            </div>
            <div className="relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-80 h-60 bg-black rounded-lg shadow-lg"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 px-2 py-1 rounded text-sm">
                {otherPartyName}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={onEndCall}
            className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold text-lg transition-all duration-200 hover:scale-105"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallPopup;
