"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface PipelineStatus {
  status: "not_loaded" | "loading" | "loaded" | "error";
  pipeline_id?: string;
  load_params?: Record<string, unknown>;
  error?: string;
}

export interface PipelineInfo {
  pipeline_id: string;
  pipeline_name: string;
  pipeline_description?: string;
  supported_modes: string[];
  default_mode?: string;
  plugin_name?: string;
  config_schema?: Record<string, unknown>;
}

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export interface IceServersResponse {
  iceServers: IceServer[];
}

export interface WebRTCOfferResponse {
  sdp: string;
  type: string;
  sessionId: string;
}

export interface CloudStatus {
  connected: boolean;
  connecting: boolean;
  webrtc_connected: boolean;
  app_id?: string;
  credentials_configured: boolean;
}

const SCOPE_API_URL = "/api/scope";

export function useScopeServer() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<Record<string, PipelineInfo>>({});
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(`${SCOPE_API_URL}/health`);
      if (response.ok) {
        setIsConnected(true);
        setError(null);
        return true;
      }
      setIsConnected(false);
      return false;
    } catch {
      setIsConnected(false);
      setError("Cannot connect to Scope server");
      return false;
    }
  }, []);

  const fetchPipelines = useCallback(async () => {
    try {
      const response = await fetch(`${SCOPE_API_URL}/pipelines`);
      const data = await response.json();
      setPipelines(data.pipelines || {});
      return data.pipelines;
    } catch (err) {
      console.error("Failed to fetch pipelines:", err);
      return null;
    }
  }, []);

  const getPipelineStatus = useCallback(async () => {
    try {
      const response = await fetch(`${SCOPE_API_URL}/pipeline/status`);
      const data = await response.json();
      setPipelineStatus(data);
      return data;
    } catch (err) {
      console.error("Failed to get pipeline status:", err);
      return null;
    }
  }, []);

  const loadPipeline = useCallback(async (pipelineIds: string[], loadParams?: Record<string, unknown>, waitForLoad: boolean = true) => {
    try {
      setPipelineStatus({ status: "loading" });
      const response = await fetch(`${SCOPE_API_URL}/pipeline/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipeline_ids: pipelineIds,
          load_params: loadParams || {},
        }),
      });
      
      if (!response.ok) {
        // Try to parse JSON error, fall back to text
        const contentType = response.headers.get("content-type");
        let errorMessage = "Failed to load pipeline";
        if (contentType?.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } catch {
            const errorText = await response.text();
            errorMessage = errorText.substring(0, 200);
          }
        } else {
          const errorText = await response.text();
          errorMessage = errorText.substring(0, 200);
        }
        throw new Error(errorMessage);
      }
      
      // If waitForLoad is true, poll until pipeline is loaded
      if (waitForLoad) {
        const maxTimeout = 1200000; // 20 minutes
        const pollInterval = 1000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxTimeout) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          const statusResponse = await fetch(`${SCOPE_API_URL}/pipeline/status`);
          const statusData = await statusResponse.json();
          setPipelineStatus(statusData);
          
          if (statusData.status === "loaded") {
            return statusData;
          } else if (statusData.status === "error") {
            throw new Error(statusData.error || "Pipeline load failed");
          }
        }
        throw new Error("Pipeline load timeout after 2 minutes");
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Failed to load pipeline:", err);
      setPipelineStatus({ status: "error", error: err instanceof Error ? err.message : "Unknown error" });
      throw err;
    }
  }, []);

  const getCloudStatus = useCallback(async () => {
    try {
      const response = await fetch(`${SCOPE_API_URL}/cloud/status`);
      const data = await response.json();
      setCloudStatus(data);
      return data;
    } catch (err) {
      console.error("Failed to get cloud status:", err);
      return null;
    }
  }, []);

  const connectToCloud = useCallback(async (appId?: string, apiKey?: string) => {
    try {
      setIsConnecting(true);
      const response = await fetch(`${SCOPE_API_URL}/cloud/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: appId,
          api_key: apiKey,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to connect to cloud");
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Failed to connect to cloud:", err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectFromCloud = useCallback(async () => {
    try {
      const response = await fetch(`${SCOPE_API_URL}/cloud/disconnect`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to disconnect from cloud");
      }
      
      return await response.json();
    } catch (err) {
      console.error("Failed to disconnect from cloud:", err);
      throw err;
    }
  }, []);

  const startWebRTC = useCallback(async (
    onRemoteStream: (stream: MediaStream) => void,
    initialParameters?: Record<string, unknown>,
    localStream?: MediaStream | null
  ) => {
    try {
      const iceResponse = await fetch(`${SCOPE_API_URL}/webrtc/ice-servers`);
      const iceData: IceServersResponse = await iceResponse.json();

      const config: RTCConfiguration = {
        iceServers: iceData.iceServers.map(server => ({
          urls: server.urls,
          ...(server.username && { username: server.username }),
          ...(server.credential && { credential: server.credential }),
        })),
      };

      const pc = new RTCPeerConnection(config);
      peerConnectionRef.current = pc;

      // Create data channel for parameter updates (like Scope)
      const dataChannel = pc.createDataChannel("parameters", {
        ordered: true,
      });
      
      let dataChannelReady = new Promise<void>((resolve) => {
        dataChannel.onopen = () => resolve();
      });

      // Add local video track if provided
      if (localStream) {
        localStream.getVideoTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
        localStream.getAudioTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) {
          remoteStreamRef.current = stream;
          onRemoteStream(stream);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && sessionIdRef.current) {
          fetch(`${SCOPE_API_URL}/webrtc/ice?session_id=${sessionIdRef.current}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event.candidate.toJSON()),
          }).catch(console.error);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const requestBody = {
        sdp: pc.localDescription?.sdp,
        type: pc.localDescription?.type,
        initialParameters: initialParameters,
      };
      console.log("[OpenScope] Full request body:", requestBody);

      const response = await fetch(`${SCOPE_API_URL}/webrtc/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
          initialParameters: initialParameters,
        }),
      });

      if (!response.ok) {
        // Try to parse JSON error, fall back to text
        const contentType = response.headers.get("content-type");
        let errorMessage = "Failed to create WebRTC offer";
        if (contentType?.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } catch {
            const errorText = await response.text();
            errorMessage = errorText.substring(0, 200);
          }
        } else {
          const errorText = await response.text();
          errorMessage = errorText.substring(0, 200);
        }
        throw new Error(errorMessage);
      }

      const answer: WebRTCOfferResponse = await response.json();
      sessionIdRef.current = answer.sessionId;

      await pc.setRemoteDescription({
        sdp: answer.sdp,
        type: answer.type as RTCSdpType,
      });

      // Wait for data channel to be ready, then send parameters
      await dataChannelReady;
      console.log("[OpenScope] Data channel open, sending parameters via data channel");
      dataChannel.send(JSON.stringify(initialParameters));

      return pc;
    } catch (err) {
      console.error("Failed to start WebRTC:", err);
      throw err;
    }
  }, []);

  const stopWebRTC = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    sessionIdRef.current = null;
    remoteStreamRef.current = null;
  }, []);

  useEffect(() => {
    checkConnection();
    
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    isConnected,
    isConnecting,
    error,
    pipelines,
    pipelineStatus,
    cloudStatus,
    checkConnection,
    fetchPipelines,
    getPipelineStatus,
    loadPipeline,
    getCloudStatus,
    connectToCloud,
    disconnectFromCloud,
    startWebRTC,
    stopWebRTC,
    remoteStream: remoteStreamRef.current,
  };
}
