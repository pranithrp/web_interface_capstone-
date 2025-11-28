import React, { useRef, useEffect, useState } from 'react';

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
  otherPartyName,
  peerConnection // Add peerConnection prop for connection quality monitoring
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  // Call control states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('good'); // good, fair, poor
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [networkStats, setNetworkStats] = useState({
    packetsLost: 0,
    bytesReceived: 0,
    bytesSent: 0,
    bitrate: 0
  });

    // Monitor connection quality using WebRTC stats
  useEffect(() => {
    if (!peerConnection || !callActive) return;

    const monitorConnection = async () => {
      try {
        const stats = await peerConnection.getStats();
        let packetsLost = 0;
        let bytesReceived = 0;
        let bytesSent = 0;
        let bitrate = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
            packetsLost += report.packetsLost || 0;
            bytesReceived += report.bytesReceived || 0;
            bitrate = report.bytesReceived ? (report.bytesReceived * 8) / 1000 : 0; // Convert to kbps
          }
          if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
            bytesSent += report.bytesSent || 0;
          }
        });

        setNetworkStats({ packetsLost, bytesReceived, bytesSent, bitrate });

        // Determine connection quality
        if (packetsLost > 50 || bitrate < 100) {
          setConnectionQuality('poor');
        } else if (packetsLost > 10 || bitrate < 300) {
          setConnectionQuality('fair');
        } else {
          setConnectionQuality('good');
        }

        // Auto-recovery for poor connections
        if (peerConnection.iceConnectionState === 'failed' && onRetry) {
          console.log('🔄 Auto-attempting connection recovery...');
          setTimeout(() => {
            if (peerConnection.iceConnectionState === 'failed') {
              onRetry();
            }
          }, 3000);
        }
      } catch (error) {
        console.log('Error getting connection stats:', error);
      }
    };

    // Monitor every 2 seconds
    const interval = setInterval(monitorConnection, 2000);
    return () => clearInterval(interval);
  }, [peerConnection, callActive, onRetry]);  // Start call timer when call becomes active
  useEffect(() => {
    if (callActive && !callStartTime) {
      setCallStartTime(Date.now());
    }
  }, [callActive, callStartTime]);

  // Update call duration timer
  useEffect(() => {
    let interval;
    if (callActive && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callActive, callStartTime]);

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

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Screen sharing
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const toggleScreenShare = async () => {
    if (!peerConnection) return;

    try {
      const videoSender = peerConnection.getSenders().find(
        sender => sender.track && sender.track.kind === 'video'
      );

      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: true
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track with screen share
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }

        // Update local video to show screen share
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);

        // Listen for screen share end
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          // Switch back to camera
          if (localStream && videoSender) {
            const cameraTrack = localStream.getVideoTracks()[0];
            if (cameraTrack) {
              videoSender.replaceTrack(cameraTrack);
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
              }
            }
          }
        };
      } else {
        // Stop screen sharing and switch back to camera
        if (localStream && videoSender) {
          const cameraTrack = localStream.getVideoTracks()[0];
          if (cameraTrack) {
            await videoSender.replaceTrack(cameraTrack);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStream;
            }
          }
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      setIsScreenSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 transition-all duration-300 ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl text-white transition-all duration-300 ${
        isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl mx-4 p-6'
      }`}>
        
        {/* Header with call info and controls */}
        {!isFullscreen && (
          <div className="flex items-center justify-between mb-6 bg-black bg-opacity-30 rounded-xl p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionQuality === 'good' ? 'bg-green-500' : 
                  connectionQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                } animate-pulse`}></div>
                <span className="text-sm text-gray-300 capitalize">{connectionQuality} connection</span>
                {callActive && networkStats.bitrate > 0 && (
                  <span className="text-xs text-gray-400">
                    ({Math.round(networkStats.bitrate)}kbps)
                  </span>
                )}
              </div>
              {callActive && (
                <div className="flex items-center space-x-4 text-sm text-gray-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span>{formatDuration(callDuration)}</span>
                  </div>
                  {networkStats.packetsLost > 0 && (
                    <div className="flex items-center space-x-1 text-orange-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span>{networkStats.packetsLost} lost</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold">📹 {otherPartyName}</h2>
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-black bg-opacity-40 hover:bg-opacity-60 rounded-lg transition-all duration-200"
                title="Toggle Fullscreen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {callError && (
          <div className="bg-gradient-to-r from-red-900 to-red-800 border border-red-500 rounded-xl p-6 mb-6 text-center shadow-lg">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-xl font-semibold">Connection Issue</h3>
            </div>
            <p className="text-lg mb-4">{callError}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              >
                🔄 Try Again
              </button>
            )}
          </div>
        )}

        {/* Waiting State */}
        {waitingForOther && (
          <div className="text-center py-16">
            <div className="relative mb-8">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse w-8 h-8 bg-purple-500 rounded-full"></div>
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-4">Connecting to {otherPartyName}...</h3>
            <p className="text-gray-300 text-lg">Please wait while we establish the connection</p>
            <div className="flex justify-center mt-8 space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        )}

        {/* Active Call Interface */}
        {callActive && (
          <div className={`${isFullscreen ? 'p-6 h-full flex flex-col' : ''}`}>
            <div className={`flex gap-6 justify-center items-center mb-6 ${isFullscreen ? 'flex-1' : ''}`}>
              {/* Local Video (You) */}
              <div className={`relative group ${isFullscreen ? 'w-1/2 h-full' : 'w-96 h-72'}`}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full bg-black rounded-xl shadow-2xl object-cover ${isVideoOff ? 'opacity-0' : ''}`}
                />
                {isVideoOff && (
                  <div className="absolute inset-0 bg-gray-800 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-400">Camera Off</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium">
                    You {isScreenSharing && "📺"}
                  </span>
                </div>
                <div className="absolute top-4 left-4 flex space-x-2">
                  {isMuted && (
                    <div className="bg-red-500 bg-opacity-80 p-2 rounded-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    </div>
                  )}
                  {isScreenSharing && (
                    <div className="bg-blue-500 bg-opacity-80 p-2 rounded-full animate-pulse">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Remote Video (Other Party) */}
              <div className={`relative group ${isFullscreen ? 'w-1/2 h-full' : 'w-96 h-72'}`}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full bg-black rounded-xl shadow-2xl object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium">{otherPartyName}</span>
                </div>
                {!remoteStream && (
                  <div className="absolute inset-0 bg-gray-800 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-pulse w-16 h-16 bg-gray-600 rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-400">Waiting for {otherPartyName}...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Control Panel */}
            <div className="flex justify-center items-center space-x-4 bg-black bg-opacity-40 rounded-2xl p-4 backdrop-blur-sm">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full font-semibold transition-all duration-200 hover:scale-110 shadow-lg ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMuted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  )}
                </svg>
              </button>

              {/* Video Toggle Button */}
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full font-semibold transition-all duration-200 hover:scale-110 shadow-lg ${
                  isVideoOff 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isVideoOff ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z M3 3l18 18" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  )}
                </svg>
              </button>

              {/* Screen Share Button */}
              <button
                onClick={toggleScreenShare}
                className={`p-4 rounded-full font-semibold transition-all duration-200 hover:scale-110 shadow-lg ${
                  isScreenSharing 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isScreenSharing ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  )}
                </svg>
              </button>

              {/* End Call Button */}
              <button
                onClick={onEndCall}
                className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold text-lg transition-all duration-200 hover:scale-110 shadow-lg flex items-center space-x-2"
                title="End Call"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l18 18" />
                </svg>
                <span>End Call</span>
              </button>

              {/* Fullscreen Toggle (only show when not in fullscreen) */}
              {!isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="p-4 bg-gray-700 hover:bg-gray-600 text-white rounded-full font-semibold transition-all duration-200 hover:scale-110 shadow-lg"
                  title="Fullscreen"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Exit Fullscreen button (only visible in fullscreen) */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="fixed top-4 right-4 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-lg transition-all duration-200 z-10"
            title="Exit Fullscreen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoCallPopup;
